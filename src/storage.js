/**
 * Database-backed storage for rentals and activities
 * Uses SQLite for persistent data storage
 */

import { getDatabase } from './database.js';

const db = getDatabase();

// Helper function to serialize arrays/objects to JSON
function serialize(data) {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data) || typeof data === 'object') {
    return JSON.stringify(data);
  }
  return data;
}

// Helper function to deserialize JSON strings back to arrays/objects
function deserialize(data) {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
}

// Settings storage functions
export function getSetting(key) {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return setting ? setting.value : null;
}

export function setSetting(key, value) {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  
  if (existing) {
    db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?').run(value, now, key);
  } else {
    db.prepare('INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(key, value, now);
  }
  
  return { key, value, updatedAt: now };
}

// Rental storage functions
export function saveRental(rentalData) {
  // Generate ID if not present
  if (!rentalData.id) {
    rentalData.id = `rental-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add timestamps
  const now = new Date().toISOString();
  rentalData.createdAt = rentalData.createdAt || now;
  rentalData.updatedAt = now;
  
  // Check if rental already exists
  const existing = db.prepare('SELECT id FROM rentals WHERE id = ?').get(rentalData.id);
  
  if (existing) {
    // Update existing rental
    db.prepare(`
      UPDATE rentals SET
        title = ?, url = ?, source = ?, description = ?, price = ?,
        bedrooms = ?, bathrooms = ?, sleeps = ?, location = ?,
        amenities = ?, images = ?, status = ?, bookingType = ?,
        categories = ?, scrapedAt = ?, tripType = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      rentalData.title,
      rentalData.url || null,
      rentalData.source || null,
      rentalData.description || null,
      rentalData.price || null,
      rentalData.bedrooms || null,
      rentalData.bathrooms || null,
      rentalData.sleeps || null,
      rentalData.location || null,
      serialize(rentalData.amenities),
      serialize(rentalData.images),
      rentalData.status || null,
      rentalData.bookingType || null,
      serialize(rentalData.categories),
      rentalData.scrapedAt || null,
      rentalData.tripType || null,
      rentalData.updatedAt,
      rentalData.id
    );
  } else {
    // Insert new rental
    db.prepare(`
      INSERT INTO rentals (
        id, title, url, source, description, price,
        bedrooms, bathrooms, sleeps, location,
        amenities, images, status, bookingType,
        categories, scrapedAt, tripType, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rentalData.id,
      rentalData.title,
      rentalData.url || null,
      rentalData.source || null,
      rentalData.description || null,
      rentalData.price || null,
      rentalData.bedrooms || null,
      rentalData.bathrooms || null,
      rentalData.sleeps || null,
      rentalData.location || null,
      serialize(rentalData.amenities),
      serialize(rentalData.images),
      rentalData.status || null,
      rentalData.bookingType || null,
      serialize(rentalData.categories),
      rentalData.scrapedAt || null,
      rentalData.tripType || null,
      rentalData.createdAt,
      rentalData.updatedAt
    );
  }
  
  return getRentalById(rentalData.id);
}

export function getAllRentals() {
  const rentals = db.prepare('SELECT * FROM rentals ORDER BY createdAt DESC').all();
  
  return rentals.map(rental => {
    const rentalObj = {
      ...rental,
      amenities: deserialize(rental.amenities),
      images: deserialize(rental.images),
      categories: deserialize(rental.categories)
    };
    
    // Get vote counts
    const votes = getVoteCounts(rental.id, 'rental');
    return {
      ...rentalObj,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes
    };
  });
}

export function getRentalById(id) {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
  
  if (!rental) return null;
  
  const rentalObj = {
    ...rental,
    amenities: deserialize(rental.amenities),
    images: deserialize(rental.images),
    categories: deserialize(rental.categories)
  };
  
  // Get vote counts
  const votes = getVoteCounts(id, 'rental');
  return {
    ...rentalObj,
    upvotes: votes.upvotes,
    downvotes: votes.downvotes
  };
}

export function deleteRental(rentalId) {
  // Delete all votes for this rental
  db.prepare('DELETE FROM votes WHERE itemId = ? AND itemType = ?').run(rentalId, 'rental');
  // Delete all comments for this rental
  db.prepare('DELETE FROM comments WHERE itemId = ? AND itemType = ?').run(rentalId, 'rental');
  // Delete the rental
  db.prepare('DELETE FROM rentals WHERE id = ?').run(rentalId);
  return true;
}

export function voteOnRental(rentalId, voteType, userId) {
  // Check if user has already voted for this specific rental
  const existingVote = db.prepare(
    'SELECT voteType FROM votes WHERE itemId = ? AND itemType = ? AND userId = ?'
  ).get(rentalId, 'rental', userId);
  
  // If user already voted the same way, remove the vote (toggle off)
  if (existingVote && existingVote.voteType === voteType) {
    db.prepare(
      'DELETE FROM votes WHERE itemId = ? AND itemType = ? AND userId = ?'
    ).run(rentalId, 'rental', userId);
    return { ...getVoteCounts(rentalId, 'rental'), removed: true };
  }
  
  // NEW: Remove any existing votes for this user on other rentals
  // This ensures users can only vote for one house at a time
  db.prepare(
    'DELETE FROM votes WHERE itemId != ? AND itemType = ? AND userId = ?'
  ).run(rentalId, 'rental', userId);
  
  // If user previously voted differently on this rental, update the vote
  if (existingVote) {
    db.prepare(
      'UPDATE votes SET voteType = ?, createdAt = ? WHERE itemId = ? AND itemType = ? AND userId = ?'
    ).run(voteType, new Date().toISOString(), rentalId, 'rental', userId);
  } else {
    // Insert new vote
    db.prepare(
      'INSERT INTO votes (itemId, itemType, userId, voteType, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(rentalId, 'rental', userId, voteType, new Date().toISOString());
  }
  
  return getVoteCounts(rentalId, 'rental');
}

export function getVotingResults() {
  const rentals = getAllRentals();
  return rentals
    .map(rental => ({
      ...rental,
      netVotes: rental.upvotes - rental.downvotes
    }))
    .sort((a, b) => b.netVotes - a.netVotes);
}

// Helper function to get vote counts
function getVoteCounts(itemId, itemType) {
  const upvotes = db.prepare(
    'SELECT COUNT(*) as count FROM votes WHERE itemId = ? AND itemType = ? AND voteType = ?'
  ).get(itemId, itemType, 'upvote');
  
  const downvotes = db.prepare(
    'SELECT COUNT(*) as count FROM votes WHERE itemId = ? AND itemType = ? AND voteType = ?'
  ).get(itemId, itemType, 'downvote');
  
  return {
    upvotes: upvotes.count || 0,
    downvotes: downvotes.count || 0
  };
}

// Comment storage functions
export function addComment(itemId, itemType, userId, userName, text) {
  const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO comments (id, itemId, itemType, userId, userName, text, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commentId, itemId, itemType, userId, userName, text, now, now);
  
  return getCommentById(commentId);
}

export function getComments(itemId, itemType) {
  const comments = db.prepare(`
    SELECT * FROM comments 
    WHERE itemId = ? AND itemType = ?
    ORDER BY createdAt ASC
  `).all(itemId, itemType);
  
  return comments;
}

export function getCommentById(commentId) {
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
}

export function deleteComment(commentId, userId) {
  // Only allow user to delete their own comments
  const comment = db.prepare('SELECT userId FROM comments WHERE id = ?').get(commentId);
  if (!comment || comment.userId !== userId) {
    throw new Error('Unauthorized to delete this comment');
  }
  
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  return true;
}

// Activity storage functions
export function saveActivity(activityData) {
  // Generate ID if not present
  if (!activityData.id) {
    activityData.id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add timestamps
  const now = new Date().toISOString();
  activityData.createdAt = activityData.createdAt || now;
  activityData.updatedAt = now;
  
  // Check if activity already exists
  const existing = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityData.id);
  
  if (existing) {
    // Update existing activity
    db.prepare(`
      UPDATE activities SET
        title = ?, description = ?, location = ?, category = ?, cost = ?,
        duration = ?, bestTime = ?, difficulty = ?, groupSize = ?,
        bookingRequired = ?, url = ?, contactPhone = ?, contactEmail = ?,
        notes = ?, images = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      activityData.title,
      activityData.description || null,
      activityData.location || null,
      activityData.category || null,
      activityData.cost || null,
      activityData.duration || null,
      activityData.bestTime || null,
      activityData.difficulty || null,
      activityData.groupSize || null,
      activityData.bookingRequired || null,
      activityData.url || null,
      activityData.contactPhone || null,
      activityData.contactEmail || null,
      activityData.notes || null,
      serialize(activityData.images),
      activityData.status || null,
      activityData.updatedAt,
      activityData.id
    );
  } else {
    // Insert new activity
    db.prepare(`
      INSERT INTO activities (
        id, title, description, location, category, cost,
        duration, bestTime, difficulty, groupSize,
        bookingRequired, url, contactPhone, contactEmail,
        notes, images, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activityData.id,
      activityData.title,
      activityData.description || null,
      activityData.location || null,
      activityData.category || null,
      activityData.cost || null,
      activityData.duration || null,
      activityData.bestTime || null,
      activityData.difficulty || null,
      activityData.groupSize || null,
      activityData.bookingRequired || null,
      activityData.url || null,
      activityData.contactPhone || null,
      activityData.contactEmail || null,
      activityData.notes || null,
      serialize(activityData.images),
      activityData.status || null,
      activityData.createdAt,
      activityData.updatedAt
    );
  }
  
  return getActivityById(activityData.id);
}

export function getAllActivities() {
  const activities = db.prepare('SELECT * FROM activities ORDER BY createdAt DESC').all();
  
  return activities.map(activity => {
    const activityObj = {
      ...activity,
      images: deserialize(activity.images)
    };
    
    // Get vote counts
    const votes = getVoteCounts(activity.id, 'activity');
    return {
      ...activityObj,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes
    };
  });
}

export function getActivityById(id) {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  
  if (!activity) return null;
  
  const activityObj = {
    ...activity,
    images: deserialize(activity.images)
  };
  
  // Get vote counts
  const votes = getVoteCounts(id, 'activity');
  return {
    ...activityObj,
    upvotes: votes.upvotes,
    downvotes: votes.downvotes
  };
}

export function deleteActivity(activityId) {
  // Delete all votes for this activity
  db.prepare('DELETE FROM votes WHERE itemId = ? AND itemType = ?').run(activityId, 'activity');
  // Delete all comments for this activity
  db.prepare('DELETE FROM comments WHERE itemId = ? AND itemType = ?').run(activityId, 'activity');
  // Delete the activity
  db.prepare('DELETE FROM activities WHERE id = ?').run(activityId);
  return true;
}

export function voteOnActivity(activityId, voteType, userId) {
  // Check if user has already voted
  const existingVote = db.prepare(
    'SELECT voteType FROM votes WHERE itemId = ? AND itemType = ? AND userId = ?'
  ).get(activityId, 'activity', userId);
  
  // If user already voted the same way, remove the vote (toggle off)
  if (existingVote && existingVote.voteType === voteType) {
    db.prepare(
      'DELETE FROM votes WHERE itemId = ? AND itemType = ? AND userId = ?'
    ).run(activityId, 'activity', userId);
    return { ...getVoteCounts(activityId, 'activity'), removed: true };
  }
  
  // If user previously voted differently, update the vote
  if (existingVote) {
    db.prepare(
      'UPDATE votes SET voteType = ?, createdAt = ? WHERE itemId = ? AND itemType = ? AND userId = ?'
    ).run(voteType, new Date().toISOString(), activityId, 'activity', userId);
  } else {
    // Insert new vote
    db.prepare(
      'INSERT INTO votes (itemId, itemType, userId, voteType, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(activityId, 'activity', userId, voteType, new Date().toISOString());
  }
  
  return getVoteCounts(activityId, 'activity');
}

export function getActivityVotingResults() {
  const activities = getAllActivities();
  return activities
    .map(activity => ({
      ...activity,
      netVotes: activity.upvotes - activity.downvotes
    }))
    .sort((a, b) => b.netVotes - a.netVotes);
}

// Clear all votes for rentals (tie breaker functionality)
export function clearAllRentalVotes() {
  const result = db.prepare('DELETE FROM votes WHERE itemType = ?').run('rental');
  return { deleted: result.changes };
}

// Get detailed vote information showing who voted for which houses
export function getVoteDetails() {
  // Get all votes for rentals with user information
  const voteDetails = db.prepare(`
    SELECT 
      v.id as voteId,
      v.itemId as rentalId,
      v.userId,
      v.voteType,
      v.createdAt as voteDate,
      u.username,
      u.name as userName,
      r.title as rentalTitle,
      r.location as rentalLocation,
      r.price as rentalPrice
    FROM votes v
    JOIN users u ON v.userId = u.id
    JOIN rentals r ON v.itemId = r.id
    WHERE v.itemType = 'rental'
    ORDER BY v.createdAt DESC
  `).all();

  // Group votes by rental
  const votesByRental = {};
  voteDetails.forEach(vote => {
    if (!votesByRental[vote.rentalId]) {
      votesByRental[vote.rentalId] = {
        rentalId: vote.rentalId,
        rentalTitle: vote.rentalTitle,
        rentalLocation: vote.rentalLocation,
        rentalPrice: vote.rentalPrice,
        upvotes: [],
        downvotes: []
      };
    }
    
    const voterInfo = {
      userId: vote.userId,
      username: vote.username,
      name: vote.userName,
      voteDate: vote.voteDate
    };
    
    if (vote.voteType === 'upvote') {
      votesByRental[vote.rentalId].upvotes.push(voterInfo);
    } else {
      votesByRental[vote.rentalId].downvotes.push(voterInfo);
    }
  });

  // Convert to array and sort by total votes
  return Object.values(votesByRental)
    .map(rental => ({
      ...rental,
      totalVotes: rental.upvotes.length + rental.downvotes.length,
      netVotes: rental.upvotes.length - rental.downvotes.length
    }))
    .sort((a, b) => b.totalVotes - a.totalVotes);
}