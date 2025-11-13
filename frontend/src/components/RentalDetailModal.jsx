import React, { useState, useEffect } from 'react';
import './RentalDetailModal.css';
import ImageViewer from './ImageViewer';

function RentalDetailModal({ rental, onClose, onVote, onDelete, user }) {
  const [voteCounts, setVoteCounts] = useState({
    upvotes: rental.upvotes || 0,
    downvotes: rental.downvotes || 0
  });
  const [isVoting, setIsVoting] = useState(false);
  const [userVote, setUserVote] = useState(null); // Track user's current vote
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const images = rental.images || [];
  const coverImage = images[0] || null;
  
  const amenities = rental.amenities || [];
  const MAX_AMENITIES_PREVIEW = 10;
  const displayedAmenities = showAllAmenities ? amenities : amenities.slice(0, MAX_AMENITIES_PREVIEW);
  const hasMoreAmenities = amenities.length > MAX_AMENITIES_PREVIEW;

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleImageClick = (index = 0) => {
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  const handleThumbnailClick = (index) => {
    handleImageClick(index);
  };

  const handleVote = async (voteType) => {
    if (onVote && !isVoting) {
      // Prevent duplicate votes
      if (userVote === voteType) {
        return; // User already voted this way
      }

      setIsVoting(true);
      
      // Store previous counts for rollback
      const previousCounts = { ...voteCounts };
      const previousVote = userVote;
      
      // Optimistically update the counts
      setVoteCounts(prev => {
        let newCounts = { ...prev };
        
        // Remove previous vote if switching
        if (previousVote === 'upvote') {
          newCounts.upvotes = Math.max(0, newCounts.upvotes - 1);
        } else if (previousVote === 'downvote') {
          newCounts.downvotes = Math.max(0, newCounts.downvotes - 1);
        }
        
        // Add new vote
        if (voteType === 'upvote') {
          newCounts.upvotes = newCounts.upvotes + 1;
        } else {
          newCounts.downvotes = newCounts.downvotes + 1;
        }
        
        return newCounts;
      });
      
      setUserVote(voteType);
      
      try {
        // Call the vote handler (it will update the rental prop)
        const success = await onVote(rental.id, voteType);
        
        if (!success) {
          // Revert optimistic update on failure
          setVoteCounts(previousCounts);
          setUserVote(previousVote);
        }
      } catch (error) {
        // Revert optimistic update on error
        setVoteCounts(previousCounts);
        setUserVote(previousVote);
      } finally {
        setIsVoting(false);
      }
    }
  };

  // Update vote counts when rental prop changes
  React.useEffect(() => {
    setVoteCounts({
      upvotes: rental.upvotes || 0,
      downvotes: rental.downvotes || 0
    });
  }, [rental.upvotes, rental.downvotes]);

  // Fetch comments when modal opens
  useEffect(() => {
    fetchComments();
  }, [rental.id]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(`${API_BASE_URL}/api/comments/${rental.id}/rental`);
      if (response.ok) {
        const data = await response.json();
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      alert('Please sign in to add comments');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: rental.id,
          itemType: 'rental',
          userId: user.id,
          userName: user.name,
          text: newComment.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-actions">
          <button className="modal-delete" onClick={async () => {
            if (window.confirm('Are you sure you want to delete this rental? This action cannot be undone.')) {
              try {
                const response = await fetch(`${API_BASE_URL}/api/rentals/${rental.id}`, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  if (onDelete) onDelete(rental.id);
                  onClose();
                } else {
                  alert('Failed to delete rental');
                }
              } catch (error) {
                console.error('Error deleting rental:', error);
                alert('Failed to delete rental. Please try again.');
              }
            }
          }} title="Delete rental" aria-label="Delete rental">
            🗑️
          </button>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        <div className="modal-content-inner">
          <div className="modal-header">
          {coverImage && (
            <div 
              className="modal-cover-image" 
              onClick={() => handleImageClick(0)}
              style={{ cursor: 'pointer' }}
            >
              <img src={coverImage} alt={rental.title} />
              {images.length > 1 && (
                <div className="image-view-hint">
                  Click to view all images
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-body">
          <h1 className="modal-title">{rental.title}</h1>
          
          <div className="modal-meta">
            <div className="meta-item">
              <span className="meta-label">Source:</span>
              <span className="meta-value">{rental.source || 'Unknown'}</span>
            </div>
            {rental.price && (
              <div className="meta-item">
                <span className="meta-label">Price:</span>
                <span className="meta-value">${rental.price.toLocaleString()}</span>
              </div>
            )}
            {rental.bedrooms && (
              <div className="meta-item">
                <span className="meta-label">Bedrooms:</span>
                <span className="meta-value">{rental.bedrooms}</span>
              </div>
            )}
            {rental.bathrooms && (
              <div className="meta-item">
                <span className="meta-label">Bathrooms:</span>
                <span className="meta-value">{rental.bathrooms}</span>
              </div>
            )}
            {rental.sleeps && (
              <div className="meta-item">
                <span className="meta-label">Sleeps:</span>
                <span className="meta-value">{rental.sleeps}</span>
              </div>
            )}
            {rental.location && (
              <div className="meta-item">
                <span className="meta-label">Location:</span>
                <span className="meta-value">{rental.location}</span>
              </div>
            )}
          </div>

          {rental.description && (
            <div className="modal-description">
              <h2>Description</h2>
              <p>{rental.description}</p>
            </div>
          )}

          {amenities.length > 0 && (
            <div className="modal-amenities">
              <h2>Amenities ({amenities.length})</h2>
              <div className="amenities-list">
                {displayedAmenities.map((amenity, index) => (
                  <span key={index} className="amenity-tag">
                    {amenity}
                  </span>
                ))}
              </div>
              {hasMoreAmenities && (
                <button 
                  className="amenities-expand-btn"
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  aria-label={showAllAmenities ? 'Show fewer amenities' : 'Show all amenities'}
                >
                  {showAllAmenities 
                    ? `Show Less (${MAX_AMENITIES_PREVIEW})` 
                    : `Show All (${amenities.length - MAX_AMENITIES_PREVIEW} more)`}
                </button>
              )}
            </div>
          )}

          {images.length > 1 && (
            <div className="modal-image-gallery">
              <h2>All Photos ({images.length})</h2>
              <div className="thumbnail-grid">
                {images.slice(0, 3).map((image, index) => (
                  <div
                    key={index}
                    className="thumbnail"
                    onClick={() => handleThumbnailClick(index)}
                  >
                    <img src={image} alt={`${rental.title} - Photo ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <div className="vote-buttons">
              <button 
                className={`vote-btn upvote ${userVote === 'upvote' ? 'active' : ''} ${isVoting ? 'disabled' : ''}`}
                onClick={() => handleVote('upvote')}
                disabled={isVoting}
              >
                <span>↑</span> Upvote ({voteCounts.upvotes})
              </button>
              <button 
                className={`vote-btn downvote ${userVote === 'downvote' ? 'active' : ''} ${isVoting ? 'disabled' : ''}`}
                onClick={() => handleVote('downvote')}
                disabled={isVoting}
              >
                <span>↓</span> Downvote ({voteCounts.downvotes})
              </button>
            </div>
            {rental.url && (
              <a href={rental.url} target="_blank" rel="noopener noreferrer" className="view-original-btn">
                View Original Listing
              </a>
            )}
          </div>

          <div className="modal-comments">
            <h2 className="comments-heading">Comments ({comments.length})</h2>
            {user && (
              <div className="comment-input">
                <div className="comment-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddComment();
                    }
                  }}
                  className="comment-field"
                />
                <button 
                  type="button"
                  onClick={handleAddComment}
                  className="comment-submit-btn"
                  disabled={!newComment.trim()}
                >
                  Post
                </button>
              </div>
            )}
            {!user && (
              <div className="comment-signin-prompt">
                Please sign in to add comments
              </div>
            )}
            <div className="comments-list">
              {loadingComments ? (
                <div className="comments-loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="comments-empty">No comments yet. Be the first to comment!</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar-small">
                      {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{comment.userName}</span>
                        <span className="comment-date">{formatDate(comment.createdAt)}</span>
                      </div>
                      <div className="comment-text">{comment.text}</div>
                      {user && user.id === comment.userId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="comment-delete-btn"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      {showImageViewer && images.length > 0 && (
        <ImageViewer
          images={images}
          initialIndex={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}

export default RentalDetailModal;

