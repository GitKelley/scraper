import React from 'react';
import LodgingCard from './LodgingCard';
import './LodgingGrid.css';

function LodgingGrid({ options, loading, onAddNew, onRentalClick, onVote }) {
  if (loading) {
    return <div className="loading">Loading lodging options...</div>;
  }

  if (options.length === 0) {
    return (
      <div className="lodging-grid-container">
        <div className="empty-state">
          <p>No lodging options yet. Add your first rental!</p>
          <button className="new-page-button" onClick={onAddNew}>
            <span className="new-page-icon">+</span>
            <span>Add Rental</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lodging-grid-container">
      <div className="lodging-grid">
        {options.map((option) => (
          <LodgingCard
            key={option.id}
            option={option}
            onRentalClick={onRentalClick}
            onVote={onVote}
          />
        ))}
        
        <button className="new-page-button" onClick={onAddNew}>
          <span className="new-page-icon">+</span>
          <span>New page</span>
        </button>
      </div>
    </div>
  );
}

export default LodgingGrid;

