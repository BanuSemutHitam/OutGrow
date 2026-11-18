# OUTGROW — Outgrow Your Past.

OUTGROW membawa ambisi untuk menjadi lebih baik dari diri sendiri sebelumnya. Aplikasi web berfokus pada performa untuk mencatat latihan gym, memantau perkembangan, dan menghitung Personal Record.

## Teknologi

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Database: PostgreSQL/Supabase melalui `DATABASE_URL`; otomatis menggunakan SQLite lokal jika tidak tersedia
- Autentikasi: JWT + hashing kata sandi bcrypt

## Fitur

- Registrasi, login, logout, ubah kata sandi, dan alur reset kata sandi lokal
- CRUD program latihan (split) dan sesi latihan
- Daftar latihan pribadi dengan normalisasi nama untuk mencegah duplikasi
- Catat latihan dengan banyak gerakan dan set
- Riwayat latihan beserta detailnya
- Grafik perkembangan beban per latihan
- Perhitungan Personal Record (PR) otomatis dari beban tertinggi
- Isolasi data per pengguna pada setiap route yang dilindungi

## Bahasa Antarmuka

Brand dan slogan tetap dalam bahasa Inggris (`OUTGROW`, `Outgrow Your Past.`). Seluruh elemen antarmuka fungsional menggunakan Bahasa Indonesia.

## Struktur Project

```
GYM-PERFORMANCE-TRACKING-SYSTEM/
├── backend/
│   ├── data/                 # Folder database SQLite lokal
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         # Koneksi PostgreSQL/Supabase + fallback SQLite
│   │   ├── middleware/
│   │   │   └── auth.js       # Middleware autentikasi JWT
│   │   └── routes/
│   │       ├── auth.js       # Registrasi, login, reset kata sandi
│   │       ├── users.js      # Profil pengguna, ubah kata sandi
│   │       ├── splits.js     # CRUD program latihan dan sesi
│   │       ├── sessions.js   # CRUD sesi latihan
│   │       ├── exercises.js  # CRUD daftar latihan (nama dinormalisasi)
│   │       ├── workouts.js   # CRUD latihan, gerakan, dan set
│   │       └── progress.js   # Perhitungan PR, perkembangan, dan statistik
│   ├── .env
│   ├── .env.example
│   └── server.js             # Entry point aplikasi Express
├── frontend/
│   ├── index.html            # Struktur SPA bertema gelap
│   ├── style.css             # Tema dan styling komponen UI
│   └── app.js                # Logika frontend, pemanggil API, Chart.js
├── schema.sql                # Referensi skema PostgreSQL/Supabase
├── package.json
└── README.md
```

## Menjalankan Secara Lokal

```bash
npm install
npm start
```

Buka <http://localhost:5000>.

Tanpa `DATABASE_URL`, aplikasi membuat database SQLite lokal di `backend/data/gym.sqlite`.

## Supabase / PostgreSQL

1. Buat project PostgreSQL di Supabase.
2. Masukkan `DATABASE_URL` ke `backend/.env`:

```env
PORT=5000
JWT_SECRET=ganti-dengan-secret-acak-yang-panjang
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

3. Jalankan aplikasi. Aplikasi membuat tabel yang diperlukan secara otomatis.

File `schema.sql` berisi referensi skema PostgreSQL yang dapat dijalankan secara terpisah.

## Catatan Produksi

Gunakan `JWT_SECRET` unik dan kuat. Fitur reset kata sandi pada aplikasi lokal mengubah kata sandi melalui alamat email; untuk produksi, ganti dengan token reset satu kali yang dikirim melalui email.
