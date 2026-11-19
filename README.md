# OUTGROW — Outgrow Your Past.

OUTGROW adalah aplikasi pencatatan performa latihan gym yang membantu pengguna merekam aktivitas latihan, memantau perkembangan kekuatan, dan mengukur setiap pencapaian. Dibangun atas prinsip untuk terus melampaui diri sendiri, OUTGROW menjadikan setiap latihan sebagai bukti nyata dari sebuah perubahan.

## Teknologi

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Database: PostgreSQL (Supabase) via `DATABASE_URL` (wajib)
- Autentikasi: JWT + hashing kata sandi bcrypt

## Fitur

- Registrasi & login berbasis username + kata sandi
- Ubah kata sandi dari profil akun
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
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         # Koneksi Supabase / PostgreSQL (Pool)
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── users.js
│   │       ├── splits.js
│   │       ├── sessions.js
│   │       ├── exercises.js
│   │       ├── workouts.js
│   │       └── progress.js
│   ├── .env
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── schema.sql
├── package.json
└── README.md
```

## Konfigurasi Supabase

Backend mewajibkan koneksi ke PostgreSQL Supabase.

1. Buka dashboard project Supabase.
2. Klik **Connect**, lalu buka connection string **URI**.
3. Pilih **Session mode** atau **Transaction mode**. Gunakan connection pooler jika jaringan tidak mendukung IPv6.
4. Jangan gunakan REST URL (`https://<ref>.supabase.co/rest/v1/`) untuk `DATABASE_URL`. Backend memakai protokol PostgreSQL.
5. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi connection URI dari dashboard:

```env
PORT=5000
JWT_SECRET=ganti-dengan-secret-acak-yang-panjang-min-32-karakter
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[POOLER_HOST]:[PORT]/postgres
```

Gunakan nilai `[PROJECT_REF]`, `[PASSWORD]`, `[POOLER_HOST]`, dan `[PORT]` persis seperti URI di dashboard Supabase.

## Menjalankan Aplikasi

```bash
npm install
npm start
```

Backend otomatis membuat tabel yang diperlukan saat start (`users`, `splits`, `sessions`, `exercises`, `workouts`, `workout_exercises`, `workout_sets`). Buka <http://localhost:5000>.

File `schema.sql` berisi referensi skema PostgreSQL untuk Supabase SQL Editor.

## Catatan Produksi & Keamanan

- Jangan commit `backend/.env` ke git repository; file ini masuk `.gitignore`.
- Gunakan `JWT_SECRET` panjang, acak, dan unik.
- Jangan pernah menaruh Supabase `service_role` key di frontend atau file publik.
- Reset kata sandi mandiri dinonaktifkan. Pengguna bisa mengganti kata sandi dari pengaturan akun setelah login.
