const express = require('express');
const { query, generateId } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT w.id, w.date, w.session_id, w.created_at, s.name as session_name, sp.name as split_name
       FROM workouts w
       JOIN sessions s ON w.session_id = s.id
       JOIN splits sp ON s.split_id = sp.id
       WHERE w.user_id = $1 ORDER BY w.date DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  const { date, session_id, exercises } = req.body;
  if (!date || !session_id || !exercises?.length) {
    return res.status(400).json({ message: 'Tanggal, sesi, dan latihan wajib diisi' });
  }
  try {
    const workoutId = generateId();
    await query('INSERT INTO workouts (id, user_id, session_id, date) VALUES ($1, $2, $3, $4)', [workoutId, req.userId, session_id, date]);
    for (const exercise of exercises) {
      const workoutExerciseId = generateId();
      await query('INSERT INTO workout_exercises (id, workout_id, exercise_id) VALUES ($1, $2, $3)', [workoutExerciseId, workoutId, exercise.exercise_id]);
      for (const set of exercise.sets) {
        await query(
          'INSERT INTO workout_sets (id, workout_exercise_id, set_number, weight, reps) VALUES ($1, $2, $3, $4, $5)',
          [generateId(), workoutExerciseId, set.set_number, set.weight, set.reps]
        );
      }
    }
    res.status(201).json({ id: workoutId, message: 'Workout logged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const workoutRows = await query(
      `SELECT w.*, s.name as session_name
       FROM workouts w JOIN sessions s ON w.session_id = s.id
       WHERE w.id = $1 AND w.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!workoutRows.length) return res.status(404).json({ message: 'Latihan tidak ditemukan' });
    const exercises = await query(
      `SELECT we.id as we_id, e.name as exercise_name, e.id as exercise_id
       FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id
       WHERE we.workout_id = $1`,
      [req.params.id]
    );
    for (const exercise of exercises) {
      exercise.sets = await query('SELECT * FROM workout_sets WHERE workout_exercise_id = $1 ORDER BY set_number ASC', [exercise.we_id]);
    }
    res.json({ ...workoutRows[0], exercises });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Workout deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
