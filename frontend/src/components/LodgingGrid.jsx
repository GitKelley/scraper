import React, { useState, useMemo } from 'react';
import LodgingCard from './LodgingCard';
import SkeletonLoader from './SkeletonLoader';
import FilterSortBar from './FilterSortBar';
import './LodgingGrid.css';

function LodgingGrid({ options, loading, onAddNew, onRentalClick, onVote }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');

  const filteredAndSorted = useMemo(() => {
    let result = [...options];
    
    // Filter
    if (filter !== 'all') {
      result = result.filter(option => option.source === filter);
    }
    
    // Sort
    if (sort === 'price-low') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-high') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'votes') {
      result.sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA;
      });
    }
    
    return result;
  }, [options, filter, sort]);

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'VRBO', label: 'VRBO' },
    { value: 'Airbnb', label: 'Airbnb' }
  ];

  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'votes', label: 'Most Votes' }
  ];
  if (loading) {
    return <SkeletonLoader type="card" count={6} />;
  }

  if (options.length === 0) {
    return (
      <div className="lodging-grid-container">
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3 className="empty-state-title">No rentals yet</h3>
          <p className="empty-state-message">Start planning your trip by adding your first rental property.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lodging-grid-container">
      {options.length > 0 && (
        <FilterSortBar
          onFilterChange={setFilter}
          onSortChange={setSort}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        />
      )}
      <div className="lodging-grid">
        {filteredAndSorted.map((option) => (
          <LodgingCard
            key={option.id}
            option={option}
            onRentalClick={onRentalClick}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
}

export default LodgingGrid;

