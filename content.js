// OAuth Batch Auto-Consent - Content Script
// Berjalan di halaman Google (accounts.google.com / consent).
// Mode AUTO: pilih akun berikutnya, centang izin, klik Continue.
// Hanya aktif bila batch sedang running (di-trigger dari side panel).

// WAJIB: key ini harus SAMA dengan background.js (oauth_running),
// bukan literal lain. Kalau beda, content script tidak akan melihat
// status running dan auto-klik tidak pernah berjalan.
const RUNNING_KEY = 'oauth_running';

function getRunning() {
  return new Promise((res) => {
    chrome.storage.local.get([RUNNING_KEY], (r) => res(r[RUNNING_KEY] || { active: false }));
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function clickByText(regex, tag = 'button,div,span,a') {
  const els = document.querySelectorAll(tag);
  for (const el of els) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (regex.test(txt) && el.offsetParent !== null) {
      el.click();
      return true;
    }
  }
  return false;
}

// Klik tombol AKSI sungguhan (bukan teks paragraf). Hanya menyasar elemen yang
// memang tombol: <button>, [role=button], input submit/button. Teks harus cocok
// di AWAL (prefix) biar 'Lanjutkan' tidak salah kena kalimat deskripsi yang
// kebetulan memuat kata 'lanjut'. Tombol aksi Google ada di kanan-bawah dan bisa
// DI BAWAH fold → scrollIntoView dulu biar terlihat & bisa diklik.
function clickButton(regex) {
  const btns = document.querySelectorAll(
    'button, [role="button"], input[type="submit"], input[type="button"]'
  );
  const candidates = [];
  for (const el of btns) {
    // visible? offsetParent null utk position:fixed, jadi cek rects juga
    if (el.offsetParent === null && el.getClientRects().length === 0) continue;
    if (el.disabled) continue;
    const txt = (el.value || el.textContent || '').trim();
    if (txt.length > 40) continue; // tombol aksi teksnya pendek, bukan paragraf
    if (regex.test(txt.toLowerCase())) candidates.push(el);
  }
  if (!candidates.length) return false;
  // pilih yang paling bawah (footer) — tombol positif Google ada di bawah-kanan
  candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  const target = candidates[0];
  target.scrollIntoView({ block: 'center' });
  target.click();
  console.log('[oauth-auto] klik tombol →', (target.value || target.textContent || '').trim().slice(0, 40));
  return true;
}

// teks aksi positif consent, di-anchor di awal biar bukan paragraf
const POSITIVE_BTN = /^(lanjutkan|lanjut|selanjutnya|teruskan|continue|next|allow|izinkan|mengizinkan|berikan akses|accept|setuju|terima|buka|go to)/i;

// klik akun ke-N pada halaman chooser (urutan sesuai posisi di list)
// Strategi bertingkat: DOM Google "Choose an account" berubah-ubah antar rilis,
// jadi coba beberapa selektor sampai ketemu daftar akun yang bisa diklik.
function findAccountElements() {
  const strategies = [
    // 1) elemen yang jelas menandai satu akun
    'div[data-identifier], div[data-email], li[data-identifier], li[data-email]',
    // 2) list akun sebagai listitem/link dalam listbox atau list
    'ul[role="listbox"] li, [role="list"] [role="listitem"], [role="listbox"] [role="option"]',
    // 3) tiap akun sebagai tombol/link (varian layout MV baru)
    'div[role="link"], a[role="link"], li > div[jsaction], ul li[jsaction]',
  ];
  for (const sel of strategies) {
    const found = Array.from(document.querySelectorAll(sel))
      // hanya yang terlihat & bukan "Use another account" (tak punya email)
      .filter((el) => el.offsetParent !== null);
    if (found.length > 0) return found;
  }
  // 4) fallback terakhir: elemen apa pun yang teksnya memuat alamat email,
  // ambil kontainer klik terdekat.
  const byEmail = Array.from(document.querySelectorAll('div,li,a'))
    .filter((el) => el.offsetParent !== null && /@[\w.-]+\.\w+/.test((el.textContent || '')))
    // buang wadah besar: pilih yang paling "dalam" (teks pendek ~1 akun)
    .filter((el) => (el.textContent || '').trim().length < 120);
  return byEmail;
}

async function clickNthAccount(n) {
  const list = findAccountElements();
  if (list.length === 0) {
    console.warn('[oauth-auto] clickNthAccount: tidak ada elemen akun ditemukan');
    return false;
  }
  const idx = Math.min(Math.max(n - 1, 0), list.length - 1);
  const target = list[idx];
  if (!target) {
    console.warn('[oauth-auto] clickNthAccount: target indeks', idx, 'kosong dari', list.length);
    return false;
  }
  // klik target; jika target hanya wadah, klik juga anak yang clickable
  const clickable = target.closest('[jsaction],[role="link"],[role="option"],[role="listitem"],li') || target;
  clickable.click();
  console.log('[oauth-auto] klik akun ke-' + n, '/', list.length, '→', (target.textContent || '').trim().slice(0, 60));
  return true;
}

async function autoRun() {
  const running = await getRunning();
  if (!running.active) return; // hanya auto saat batch jalan

  const host = location.hostname;
  const path = location.pathname;

  // 1) Halaman "Choose an account" (accounts.google.com)
  if (host === 'accounts.google.com') {
    await delay(1500);
    const n = running.opened || 1; // gunakan urutan tab terbuka sebagai indeks akun
    const okN = await clickNthAccount(n);
    if (!okN) {
      // fallback: akun pertama tersedia
      clickByText(/masuk|sign in|akun/i);
    }
    await delay(1200);
    // kadang muncul password/re-auth → biarkan user
  }

  // 1b) Layar peringatan "Google belum memverifikasi aplikasi ini"
  //     Muncul sebelum consent. Perlu 2 langkah: (1) klik "Lanjutan/Advanced",
  //     lalu (2) klik "Buka <App> (tidak aman)" / "Continue to..." / "Go to...".
  if (/belum memverifikasi|hasn'?t verified|not verified/i.test(document.body.textContent || '')) {
    if (!running.active) return; // guard tetap
    await delay(800);
    const adv = clickByText(/lanjutan|advanced/i);
    console.log('[oauth-auto] warning: klik Lanjutan/Advanced →', adv);
    await delay(900);
    const go = clickByText(/buka |tidak aman|unsafe|continue to|go to/i);
    console.log('[oauth-auto] warning: klik Buka/Continue/Go →', go);
    await delay(1000);
  }

  // 2) Halaman izin (consent) — centang izin + klik tombol aksi positif
  if (host === 'oauth.sainskerta.net' || /consent/i.test(path) || location.origin.includes('google')) {
    if (!running.active) return; // guard tetap
    await delay(1200);
    // centang semua checkbox izin (scroll ke view dulu biar ke-klik)
    document.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach((cb) => {
      cb.scrollIntoView({ block: 'center' });
      cb.click();
    });
    await delay(500);
    // klik tombol aksi sungguhan (bukan paragraf). scrollIntoView di clickButton
    // menangani tombol 'Lanjutkan/Continue' yang berada di bawah fold.
    const ok = clickButton(POSITIVE_BTN);
    console.log('[oauth-auto] consent: klik tombol lanjut/izinkan →', ok);
    if (!ok) {
      // fallback: mungkin bukan <button> (link teks) → pakai clickByText lama
      const fb = clickByText(/mengizinkan|izinkan|allow|berikan akses|lanjutkan|continue to|go to/i);
      console.log('[oauth-auto] consent: fallback clickByText →', fb);
    }
  }
}

// Trigger saat DOM siap + setelah load (untuk SPA render ulang, coba berkala)
setTimeout(() => { autoRun(); }, 1200);
window.addEventListener('load', () => {
  setTimeout(() => { autoRun(); }, 2500);
});
