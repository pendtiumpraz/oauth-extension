// OAuth Batch Console - Side Panel Logic
const $ = (id) => document.getElementById(id);

const startBtn = $('startBtn');
const stopBtn = $('stopBtn');
const totalInput = $('total');
const logEl = $('log');
const codesEl = $('codes');
const countEl = $('count');

function fmtLine(raw) {
  // raw = "[HH:MM:SS] message"
  let html = raw;
  if (/selesai|✅/i.test(raw)) html = `<span class="ok">${raw}</span>`;
  else if (/gagal|error|⚠/i.test(raw)) html = `<span class="err">${raw}</span>`;
  else if (/jeda|warn|perhatian/i.test(raw)) html = `<span class="warn">${raw}</span>`;
  return html;
}

function render(log, codes, running) {
  logEl.innerHTML = log.map(fmtLine).join('<br>');
  logEl.scrollTop = logEl.scrollHeight; // auto-scroll

  codesEl.value = codes.join('\n');
  countEl.textContent = codes.length + ' kode';

  startBtn.textContent = running.active ? '⏳ Berjalan…' : '▶ Start';
  startBtn.classList.toggle('running', running.active);
  stopBtn.disabled = !running.active;
}

function refresh() {
  chrome.runtime.sendMessage({ type: 'getState' }, (resp) => {
    if (resp) render(resp.log, resp.codes, resp.running);
  });
}

startBtn.addEventListener('click', () => {
  const total = Number(totalInput.value) || 10;
  startBtn.disabled = true;
  chrome.runtime.sendMessage({ type: 'start', total }, (resp) => {
    if (resp?.ok) { startBtn.disabled = false; refresh(); }
  });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'stop' }, () => refresh());
});

$('copyBtn').addEventListener('click', async () => {
  const codes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: 'getState' }, (resp) => r(resp?.codes || [])));
  await navigator.clipboard.writeText(codes.join('\n'));
  // feedback
  const t = $('copyBtn').textContent;
  $('copyBtn').textContent = '✅ Tersalin!';
  setTimeout(() => { $('copyBtn').textContent = t; }, 1200);
});

$('saveBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'getState' }, (resp) => {
    const codes = resp?.codes || [];
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'oauth-codes.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});

$('clearBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'clearCodes' }, () => refresh());
});

// realtime: refresh tiap detik + dengar broadcast dari background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'broadcast' && msg.what === 'log') refresh();
});
setInterval(refresh, 1000);
refresh();
