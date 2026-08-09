// OAuth Batch - Popup: buka side panel
// Catatan: klik icon extension seharusnya sudah otomatis buka side panel
// (openPanelOnActionClick di-set di background.js). Tombol ini cadangan.
const btn = document.getElementById('openPanel');
if (btn) {
  btn.addEventListener('click', () => {
    // Cari tab aktif, buka side panel untuk tab itu
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (tabId !== undefined) {
        chrome.sidePanel.open({ tabId }).catch(() => {});
      } else {
        // fallback: coba tanpa tabId
        chrome.sidePanel.open({}).catch(() => {});
      }
    });
  });
}
