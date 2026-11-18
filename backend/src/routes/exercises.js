const express = require('express');
const { query, generateId } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM exercises WHERE user_id = $1 ORDER BY name ASC', [req.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama latihan wajib diisi' });
  try {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const existing = await query('SELECT id FROM exercises WHERE user_id = $1 AND LOWER(TRIM(name)) = $2', [req.userId, normalized]);
    if (existing.length > 0) return res.status(400).json({ message: 'Latihan dengan nama tersebut sudah ada' });
    const id = generateId();
    await query('INSERT INTO exercises (id, user_id, name) VALUES ($1, $2, $3)', [id, req.userId, name.trim()]);
    const rows = await query('SELECT * FROM exercises WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    await query('UPDATE exercises SET name = $1 WHERE id = $2 AND user_id = $3', [name.trim(), req.params.id, req.userId]);
    const rows = await query('SELECT * FROM exercises WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Exercise deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
