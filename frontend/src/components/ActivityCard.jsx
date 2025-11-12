import React from 'react';
import './ActivityCard.css';

function ActivityCard({ activity, onActivityClick, onVote }) {
  const {
    id,
    title,
    images,
    category,
    cost,
    duration,
    location,
    upvotes = 0,
    downvotes = 0
  } = activity;

  // Use first image as cover photo
  const coverImage = images && images.length > 0 ? images[0] : null;

  const handleCardClick = () => {
    if (onActivityClick) {
      onActivityClick(activity);
    }
  };

  const handleVoteClick = (e, voteType) => {
    e.stopPropagation(); // Prevent card click
    if (onVote) {
      onVote(id, voteType);
    }
  };

  const formatCost = (cost) => {
    if (!cost) return 'N/A';
    if (typeof cost === 'string') {
      // Handle $, $$, $$$ format
      if (cost.startsWith('$')) return cost;
      // Handle numeric strings
      const num = parseFloat(cost);
      if (!isNaN(num)) return `$${num.toLocaleString()}`;
      return cost;
    }
    if (typeof cost === 'number') {
      return `$${cost.toLocaleString()}`;
    }
    return cost;
  };

  return (
    <div className="activity-card" onClick={handleCardClick}>
      <div className="card-image-container">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={title}
            className="card-image"
          />
        ) : (
          <div className="card-image-placeholder">
            <span className="sr-only">No image available</span>
          </div>
        )}
        {images && images.length > 1 && (
          <div className="image-count-badge">
            {images.length} photos
          </div>
        )}
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        
        <div className="card-tags">
          {category && (
            <span className="card-tag">
              {category}
            </span>
          )}
          {duration && (
            <span className="card-tag">
              ⏱️ {duration}
            </span>
          )}
        </div>
        
        {location && (
          <div className="card-location">📍 {location}</div>
        )}
        
        <div className="card-footer">
          <div className="card-cost">
            {formatCost(cost)}
          </div>
          <div className="vote-buttons">
            <button className="upvote-button" onClick={(e) => handleVoteClick(e, 'upvote')}>
              <span className="upvote-icon">↑</span>
              {upvotes > 0 && <span className="upvote-count">{upvotes}</span>}
            </button>
            <button className="downvote-button" onClick={(e) => handleVoteClick(e, 'downvote')}>
              <span className="downvote-icon">↓</span>
              {downvotes > 0 && <span className="downvote-count">{downvotes}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityCard;

