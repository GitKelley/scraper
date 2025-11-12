import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path configuration
// On Render with persistent disk: use /opt/render/project/persistent
// On Render free tier: data will be lost on redeploy (ephemeral filesystem)
// Local development: use project root
const isProduction = process.env.NODE_ENV === 'production';
const persistentPath = process.env.RENDER_PERSISTENT_DISK_PATH || '/opt/render/project/persistent';

// Check if we're on Render (Render sets RENDER=true or we can check for the persistent path)
const isRender = process.env.RENDER === 'true' || process.env.RENDER === '1' || fs.existsSync('/opt/render');

// Use persistent disk if on Render and the path exists, otherwise use project root
let dbPath;
if (isProduction && isRender && fs.existsSync(persistentPath)) {
  dbPath = path.join(persistentPath, 'data.db');
  console.log(`✅ Using persistent disk at: ${dbPath}`);
} else if (isProduction && isRender) {
  // On Render but persistent disk not mounted yet - warn but use project root
  console.warn(`⚠️  Persistent disk not found at ${persistentPath}. Data will be lost on redeploy.`);
  console.warn(`   Please add a persistent disk mounted at: ${persistentPath}`);
  dbPath = path.join(__dirname, '..', 'data.db');
} else {
  // Local development
  dbPath = path.join(__dirname, '..', 'data.db');
}

console.log(`Database location: ${dbPath}`);

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

