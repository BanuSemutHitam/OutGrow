const express = require('express');
const bcrypt = require('bcryptjs');
const { query, generateId } = require('../config/db');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

const normalizeUsername = (username) => username.trim().toLowerCase();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username dan kata sandi wajib diisi' });

  const normalizedUsername = normalizeUsername(username);
  if (normalizedUsername.length < 3) return res.status(400).json({ message: 'Username minimal 3 karakter' });

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = $1', [normalizedUsername]);
    if (existing.length > 0) return res.status(400).json({ message: 'Username sudah dipakai' });

    const id = generateId();
    const hash = await bcrypt.hash(password, 10);
    await query('INSERT INTO users (id, username, password_hash, name) VALUES ($1, $2, $3, $4)', [id, normalizedUsername, hash, normalizedUsername]);
    const token = signToken(id);
    res.status(201).json({ token, user: { id, username: normalizedUsername, name: normalizedUsername } });
  } catch (err) {
    res.status(500).json({ message: 'Pendaftaran gagal', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username dan kata sandi wajib diisi' });

  try {
    const rows = await query('SELECT * FROM users WHERE LOWER(username) = $1', [normalizeUsername(username)]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Kata sandi salah' });

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'Login gagal', error: err.message });
  }
});

module.exports = router;
