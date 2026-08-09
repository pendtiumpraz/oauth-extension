# OAuth Batch Auto-Consent (Chrome Extension + Side Panel)

Chrome extension untuk mengotomasi proses OAuth consent Google secara batch — membuka beberapa tab OAuth sekaligus, auto-klik akun berurutan, centang izin, Continue, lalu **mengumpulkan kode `localhost:8080/?code=***`** ke side panel untuk di-copy-paste ke OpenClaw.

## Fitur

- 🔐 **Side Panel Console** — semua kontrol di satu panel kanan browser
- ▶️ **Start / ⏹ Stop** — batch hanya jalan saat di-trigger (tidak otomatis nyala)
- 🔍 **Log realtime** — progres tiap langkah & akun
- 🔗 **Koleksi kode OAuth** — kode `localhost:8080/?code=***` dari tiap akun tertampung, tinggal **Copy** / **Simpan .txt**
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
4. Extension buka N tab OAuth; tiap tab:
   - Pilih akun ke-n (urutan) otomatis
   - Centang semua izin + klik Continue
   - Redirect ke `localhost:8080/?code=***` → kode tertangkap
5. Pantau **log** & **koleksi kode** di side panel
6. Klik **📋 Copy** → paste kode-kodenya ke OpenClaw (aku tukar jadi token)

## Catatan Penting

- **Anti-bot Google**: buka banyak tab sekaligus + auto-klik bisa memicu *"Verify it's you" / captcha* pada sebagian akun. Akun yang ke-trigger perlu ditangani manual. Mulai dengan 1-2 akun dulu jika ragu.
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
