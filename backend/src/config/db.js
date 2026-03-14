import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import { env } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveSqlitePath = () => {
  if (env.sqlitePath) {
    return path.isAbsolute(env.sqlitePath)
      ? env.sqlitePath
      : path.resolve(process.cwd(), env.sqlitePath);
  }

  return path.resolve(__dirname, "../../data/vlsi_lab.sqlite");
};

let db = null;

const createSchema = (database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS students (
      _id TEXT PRIMARY KEY,
      register_number TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      student_name TEXT NOT NULL,
      year_of_study INTEGER NOT NULL,
      gender TEXT NOT NULL DEFAULT 'male',
      role TEXT NOT NULL DEFAULT 'student',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_students_role ON students(role);

    CREATE TABLE IF NOT EXISTS bookings (
      _id TEXT PRIMARY KEY,
      seat_id TEXT NOT NULL,
      row_id TEXT NOT NULL,
      register_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      exit_time TEXT NOT NULL,
      client_ip TEXT,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      verified_at TEXT,
      cancelled_at TEXT,
      is_simulation INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_row_id ON bookings(row_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_is_simulation ON bookings(is_simulation);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_seat
      ON bookings(seat_id) WHERE status = 'active';
    CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_register
      ON bookings(register_number) WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS blocked_systems (
      _id TEXT PRIMARY KEY,
      seat_id TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      blocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_mapping (
      _id TEXT PRIMARY KEY,
      seat_label TEXT NOT NULL UNIQUE,
      system_id TEXT NOT NULL,
      ip_address TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      _id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT DEFAULT ''
    );
  `);
};

export const getDb = () => {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }

  return db;
};

export const connectDB = async () => {
  if (db) {
    return db;
  }

  const sqlitePath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

  db = new DatabaseSync(sqlitePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  createSchema(db);

  console.log(`SQLite connected (${sqlitePath})`);
  return db;
};

export const disconnectDB = async () => {
  if (!db) {
    return;
  }

  db.close();
  db = null;
};
