const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let mode = 'sqlite';
let pgPool = null;
let sqliteDb = null;

const initDb = async () => {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      });
      // Test PG connection
      const client = await pgPool.connect();
      client.release();
      mode = 'postgres';
      console.log('[DB] Connected to PostgreSQL / Supabase successfully.');
      await initPostgresTables();
      return;
    } catch (err) {
      console.warn('[DB] PostgreSQL connection failed, falling back to local SQLite:', err.message);
    }
  }

  // SQLite fallback
  mode = 'sqlite';
  const sqlite3 = require('sqlite3').verbose();
  const dbDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'gym.sqlite');
  console.log(`[DB] Using SQLite local database at: ${dbPath}`);

  sqliteDb = new sqlite3.Database(dbPath);
  await initSqliteTables();
};

const initPostgresTables = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS splits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      split_id TEXT NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS exercises_user_norm_idx
      ON exercises (user_id, LOWER(TRIM(name)));

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      weight NUMERIC(6,2) NOT NULL,
      reps INTEGER NOT NULL
    );
  `;
  await pgPool.query(schema);
};

const initSqliteTables = () => {
  return new Promise((resolve, reject) => {
    sqliteDb.serialize(() => {
      sqliteDb.run('PRAGMA foreign_keys = ON;');
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          reset_token TEXT,
          reset_token_expires TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS splits (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          split_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      sqliteDb.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS exercises_user_norm_idx
        ON exercises (user_id, LOWER(TRIM(name)));
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS workout_exercises (
          id TEXT PRIMARY KEY,
          workout_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
        );
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS workout_sets (
          id TEXT PRIMARY KEY,
          workout_exercise_id TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          weight REAL NOT NULL,
          reps INTEGER NOT NULL,
          FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

// Generic query helper that accepts $1, $2 style parameters for both engines
const query = async (sqlText, params = []) => {
  if (mode === 'postgres') {
    const res = await pgPool.query(sqlText, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      // For SQLite, convert $1, $2, ... to ?
      const sqliteSql = sqlText.replace(/\$\d+/g, '?');
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sqliteSql);

      if (isSelect) {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      } else {
        sqliteDb.run(sqliteSql, params, function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes, lastID: this.lastID });
        });
      }
    });
  }
};

const getClient = async () => {
  if (mode === 'postgres') {
    const client = await pgPool.connect();
    return {
      query: (text, params) => client.query(text, params),
      release: () => client.release()
    };
  } else {
    return {
      query: (text, params) => query(text, params),
      release: () => {}
    };
  }
};

const generateId = () => crypto.randomUUID();

module.exports = {
  initDb,
  query,
  getClient,
  generateId,
  getMode: () => mode
};
