/**
 * Authentication functions for user signup and login
 * Uses bcrypt for password hashing
 */

import bcrypt from 'bcrypt';
import { getDatabase } from './database.js';

const db = getDatabase();

// Generate unique user ID
function generateUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Sign up a new user
export async function signUp(username, password, name) {
  // Validate input
  if (!username || !password || !name) {
    throw new Error('Username, password, and name are required');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if username already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = generateUserId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, password, name, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, username, hashedPassword, name, now, now);

  return {
    id: userId,
    username,
    name,
    createdAt: now
  };
}

// Login user
export async function login(username, password) {
  // Validate input
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  // Find user by username
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    throw new Error('Invalid username or password');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new Error('Invalid username or password');
  }

  // Return user data (without password)
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    createdAt: user.createdAt
  };
}

// Get user by ID
export function getUserById(userId) {
  const user = db.prepare('SELECT id, username, name, createdAt FROM users WHERE id = ?').get(userId);
  return user || null;
}

// Get user by username
export function getUserByUsername(username) {
  const user = db.prepare('SELECT id, username, name, createdAt FROM users WHERE username = ?').get(username);
  return user || null;
}

