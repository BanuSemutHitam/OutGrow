const crypto = require('crypto');
const { Pool } = require('pg');

let pgPool = null;

const initDb = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[DB] FATAL: DATABASE_URL tidak ditemukan di backend/.env');
    console.error('[DB] Aplikasi mewajibkan koneksi Supabase / PostgreSQL.');
    process.exit(1);
  }

  try {
    pgPool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const client = await pgPool.connect();
    client.release();
    console.log('[DB] Connected to PostgreSQL / Supabase successfully.');
    await initPostgresTables();
  } catch (err) {
    console.error('[DB] FATAL: Gagal koneksi ke Supabase / PostgreSQL:', err.message);
    if (err.message.includes('ENOTFOUND')) {
      console.error('[DB] Host tidak ditemukan. Gunakan connection pooler Supabase (IPv4 compatible), bukan direct connection.');
    }
    process.exit(1);
  }
};

const initPostgresTables = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Migration helper if table previously had email column
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) THEN
        ALTER TABLE users ADD COLUMN username TEXT;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'email'
        ) THEN
          UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1)) WHERE username IS NULL;
          ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
        END IF;
        ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (LOWER(username));
      END IF;
    END $$;

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

const query = async (sqlText, params = []) => {
  const res = await pgPool.query(sqlText, params);
  return res.rows;
};

const getClient = async () => {
  const client = await pgPool.connect();
  return {
    query: (text, params) => client.query(text, params),
    release: () => client.release()
  };
};

const generateId = () => crypto.randomUUID();

module.exports = {
  initDb,
  query,
  getClient,
  generateId,
  getMode: () => 'postgres'
};
