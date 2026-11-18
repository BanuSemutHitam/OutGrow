const express = require('express');
const { query, generateId } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET all splits
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM splits WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST new split
router.post('/', authenticate, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama program wajib diisi' });
  try {
    const id = generateId();
    await query('INSERT INTO splits (id, user_id, name, description) VALUES ($1, $2, $3, $4)', [id, req.userId, name, description || '']);
    const rows = await query('SELECT * FROM splits WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT split
router.put('/:id', authenticate, async (req, res) => {
  const { name, description } = req.body;
  try {
    await query('UPDATE splits SET name = $1, description = $2 WHERE id = $3 AND user_id = $4', [name, description || '', req.params.id, req.userId]);
    const rows = await query('SELECT * FROM splits WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE split
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM splits WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Split deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sessions of a split
router.get('/:splitId/sessions', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM sessions WHERE split_id = $1 AND user_id = $2 ORDER BY created_at ASC', [req.params.splitId, req.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:splitId/sessions', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama program wajib diisi' });
  try {
    const id = generateId();
    await query('INSERT INTO sessions (id, split_id, user_id, name) VALUES ($1, $2, $3, $4)', [id, req.params.splitId, req.userId, name]);
    const rows = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
