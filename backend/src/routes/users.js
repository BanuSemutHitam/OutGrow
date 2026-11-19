const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT id, username, name FROM users WHERE id = $1', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Kedua kolom kata sandi wajib diisi' });
  try {
    const rows = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Kata sandi saat ini tidak sesuai' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.userId]);
    res.json({ message: 'Kata sandi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

module.exports = router;
