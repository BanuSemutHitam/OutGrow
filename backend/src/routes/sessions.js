const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT s.id, s.name, sp.name as split_name
       FROM sessions s JOIN splits sp ON s.split_id = sp.id
       WHERE s.user_id = $1 ORDER BY sp.name, s.name`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    await query('UPDATE sessions SET name = $1 WHERE id = $2 AND user_id = $3', [name, req.params.id, req.userId]);
    const rows = await query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Session deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
