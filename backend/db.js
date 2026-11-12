const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "grades.db"));

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_name TEXT NOT NULL,
        semester TEXT NOT NULL,
        credits REAL NOT NULL CHECK (credits > 0),
        grade TEXT NOT NULL CHECK (
            grade IN ('A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F')
        )
    );

    CREATE TABLE IF NOT EXISTS timetable_classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_name TEXT NOT NULL,
        instructor TEXT,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS unavailable_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        repeat_weekly INTEGER NOT NULL DEFAULT 1
            CHECK (repeat_weekly IN (0, 1)),
        date TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_name TEXT NOT NULL,
        assignment_name TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
        due_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);

module.exports = db;