// OAuth Batch Auto-Consent - Background Service Worker
// Menangkap URL redirect localhost:8080 dan menyimpan kode OAuth ke storage.

const STORAGE_KEY = 'oauthCodes';

// Tangkap navigasi ke localhost:8080 (redirect OAuth)
chrome.webNavigation?.onBeforeNavigate?.addListener?.((details) => {
  if (details.url && details.url.startsWith('http://localhost:8080/')) {
    saveCode(details.url);
  }
});

// Fallback: tangkap lewat tabs.onUpdated (lebih andal di many case)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.startsWith('http://localhost:8080/')) {
    saveCode(changeInfo.url);
  }
});

function saveCode(fullUrl) {
  try {
    const parsed = new URL(fullUrl);
    const code = parsed.searchParams.get('code');
    if (!code) return;

    chrome.storage.local.get([STORAGE_KEY], (res) => {
      const list = res[STORAGE_KEY] || [];
      // Hindari duplikat
      if (list.includes(fullUrl)) return;
      list.push(fullUrl);
      chrome.storage.local.set({ [STORAGE_KEY]: list });
      console.log('[OAuth-Batch] Code saved:', code.slice(0, 20) + '...');
    });
  } catch (e) {
    console.error('[OAuth-Batch] Gagal parse URL:', e);
  }
}

// Handler pesan dari popup / content
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getCodes') {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      sendResponse({ codes: res[STORAGE_KEY] || [] });
    });
    return true; // async
  }
  if (msg?.type === 'clearCodes') {
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg?.type === 'saveAsFile') {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      const list = res[STORAGE_KEY] || [];
      const content = list.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: 'oauth-urls.txt',
        saveAs: true
      });
      sendResponse({ ok: true, count: list.length });
    });
    return true;
  }
});
