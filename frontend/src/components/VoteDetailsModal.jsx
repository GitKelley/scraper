import React from 'react';
import './VoteDetailsModal.css';

function VoteDetailsModal({ rental, voteDetails, onClose }) {
  if (!voteDetails) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const upvotes = voteDetails.upvotes || [];
  const downvotes = voteDetails.downvotes || [];
  const totalVotes = upvotes.length + downvotes.length;
  const netVotes = upvotes.length - downvotes.length;

  return (
    <div className="vote-details-modal-overlay" onClick={onClose}>
      <div className="vote-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vote-details-modal-header">
          <div className="vote-details-modal-title-section">
            <h2 className="vote-details-modal-title">{rental.title || 'Rental Details'}</h2>
            {rental.location && (
              <p className="vote-details-modal-location">{rental.location}</p>
            )}
          </div>
          <button className="vote-details-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="vote-details-modal-content">
          {/* Vote Summary */}
          <div className="vote-summary-section">
            <div className="vote-summary-stats">
              <div className="vote-summary-stat">
                <div className="vote-summary-stat-value positive">{upvotes.length}</div>
                <div className="vote-summary-stat-label">Upvotes</div>
              </div>
              <div className="vote-summary-stat">
                <div className="vote-summary-stat-value negative">{downvotes.length}</div>
                <div className="vote-summary-stat-label">Downvotes</div>
              </div>
              <div className="vote-summary-stat highlight">
                <div className="vote-summary-stat-value">{netVotes >= 0 ? '+' : ''}{netVotes}</div>
                <div className="vote-summary-stat-label">Net Votes</div>
              </div>
              <div className="vote-summary-stat">
                <div className="vote-summary-stat-value">{totalVotes}</div>
                <div className="vote-summary-stat-label">Total Votes</div>
              </div>
            </div>
          </div>

          {/* Vote Breakdown */}
          <div className="vote-breakdown-section">
            {upvotes.length > 0 && (
              <div className="vote-breakdown-category">
                <div className="vote-breakdown-header upvote-header">
                  <div className="vote-breakdown-icon upvote-icon">↑</div>
                  <h3 className="vote-breakdown-title">Upvotes ({upvotes.length})</h3>
                </div>
                <div className="vote-breakdown-list">
                  {upvotes.map((voter, index) => (
                    <div key={`upvote-${voter.userId}-${index}`} className="vote-breakdown-item">
                      <div className="vote-breakdown-item-avatar">
                        <span>{voter.name?.[0]?.toUpperCase() || voter.username[0]?.toUpperCase()}</span>
                      </div>
                      <div className="vote-breakdown-item-info">
                        <div className="vote-breakdown-item-name">{voter.name || voter.username}</div>
                        <div className="vote-breakdown-item-username">@{voter.username}</div>
                      </div>
                      <div className="vote-breakdown-item-time">{formatDate(voter.voteDate)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {downvotes.length > 0 && (
              <div className="vote-breakdown-category">
                <div className="vote-breakdown-header downvote-header">
                  <div className="vote-breakdown-icon downvote-icon">↓</div>
                  <h3 className="vote-breakdown-title">Downvotes ({downvotes.length})</h3>
                </div>
                <div className="vote-breakdown-list">
                  {downvotes.map((voter, index) => (
                    <div key={`downvote-${voter.userId}-${index}`} className="vote-breakdown-item">
                      <div className="vote-breakdown-item-avatar">
                        <span>{voter.name?.[0]?.toUpperCase() || voter.username[0]?.toUpperCase()}</span>
                      </div>
                      <div className="vote-breakdown-item-info">
                        <div className="vote-breakdown-item-name">{voter.name || voter.username}</div>
                        <div className="vote-breakdown-item-username">@{voter.username}</div>
                      </div>
                      <div className="vote-breakdown-item-time">{formatDate(voter.voteDate)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalVotes === 0 && (
              <div className="vote-breakdown-empty">
                <p>No votes yet. Be the first to vote!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoteDetailsModal;

