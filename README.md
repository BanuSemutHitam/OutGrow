# OUTGROW — Outgrow Your Past.

OUTGROW adalah aplikasi pencatatan performa latihan gym yang membantu pengguna merekam aktivitas latihan, memantau perkembangan kekuatan, dan mengukur setiap pencapaian. Dibangun atas prinsip untuk terus melampaui diri sendiri, OUTGROW menjadikan setiap latihan sebagai bukti nyata dari sebuah perubahan.

## Teknologi

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Database: PostgreSQL/Supabase
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
│   ├── data/                
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         
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
