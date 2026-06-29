const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    db.serialize(() => {
      // Enable foreign keys
      db.run("PRAGMA foreign_keys = ON");

      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT,
        googleId TEXT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'Male',
        theme TEXT DEFAULT 'dark',
        googleConnected BOOLEAN DEFAULT 0,
        notionConnected BOOLEAN DEFAULT 0,
        telegramEnabled BOOLEAN DEFAULT 0,
        telegramChatId TEXT,
        emailEnabled BOOLEAN DEFAULT 0,
        emailAlert TEXT,
        googleAccessToken TEXT,
        googleRefreshToken TEXT,
        notionToken TEXT,
        notionDatabaseId TEXT,
        createdAt INTEGER NOT NULL
      )`);

      // Tasks table (updated to support userId and sync preferences)
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL DEFAULT 'guest',
        title TEXT NOT NULL,
        durationSeconds INTEGER NOT NULL,
        priority TEXT DEFAULT 'Medium',
        category TEXT DEFAULT 'Personal',
        createdAt INTEGER NOT NULL,
        completed BOOLEAN DEFAULT 0,
        completedAt INTEGER,
        isRecurring BOOLEAN DEFAULT 0,
        recurInterval INTEGER,
        recurUnit TEXT,
        syncGoogle BOOLEAN DEFAULT 1,
        syncNotion BOOLEAN DEFAULT 1,
        syncTelegram BOOLEAN DEFAULT 1,
        syncEmail BOOLEAN DEFAULT 1,
        modificationReason TEXT,
        aiEnabled BOOLEAN DEFAULT 0
      )`);

      db.run("ALTER TABLE tasks ADD COLUMN aiEnabled BOOLEAN DEFAULT 0", (err) => {
        // Ignore error if column already exists
      });

      // Subtasks table
      db.run(`CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )`);

      // Categories table (updated to support userId)
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL DEFAULT 'system',
        name TEXT NOT NULL,
        color TEXT NOT NULL
      )`);

      // Seed default categories if empty
      db.get("SELECT count(*) as count FROM categories WHERE userId = 'system'", (err, row) => {
        if (!err && (!row || row.count === 0)) {
          db.run("INSERT INTO categories (id, userId, name, color) VALUES ('cat-work', 'system', 'Work', '#FF6A00')");
          db.run("INSERT INTO categories (id, userId, name, color) VALUES ('cat-personal', 'system', 'Personal', '#00CFCF')");
        }
      });

      // Push Subscriptions table (linked to user)
      db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL DEFAULT 'guest',
        endpoint TEXT UNIQUE NOT NULL,
        keys_auth TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL
      )`);

      // Notifications table
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL DEFAULT 'guest',
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        time INTEGER NOT NULL
      )`);

      // Settings table (key-value store, retained for general settings if needed)
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`);
      
      // Initialize default general settings if empty
      db.get("SELECT count(*) as count FROM settings", (err, row) => {
        if (!err && (!row || row.count === 0)) {
          db.run("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
          db.run("INSERT INTO settings (key, value) VALUES ('vapid_keys', '')");
        }
      });

      // BACKWARD COMPATIBILITY CHECK:
      // Try to safely add 'userId' column to older task versions if they don't have it
      db.run("ALTER TABLE tasks ADD COLUMN userId TEXT NOT NULL DEFAULT 'guest'", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE categories ADD COLUMN userId TEXT NOT NULL DEFAULT 'system'", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE subscriptions ADD COLUMN userId TEXT NOT NULL DEFAULT 'guest'", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE notifications ADD COLUMN userId TEXT NOT NULL DEFAULT 'guest'", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN telegramEnabled BOOLEAN DEFAULT 0", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN telegramChatId TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN emailEnabled BOOLEAN DEFAULT 0", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN emailAlert TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN googleAccessToken TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN googleRefreshToken TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN notionToken TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN notionDatabaseId TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE tasks ADD COLUMN modificationReason TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN isEmailVerified BOOLEAN DEFAULT 0", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN emailOtp TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN phone TEXT", (err) => {
        // Ignored if column already exists
      });
      db.run("ALTER TABLE users ADD COLUMN smsEnabled BOOLEAN DEFAULT 0", (err) => {
        // Ignored if column already exists
      });
    });
  }
});

module.exports = db;
