// OAuth Batch Auto-Consent - Content Script
// Berjalan di halaman Google (accounts.google.com / consent).
// Mode AUTO: pilih akun berikutnya, centang izin, klik Continue.
// Hanya aktif bila batch sedang running (di-trigger dari side panel).

const RUNNING_KEY = '***';

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

// klik akun ke-N pada halaman chooser (urutan sesuai posisi di list)
let clickCounter = 0;
async function clickNthAccount(n) {
  // Google chooser: daftar akun biasanya <li> dalam elemen dengan role listbox
  const list = document.querySelectorAll('ul[role="listbox"] li, ul[role="listbox"] div[role="presentation"]');
  if (list.length > 0) {
    const idx = Math.min(n - 1, list.length - 1);
    list[idx]?.click();
    return true;
  }
  // fallback: cari elemen dengan data-identifier / akun
  const acc = document.querySelectorAll('div[data-identifier]');
  if (acc.length > 0) {
    const idx = Math.min(n - 1, acc.length - 1);
    acc[idx]?.click();
    return true;
  }
  return false;
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

  // 2) Halaman izin (consent) — centang semua + continue
  if (host === 'oauth.sainskerta.net' || /consent/i.test(path) || location.origin.includes('google')) {
    await delay(1200);
    // centang semua checkbox (expand "advanced" dulu jika perlu)
    document.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach((cb) => cb.click());
    await delay(500);
    const advanced = clickByText(/selanjutnya|continue|advanced|lanjut|teruskan/i);
    await delay(700);
    const allow = clickByText(/mengizinkan|izinkan|allow|berikan akses|continue to/i);
    if (!advanced && !allow) {
      // mungkin butuh klik "expand more" — coba tombol umum
      clickByText(/lanjut|next/i);
    }
  }
}

// Trigger saat DOM siap + setelah load (untuk SPA render ulang, coba berkala)
setTimeout(() => { autoRun(); }, 1200);
window.addEventListener('load', () => {
  setTimeout(() => { autoRun(); }, 2500);
});
