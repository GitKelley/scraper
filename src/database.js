import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database file in the project root
const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create index on username for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Create rentals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      id TEXT PRIMARY KEY,
      title TEXT,
      url TEXT,
      source TEXT,
      description TEXT,
      price REAL,
      bedrooms INTEGER,
      bathrooms INTEGER,
      sleeps INTEGER,
      location TEXT,
      amenities TEXT,
      images TEXT,
      status TEXT,
      bookingType TEXT,
      categories TEXT,
      scrapedAt TEXT,
      tripType TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      category TEXT,
      cost TEXT,
      duration TEXT,
      bestTime TEXT,
      difficulty TEXT,
      groupSize TEXT,
      bookingRequired TEXT,
      url TEXT,
      contactPhone TEXT,
      contactEmail TEXT,
      notes TEXT,
      images TEXT,
      status TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemId TEXT NOT NULL,
      itemType TEXT NOT NULL,
      userId TEXT NOT NULL,
      voteType TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(itemId, userId)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_votes_item ON votes(itemId, itemType);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(userId);
  `);

  // Create comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      itemType TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create indexes for comments
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(itemId, itemType);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(userId);
    CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(createdAt);
  `);

  // Create settings table for app-wide settings (like header image)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  console.log('Database initialized successfully');
}

// Get database instance
export function getDatabase() {
  return db;
}

// Close database connection
export function closeDatabase() {
  db.close();
}

