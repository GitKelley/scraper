import React from 'react';
import './LodgingCard.css';

function LodgingCard({ option, onRentalClick, onVote, showVoteDetails = false }) {
  const {
    id,
    title,
    images,
    price,
    source,
    bedrooms,
    bathrooms,
    sleeps,
    location,
    upvotes = 0,
    downvotes = 0,
    netVotes
  } = option;
  
  // Calculate netVotes if not provided
  const calculatedNetVotes = netVotes !== undefined ? netVotes : (upvotes - downvotes);

  // Use first image as cover photo
  const coverImage = images && images.length > 0 ? images[0] : null;

  const handleCardClick = () => {
    if (onRentalClick) {
      onRentalClick(option);
    }
  };

  const handleVoteClick = (e, voteType) => {
    e.stopPropagation(); // Prevent card click
    if (onVote) {
      onVote(id, voteType);
    }
  };

  return (
    <div className="lodging-card" onClick={handleCardClick}>
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
          <span className="card-tag">
            {source === 'VRBO' ? '🏠' : '🏡'} {source || 'Rental'}
          </span>
        </div>
        
        <div className="card-details">
          {bedrooms && <span>{bedrooms} bed</span>}
          {bathrooms && <span>{bathrooms} bath</span>}
          {sleeps && <span>Sleeps {sleeps}</span>}
        </div>
        
        {location && (
          <div className="card-location">{location}</div>
        )}
        
        <div className="card-footer">
          <div className="card-price">
            ${price?.toLocaleString() || 'N/A'}
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
        
        {showVoteDetails && (
          <div className="card-vote-details">
            <div className="card-vote-visual">
              <div className="card-vote-bar-container">
                <div 
                  className="card-vote-bar card-upvote-bar" 
                  style={{ 
                    width: `${upvotes > 0 || downvotes > 0 
                      ? ((upvotes || 0) / ((upvotes || 0) + (downvotes || 0))) * 100 
                      : 0}%` 
                  }}
                ></div>
                <div 
                  className="card-vote-bar card-downvote-bar" 
                  style={{ 
                    width: `${upvotes > 0 || downvotes > 0 
                      ? ((downvotes || 0) / ((upvotes || 0) + (downvotes || 0))) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="card-vote-stats">
              <div className="card-vote-stat card-upvote-stat">
                <span className="card-vote-icon">↑</span>
                <span className="card-vote-count">{upvotes || 0}</span>
              </div>
              <div className="card-vote-stat card-downvote-stat">
                <span className="card-vote-icon">↓</span>
                <span className="card-vote-count">{downvotes || 0}</span>
              </div>
              <div className="card-vote-stat card-net-vote-stat">
                <span className="card-vote-label">Net:</span>
                <span className={`card-vote-count ${calculatedNetVotes >= 0 ? 'positive' : 'negative'}`}>
                  {calculatedNetVotes >= 0 ? '+' : ''}{calculatedNetVotes}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LodgingCard;

