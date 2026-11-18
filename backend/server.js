const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { initDb } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/splits', require('./src/routes/splits'));
app.use('/api/sessions', require('./src/routes/sessions'));
app.use('/api/exercises', require('./src/routes/exercises'));
app.use('/api/workouts', require('./src/routes/workouts'));
app.use('/api', require('./src/routes/progress'));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const start = async () => {
  await initDb();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
};

start();
