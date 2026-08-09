// OAuth Batch - Popup: buka side panel
document.getElementById('openPanel').addEventListener('click', () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  // Fallback: buka side panel via kebijakan default (browser path: side panel icon)
  // Coba set behavior default biar klik icon buka panel
});
