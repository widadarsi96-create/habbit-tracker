# Habit Tracker — Online

Frontend: HTML + CSS + JavaScript
Database/Auth: Supabase
Hosting: GitHub Pages (atau hosting statis lain)

## Setup singkat

1. Buat project Supabase.
2. Buka SQL Editor dan jalankan seluruh isi `schema.sql`.
3. Di Supabase, aktifkan Email/Password pada Authentication.
4. Ambil Project URL dan publishable/anon key dari pengaturan API project.
5. Buka `script.js`.
6. Ganti:
   SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
   SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
7. Buka `index.html` atau jalankan Live Server.
8. Buat akun dan login.

## Keamanan

- Jangan pernah memasukkan service_role/secret key ke frontend.
- Website menggunakan Row Level Security sehingga user hanya dapat membaca/menulis data miliknya.

## Status habit

2 = 🟢 penuh/berhasil
1 = 🟡 mengurangi/membaik
0 = 🔴 tidak mengurangi/kembali ke kebiasaan lama

## Catatan

Versi ini sengaja sederhana. Setelah online dan bekerja, fitur berikut bisa ditambahkan:
- edit tanggal
- challenge 28 hari yang bisa diulang
- grafik
- streak
- statistik per habit
- PWA/install ke HP
- validasi timezone Indonesia
