// OAuth Batch Auto-Consent - Content Script
// Berjalan di halaman Google (accounts.google.com) dan consent screen.
// Mode AUTO (dari storage): pilih akun, centang izin, teruskan.

const SETTINGS_KEY = 'oauthSettings';

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      resolve(res[SETTINGS_KEY] || { mode: 'semi' });
    });
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clickByText(selectorRegex, tag = 'button,div,span,a') {
  const els = document.querySelectorAll(tag);
  for (const el of els) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (selectorRegex.test(txt) && el.offsetParent !== null) {
      el.click();
      return true;
    }
  }
  return false;
}

async function autoRun() {
  const settings = await getSettings();
  if (settings.mode !== 'auto') return; // semi-auto: hanya siapkan, user klik manual

  const url = location.href.toLowerCase();

  // 1) Halaman "Choose an account" (accounts.google.com/signin/v2/identifier or chooser)
  if (location.hostname === 'accounts.google.com') {
    // Klik akun pertama yang tersedia
    await delay(1200);
    const li = document.querySelector('ul[role="listbox"] li, ul li[data-identifier]');
    if (li) {
      li.click();
      console.log('[OAuth-Batch] Pilih akun:', li.getAttribute('data-identifier') || '');
      return;
    }
    // Fallback: cari link/div akun
    const acc = document.querySelector('div[data-identifier], div:nth-of-type(2) list-item');
    if (acc) { acc.click(); return; }
  }

  // 2) Halaman consent (oauth - "meminta akses")
  // Centang semua checkbox izin
  await delay(900);
  document.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach((cb) => {
    cb.click();
  });
  await delay(400);

  // 3) Klik tombol lanjut (Continue / Izinkan / Allow / Beralih akun)
  const advanced = clickByText(/selanjutnya|continue|lanjut/i);
  await delay(600);
  const allow = clickByText(/mengizinkan|izinkan|allow|berikan akses/i);
  if (advanced || allow) {
    console.log('[OAuth-Batch] Klik lanjut/izinkan');
  }
}

// Jalankan setelah DOM siap + sedikit delay biar render
setTimeout(() => { autoRun(); }, 1000);

// Re-run untuk halaman SPA yang render lambat
window.addEventListener('load', () => {
  setTimeout(() => { autoRun(); }, 2500);
});
