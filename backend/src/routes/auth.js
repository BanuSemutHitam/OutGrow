const express = require('express');
const bcrypt = require('bcryptjs');
const { query, generateId } = require('../config/db');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Semua kolom wajib diisi' });
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar' });
    const id = generateId();
    const hash = await bcrypt.hash(password, 10);
    await query('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)', [id, email, hash, name]);
    const token = signToken(id);
    res.status(201).json({ token, user: { id, email, name } });
  } catch (err) {
    res.status(500).json({ message: 'Pendaftaran gagal', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email dan kata sandi wajib diisi' });
  try {
    const rows = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Kata sandi salah' });
    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'Login gagal', error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: 'Email dan kata sandi baru wajib diisi' });
  try {
    const rows = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Email belum terdaftar' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
    res.json({ message: 'Kata sandi berhasil diatur ulang. Silakan masuk kembali.' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengatur ulang kata sandi', error: err.message });
  }
});

module.exports = router;
