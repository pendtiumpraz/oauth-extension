# OAuth Batch Auto-Consent (Chrome Extension)

Chrome extension untuk mengotomasi proses OAuth consent Google secara batch — membantu mengumpulkan URL redirect `localhost:8080/?code=...` dari banyak akun Gmail yang sudah login, tanpa harus isi email/password (cukup pilih akun yang sudah login di browser).

## Fitur

- 🔗 **Buka link OAuth** sekali klik
- 🖱️ **Auto-klik** (mode Auto): pilih akun dari chooser, centang semua izin, klik Continue/Allow
- 📋 **Kumpulkan URL** `localhost:8080/?code=...` dari tiap akun ke satu tempat
- 💾 **Simpan ke file .txt** — semua kode terkumpul dalam satu file
- 🧹 **Hapus** kode bila perlu
- 🛡️ **Aman** — tidak menyimpan password, hanya memanfaatkan akun yang sudah login

## Mode

- **Semi-Auto** (default): extension siapkan, Bos pilih akun manual (paling aman dari anti-bot)
- **Auto**: extension klik otomatis (pilih akun, centang, continue) — lebih cepat, sedikit lebih berisiko kena captcha kalau banyak akun berturut

## Cara Install (Developer Mode)

1. Buka `chrome://extensions`
2. Nyalakan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder repo ini
5. Extension "OAuth Batch Auto-Consent" muncul di toolbar

## Cara Pakai

1. Pastikan **semua akun Google sudah login** di browser (satu profile, banyak gmail)
2. Buka popup extension
3. Klik **Buka Link OAuth** → Google tampilkan "Choose an account"
4. Pilih akun → halaman izin muncul → centang semua → **Continue**
5. Redirect ke `localhost:8080/?code=...` → URL otomatis tersimpan
6. Ulangi langkah 3-5 untuk tiap akun
7. Klik **Simpan ke File (.txt)** → dapat file berisi semua URL kode

## Struktur

```
manifest.json   - Konfigurasi extension (MV3)
background.js   - Menangkap URL localhost & simpan kode
content.js      - Auto-klik di halaman Google (pilih akun, centang, continue)
popup.html/js   - UI kontrol & list kode
```

## Catatan

- Redirect URI yang dipakai: `http://localhost:8080/` (harus cocok dengan yang didaftarkan di Google Cloud OAuth Client)
- OAuth Client ID & scopes ada di `popup.js` (bisa disesuaikan)
- Untuk produksi jangka panjang, sebaiknya OAuth di-publish/verifikasi biar token nggak expired 7 hari
