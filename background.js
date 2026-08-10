// OAuth Batch Auto-Consent - Background Service Worker
// Mengelola state batch, membuka tab OAuth, menangkap kode localhost:8080,
// dan menyimpan log + koleksi kode untuk ditampilkan di side panel.

const STORAGE_KEY = 'oauth_codes';
const LOG_KEY = 'oauth_log';
const RUNNING_KEY = 'oauth_running';

const OAUTH_BASE = 'https://accounts.google.com/o/oauth2/auth?client_id=927010520463-kpk52iv51js1htnvfdoo8nrm5g23cub6.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2F&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&access_type=offline&prompt=select_account%20consent';

function get(key, def) {
  return new Promise((res) => chrome.storage.local.get([key], (r) => res(r[key] ?? def)));
}
function set(key, val) {
  return new Promise((res) => chrome.storage.local.set({ [key]: val }, res));
}

async function addLog(line, at = new Date().toLocaleTimeString()) {
  const log = await get(LOG_KEY, []);
  log.push(`[${at}] ${line}`);
  if (log.length > 500) log.splice(0, log.length - 500);
  await set(LOG_KEY, log);
  broadcast('log');
}

function broadcast(what) {
  try { chrome.runtime.sendMessage({ type: 'broadcast', what }).catch(() => {}); } catch {}
}

// ---------- KLIK IKON EXTENSION -> LANGSUNG BUKA SIDE PANEL ----------
chrome.runtime.onInstalled.addListener(() => {
  // openPanelOnActionClick: klik icon selalu buka side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

// Jalankan juga saat startup biar dijamin aktif
chrome.runtime.onStartup?.addListener?.(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

// Fallback: pastikan behavior tetap set tiap kali service worker bangun
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// ---------- TANGKAP KODE dari redirect localhost:8080 ----------
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.startsWith('http://localhost:8080/')) {
    captureCode(tabId, changeInfo.url);
  }
});
chrome.webNavigation?.onBeforeNavigate?.addListener?.((details) => {
  if (details.url && details.url.startsWith('http://localhost:8080/')) {
    captureCode(details.tabId, details.url);
  }
});

function codeOf(url) { try { return new URL(url).searchParams.get('code'); } catch { return null; } }

async function captureCode(tabId, fullUrl) {
  try {
    // Simpan URL callback LENGKAP (iss, code, scope, dll) — bukan hanya code.
    const code = codeOf(fullUrl);
    if (!code) return;
    const list = await get(STORAGE_KEY, []);
    // Cegah duplikat: tolak jika code (dari URL manapun) sudah ada — indikasi akun dobel.
    if (list.some((u) => codeOf(u) === code)) {
      await addLog(`⚠ Akun dobel — code sama, tab diabaikan: ${short(code)}`);
      try { chrome.tabs.remove(tabId); } catch {}
      return;
    }
    list.push(fullUrl);
    await set(STORAGE_KEY, list);
    await addLog(`URL callback tertangkap (${list.length} total): ${shortUrl(fullUrl)}`);
    // tutup tab redirect biar bersih
    try { chrome.tabs.remove(tabId); } catch {}
    // auto-stop jika sudah target tercapai
    const running = await get(RUNNING_KEY, { active: false, total: 0, opened: 0 });
    if (running.active && list.length >= running.total) {
      running.active = false;
      await set(RUNNING_KEY, running);
      await addLog('✅ Batch SELESAI — semua URL callback terkumpul.');
    }
  } catch (e) {
    await addLog('Gagal tangkap URL: ' + e.message);
  }
}

function short(c) { return c.length > 15 ? c.slice(0, 8) + '…' + c.slice(-6) : c; }
function shortUrl(u) { return u.length > 90 ? u.slice(0, 55) + '…' + u.slice(-25) : u; }

// ---------- START / STOP ----------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'start') {
      const total = Number(msg.total) || 10;
      await set(RUNNING_KEY, { active: true, total, opened: 0 });
      await set(STORAGE_KEY, []);
      await addLog(`🚀 Start batch: buka ${total} tab OAuth...`);
      // buka tab berurutan
      for (let i = 0; i < total; i++) {
        const running = await get(RUNNING_KEY, { active: true, total, opened: 0 });
        if (!running.active) {
          await addLog('⏹ Batch berhenti (stop / semua kode terkumpul).');
          break;
        }
        running.opened += 1;
        await set(RUNNING_KEY, running);
        // authuser bertambah per tab (tab ke-n → authuser=n-1) supaya tiap tab menarget akun berbeda.
        chrome.tabs.create({ url: `${OAUTH_BASE}&authuser=${i}`, active: false });
        await new Promise((r) => setTimeout(r, 700)); // jeda biar nggak kelihatan bot
      }
      sendResponse({ ok: true });
    }

    else if (msg?.type === 'stop') {
      await set(RUNNING_KEY, { active: false, total: 0, opened: 0 });
      await addLog('⏹ Stop di-klik user.');
      sendResponse({ ok: true });
    }

    else if (msg?.type === 'getState') {
      const [codes, log, running] = await Promise.all([
        get(STORAGE_KEY, []), get(LOG_KEY, []), get(RUNNING_KEY, { active: false, total: 0, opened: 0 })
      ]);
      sendResponse({ codes, log, running });
    }

    else if (msg?.type === 'clearCodes') {
      await set(STORAGE_KEY, []);
      await addLog('🗑 Kode dikosongkan.');
      sendResponse({ ok: true });
    }
    else { sendResponse({ ok: false }); }
  })();
  return true;
});
