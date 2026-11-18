const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/exercises/:id/progress', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT w.date, ws.weight, ws.reps
       FROM workout_sets ws
       JOIN workout_exercises we ON ws.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id = $1 AND w.user_id = $2
       ORDER BY w.date ASC, ws.set_number ASC`,
      [req.params.id, req.userId]
    );
    const pr = rows.reduce((max, row) => Math.max(max, Number(row.weight)), 0);
    res.json({ history: rows, pr });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/prs', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT e.id, e.name, MAX(CAST(ws.weight AS REAL)) as pr
       FROM workout_sets ws
       JOIN workout_exercises we ON ws.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       JOIN exercises e ON we.exercise_id = e.id
       WHERE w.user_id = $1
       GROUP BY e.id, e.name
       ORDER BY e.name ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalWorkouts = await query('SELECT COUNT(*) as count FROM workouts WHERE user_id = $1', [req.userId]);
    const totalExercises = await query('SELECT COUNT(*) as count FROM exercises WHERE user_id = $1', [req.userId]);
    const totalSplits = await query('SELECT COUNT(*) as count FROM splits WHERE user_id = $1', [req.userId]);
    const recentWorkouts = await query(
      `SELECT w.id, w.date, s.name as session_name
       FROM workouts w JOIN sessions s ON w.session_id = s.id
       WHERE w.user_id = $1 ORDER BY w.date DESC LIMIT 5`,
      [req.userId]
    );
    res.json({
      totalWorkouts: totalWorkouts[0]?.count || 0,
      totalExercises: totalExercises[0]?.count || 0,
      totalSplits: totalSplits[0]?.count || 0,
      recentWorkouts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
