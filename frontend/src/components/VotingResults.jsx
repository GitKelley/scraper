import React from 'react';
import LodgingCard from './LodgingCard';
import SkeletonLoader from './SkeletonLoader';
import './VotingResults.css';

function VotingResults({ results, loading, onRentalClick, onVote }) {
  if (loading) {
    return <SkeletonLoader type="card" count={6} />;
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
          <LodgingCard
            key={rental.id}
            option={rental}
            onRentalClick={onRentalClick}
            onVote={onVote}
            showVoteDetails={true}
          />
        ))}
      </div>
    </div>
  );
}

export default VotingResults;

