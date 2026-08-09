// OAuth Batch Auto-Consent - Popup Logic
const OAUTH_URL = 'https://accounts.google.com/o/oauth2/auth?client_id=927010520463-kpk52iv51js1htnvfdoo8nrm5g23cub6.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2F&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&access_type=offline&prompt=consent';

const SETTINGS_KEY = 'oauthSettings';

function saveSettings() {
  const mode = document.getElementById('mode').value;
  chrome.storage.local.set({ [SETTINGS_KEY]: { mode } });
}

function loadSettings() {
  chrome.storage.local.get([SETTINGS_KEY], (res) => {
    const s = res[SETTINGS_KEY] || { mode: 'semi' };
    document.getElementById('mode').value = s.mode;
  });
}

function refreshCodes() {
  chrome.runtime.sendMessage({ type: 'getCodes' }, (resp) => {
    const codes = resp?.codes || [];
    document.getElementById('count').textContent = codes.length;
    const ta = document.getElementById('urls');
    // tampilkan hanya kodenya (parse dari URL)
    ta.value = codes.map((u) => {
      try { return new URL(u).searchParams.get('code') || u; } catch { return u; }
    }).join('\n');
  });
}

document.getElementById('mode').addEventListener('change', saveSettings);

document.getElementById('openUrl').addEventListener('click', () => {
  chrome.tabs.create({ url: OAUTH_URL });
});

document.getElementById('saveFile').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'saveAsFile' }, (resp) => {
    if (resp?.ok) alert(`Tersimpan ${resp.count} URL ke file .txt`);
  });
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'clearCodes' }, () => {
    refreshCodes();
    alert('Semua kode dihapus');
  });
});

loadSettings();
refreshCodes();
// refresh berkala
setInterval(refreshCodes, 1500);
