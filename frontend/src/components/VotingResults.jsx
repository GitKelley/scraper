import React, { useState, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import VoteDetailsModal from './VoteDetailsModal';
import './VotingResults.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function VotingResults({ results, loading, onRentalClick, onVote, onRefresh }) {
  const [voteDetails, setVoteDetails] = useState({});
  const [selectedRental, setSelectedRental] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!loading && results.length > 0) {
      fetchVoteDetails();
    }
  }, [results, loading]);

  const fetchVoteDetails = async () => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vote-details`);
      if (response.ok) {
        const details = await response.json();
        // Convert array to object keyed by rentalId for easy lookup
        const detailsMap = {};
        details.forEach(rental => {
          detailsMap[rental.rentalId] = rental;
        });
        setVoteDetails(detailsMap);
      }
    } catch (error) {
      console.error('Error fetching vote details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRentalClick = (rental) => {
    setSelectedRental(rental);
  };

  const handleCloseModal = () => {
    setSelectedRental(null);
  };

  const getNetVotes = (rental) => {
    return (rental.upvotes || 0) - (rental.downvotes || 0);
  };

  const getTotalVotes = (rental) => {
    return (rental.upvotes || 0) + (rental.downvotes || 0);
  };

  const handleClearAllVotes = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    setClearing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/votes/clear-all`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setShowClearConfirm(false);
        // Refresh the voting results
        if (onRefresh) {
          onRefresh();
        }
        // Refresh vote details
        fetchVoteDetails();
      } else {
        console.error('Failed to clear votes');
      }
    } catch (error) {
      console.error('Error clearing votes:', error);
    } finally {
      setClearing(false);
    }
  };

  const hasAnyVotes = results.some(rental => {
    const totalVotes = getTotalVotes(rental);
    return totalVotes > 0;
  });

  if (loading) {
    return <SkeletonLoader type="card" count={6} />;
  }

  if (results.length === 0) {
    return (
      <div className="voting-results-empty">
        <div className="voting-results-empty-icon">📊</div>
        <p>No voting results yet. Start voting on rentals!</p>
      </div>
    );
  }

  return (
    <div className="voting-results">
      {hasAnyVotes && (
        <div className="voting-results-actions">
          {!showClearConfirm ? (
            <button 
              className="clear-votes-btn"
              onClick={handleClearAllVotes}
              title="Clear all votes for tie breaker"
            >
              <span>🗑️</span>
              <span>Clear All Votes</span>
            </button>
          ) : (
            <div className="clear-votes-confirm">
              <span className="confirm-text">Are you sure? This will delete all votes.</span>
              <div className="confirm-buttons">
                <button 
                  className="confirm-btn confirm-yes"
                  onClick={handleClearAllVotes}
                  disabled={clearing}
                >
                  {clearing ? 'Clearing...' : 'Yes, Clear All'}
                </button>
                <button 
                  className="confirm-btn confirm-no"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="voting-results-list">
        {results.slice(0, 3).map((rental, index) => {
          const details = voteDetails[rental.id];
          const netVotes = getNetVotes(rental);
          const totalVotes = getTotalVotes(rental);
          const hasVotes = totalVotes > 0;
          const coverImage = rental.images && rental.images.length > 0 ? rental.images[0] : null;
          
          return (
            <div 
              key={rental.id} 
              className={`voting-result-item ${hasVotes ? 'has-votes' : ''}`}
              onClick={() => hasVotes && handleRentalClick(rental)}
            >
              <div className="voting-result-rank">
                <span className="rank-number">#{index + 1}</span>
              </div>
              
              <div className="voting-result-image">
                {coverImage ? (
                  <img src={coverImage} alt={rental.title} />
                ) : (
                  <div className="voting-result-image-placeholder">
                    <span>🏠</span>
                  </div>
                )}
              </div>
              
              <div className="voting-result-info">
                <h3 className="voting-result-title">{rental.title}</h3>
                {rental.location && (
                  <p className="voting-result-location">{rental.location}</p>
                )}
                {rental.price && (
                  <p className="voting-result-price">${rental.price.toLocaleString()}</p>
                )}
              </div>
              
              <div className="voting-result-stats">
                {hasVotes ? (
                  <>
                    <div className="voting-result-stat-group">
                      <div className="voting-result-stat upvote-stat">
                        <span className="stat-icon">↑</span>
                        <span className="stat-value">{rental.upvotes || 0}</span>
                      </div>
                      <div className="voting-result-stat downvote-stat">
                        <span className="stat-icon">↓</span>
                        <span className="stat-value">{rental.downvotes || 0}</span>
                      </div>
                    </div>
                    <div className={`voting-result-net ${netVotes >= 0 ? 'positive' : 'negative'}`}>
                      {netVotes >= 0 ? '+' : ''}{netVotes}
                    </div>
                    <div className="voting-result-action">
                      <span className="action-text">View Details</span>
                      <span className="action-arrow">→</span>
                    </div>
                  </>
                ) : (
                  <div className="voting-result-no-votes">
                    <span>No votes yet</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedRental && voteDetails[selectedRental.id] && (
        <VoteDetailsModal
          rental={selectedRental}
          voteDetails={voteDetails[selectedRental.id]}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default VotingResults;

