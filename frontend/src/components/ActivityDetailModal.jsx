import React, { useState, useEffect } from 'react';
import './ActivityDetailModal.css';
import ImageViewer from './ImageViewer';

function ActivityDetailModal({ activity, onClose, onVote, onDelete, user }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [voteCounts, setVoteCounts] = useState({
    upvotes: activity.upvotes || 0,
    downvotes: activity.downvotes || 0
  });
  const [isVoting, setIsVoting] = useState(false);
  const [userVote, setUserVote] = useState(null); // Track user's current vote
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const images = activity.images || [];
  const coverImage = images[0] || null;
  const currentImage = images[currentImageIndex] || coverImage;

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleImageClick = (index = 0) => {
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  const handleThumbnailClick = (index) => {
    handleImageClick(index);
  };

  const handlePreviousImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
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
        // Call the vote handler (it will update the activity prop)
        const success = await onVote(activity.id, voteType);
        
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

  // Update vote counts when activity prop changes
  useEffect(() => {
    setVoteCounts({
      upvotes: activity.upvotes || 0,
      downvotes: activity.downvotes || 0
    });
  }, [activity.upvotes, activity.downvotes]);

  // Fetch comments when modal opens
  useEffect(() => {
    fetchComments();
  }, [activity.id]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(`${API_BASE_URL}/api/comments/${activity.id}/activity`);
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
          itemId: activity.id,
          itemType: 'activity',
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

  const formatCost = (cost) => {
    if (!cost) return 'N/A';
    if (typeof cost === 'string') {
      if (cost.startsWith('$')) return cost;
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-actions">
          <button className="modal-delete" onClick={async () => {
            if (window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
              try {
                const response = await fetch(`${API_BASE_URL}/api/activities/${activity.id}`, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  if (onDelete) onDelete(activity.id);
                  onClose();
                } else {
                  alert('Failed to delete activity');
                }
              } catch (error) {
                console.error('Error deleting activity:', error);
                alert('Failed to delete activity. Please try again.');
              }
            }
          }} title="Delete activity">
            🗑️
          </button>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content-inner">
          <div className="modal-header">
          {currentImage && (
            <div className="modal-cover-image">
              <img src={currentImage} alt={activity.title} />
              {images.length > 1 && (
                <>
                  <button className="image-nav prev" onClick={handlePreviousImage}>‹</button>
                  <button className="image-nav next" onClick={handleNextImage}>›</button>
                  <div className="image-counter">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-body">
          <h1 className="modal-title">{activity.title}</h1>
          
          <div className="modal-meta">
            {activity.category && (
              <div className="meta-item">
                <span className="meta-label">Category:</span>
                <span className="meta-value">{activity.category}</span>
              </div>
            )}
            {activity.cost && (
              <div className="meta-item">
                <span className="meta-label">Cost:</span>
                <span className="meta-value">{formatCost(activity.cost)}</span>
              </div>
            )}
            {activity.duration && (
              <div className="meta-item">
                <span className="meta-label">Duration:</span>
                <span className="meta-value">{activity.duration}</span>
              </div>
            )}
            {activity.bestTime && (
              <div className="meta-item">
                <span className="meta-label">Best Time:</span>
                <span className="meta-value">{activity.bestTime}</span>
              </div>
            )}
            {activity.difficulty && (
              <div className="meta-item">
                <span className="meta-label">Difficulty:</span>
                <span className="meta-value">{activity.difficulty}</span>
              </div>
            )}
            {activity.groupSize && (
              <div className="meta-item">
                <span className="meta-label">Group Size:</span>
                <span className="meta-value">{activity.groupSize}</span>
              </div>
            )}
            {activity.bookingRequired && (
              <div className="meta-item">
                <span className="meta-label">Booking Required:</span>
                <span className="meta-value">{activity.bookingRequired === 'Yes' ? 'Yes' : 'No'}</span>
              </div>
            )}
            {activity.location && (
              <div className="meta-item">
                <span className="meta-label">Location:</span>
                <span className="meta-value">{activity.location}</span>
              </div>
            )}
            {activity.contactPhone && (
              <div className="meta-item">
                <span className="meta-label">Phone:</span>
                <span className="meta-value">{activity.contactPhone}</span>
              </div>
            )}
            {activity.contactEmail && (
              <div className="meta-item">
                <span className="meta-label">Email:</span>
                <span className="meta-value">{activity.contactEmail}</span>
              </div>
            )}
          </div>

          {activity.description && (
            <div className="modal-description">
              <h2>Description</h2>
              <p>{activity.description}</p>
            </div>
          )}

          {activity.notes && (
            <div className="modal-notes">
              <h2>Why I'm Suggesting This</h2>
              <p>{activity.notes}</p>
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
                    <img src={image} alt={`${activity.title} - Photo ${index + 1}`} />
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
            {activity.url && (
              <a href={activity.url} target="_blank" rel="noopener noreferrer" className="view-original-btn">
                Visit Website
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
    </div>
  );
}

export default ActivityDetailModal;

