# OAuth Batch Auto-Consent (Chrome Extension + Side Panel)

Chrome extension untuk mengotomasi proses OAuth consent Google secara batch — membuka tab OAuth **satu per satu (sequential)**, auto-klik akun berurutan, centang izin, Continue, lalu **mengumpulkan URL callback lengkap** (mis. `http://localhost:8080/?iss=https://accounts.google.com&code=4/0AXE...&scope=...`) ke side panel untuk di-copy-paste ke OpenClaw.

Yang disimpan adalah **URL callback utuh** (query string lengkap: `iss`, `code`, `scope`, dll) — bukan hanya authorization code. Tiap baris di panel = satu URL callback lengkap dari satu akun.

## Fitur

- 🔐 **Side Panel Console** — semua kontrol di satu panel kanan browser
- ▶️ **Start / ⏹ Stop** — batch hanya jalan saat di-trigger (tidak otomatis nyala)
- 🔍 **Log realtime** — progres tiap langkah & akun
- 🔗 **Koleksi URL callback** — URL `localhost:8080/?iss=...&code=...&scope=...` lengkap dari tiap akun tertampung, tinggal **Copy** / **Simpan .txt**
- 🔁 **Sequential — 10 tab = 10 akun beda** — tab dibuka **satu per satu** (bukan bareng). Extension menunggu code tertangkap / tab ditutup dulu, baru buka tab berikutnya. Ini mencegah race condition cookie/session Google yang bikin banyak tab collapse ke akun aktif yang sama
- 🧑‍🤝‍🧑 **Multi-akun paksa** — `prompt=select_account consent` + `authuser=N` per tab, jadi tiap tab menarget akun berbeda (tab ke-n → `authuser=n-1`, dijamin `authuser` 0..total-1 tanpa dobel), bukan me-reuse akun aktif
- 🚫 **Anti-duplikat** — URL dengan `code` yang sama ditolak + di-log sebagai peringatan akun dobel
- 🖱️ **Auto-klik** — pilih akun berurutan (sesuai urutan tab), centang izin, klik Continue
- 🛡️ **Aman** — tidak menyimpan password, hanya memakai akun yang sudah login di browser

## Cara Install (Developer Mode)

1. Buka `chrome://extensions`
2. Nyalakan **Developer mode**
3. Klik **Load unpacked** → pilih folder repo ini
4. Klik icon extension → **Buka Side Panel** (atau klik icon panel di toolbar kanan atas)

## Cara Pakai

1. Pastikan **semua akun Google sudah login** di browser (profil urut dari akun 1 → terakhir)
2. Buka **side panel** extension
3. Isi **jumlah akun/tab**, lalu klik **▶ Start**
4. Extension buka tab OAuth **satu per satu** (`authuser=0`, lalu `1`, dst — fokus/aktif); tiap tab:
   - Pilih akun ke-n (urutan) otomatis
   - Centang semua izin + klik Continue
   - Redirect ke `localhost:8080/?iss=...&code=...&scope=...` → **URL callback lengkap** tertangkap
   - Setelah code tertangkap (atau tab ditutup), extension jeda ±1.8 detik lalu buka tab akun berikutnya. Tidak ada dua tab berjalan bersamaan → tidak ada race condition, `authuser` dijamin 0..N-1
5. Pantau **log** & **koleksi URL callback** di side panel
6. Klik **📋 Copy** → paste URL-URL-nya ke OpenClaw (aku tukar jadi token)

## Catatan Penting

- **Sequential = lebih lambat tapi andal**: karena tab dibuka satu per satu, batch 10 akun butuh waktu (tiap tab: pilih akun + consent + jeda 1.8s). Ini disengaja — membuka bareng bikin tab saling menimpa dan collapse ke `authuser` yang sama. Kalau satu tab nyangkut, ada safety timeout 120 detik lalu lanjut ke tab berikutnya.
- **Anti-bot Google**: auto-klik bisa memicu *"Verify it's you" / captcha* pada sebagian akun. Akun yang ke-trigger perlu ditangani manual (tutup tab-nya → extension lanjut ke akun berikutnya). Mulai dengan 1-2 akun dulu jika ragu.
- Redirect URI: `http://localhost:8080/` (harus cocok dengan OAuth Client di Google Cloud)
- OAuth Client ID & scopes bisa disesuaikan di `background.js` (`OAUTH_BASE`)
- Default mode aman (semi-otomatis bisa di-set via kode); full-auto lebih cepat tapi lebih berisiko diblokir

## Struktur

```
manifest.json   - MV3, permissions sidePanel/storage/tabs
background.js   - State batch, buka tab, tangkap kode, log
content.js      - Auto-klik akun, centang izin, continue (di halaman Google)
panel.html/js   - Side panel UI (Start/Stop, log, koleksi kode)
popup.html/js   - Tombol buka side panel
```
