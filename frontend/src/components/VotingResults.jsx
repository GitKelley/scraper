import React from 'react';
import LodgingCard from './LodgingCard';
import './VotingResults.css';

function VotingResults({ results, loading, onRentalClick, onVote }) {
  if (loading) {
    return <div className="loading">Loading voting results...</div>;
  }

  if (results.length === 0) {
    return (
      <div className="voting-results-empty">
        <p>No voting results yet. Start voting on rentals!</p>
      </div>
    );
  }

  return (
    <div className="voting-results">
      <div className="voting-results-header">
        <h2>All Vote Results</h2>
        <p className="results-count">{results.length} rentals sorted by net votes</p>
      </div>
      
      <div className="voting-results-grid">
        {results.map((rental) => (
          <div key={rental.id} className="voting-result-item">
            <LodgingCard
              option={rental}
              onRentalClick={onRentalClick}
              onVote={onVote}
            />
            <div className="vote-summary">
              <div className="vote-stat upvote-stat">
                <span className="vote-icon">↑</span>
                <span className="vote-count">{rental.upvotes || 0}</span>
              </div>
              <div className="vote-stat downvote-stat">
                <span className="vote-icon">↓</span>
                <span className="vote-count">{rental.downvotes || 0}</span>
              </div>
              <div className="vote-stat net-vote-stat">
                <span className="vote-label">Net:</span>
                <span className={`vote-count ${rental.netVotes >= 0 ? 'positive' : 'negative'}`}>
                  {rental.netVotes >= 0 ? '+' : ''}{rental.netVotes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VotingResults;

