import React, { useState } from 'react';
import './FilterSortBar.css';

function FilterSortBar({ onFilterChange, onSortChange, filterOptions = [], sortOptions = [] }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('default');

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  const handleSortChange = (sort) => {
    setActiveSort(sort);
    if (onSortChange) {
      onSortChange(sort);
    }
  };

  return (
    <div className="filter-sort-bar">
      {filterOptions.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Filter:</span>
          <div className="filter-buttons">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`filter-button ${activeFilter === option.value ? 'active' : ''}`}
                onClick={() => handleFilterChange(option.value)}
                aria-pressed={activeFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {sortOptions.length > 0 && (
        <div className="sort-group">
          <span className="sort-label">Sort:</span>
          <select
            className="sort-select"
            value={activeSort}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sort options"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default FilterSortBar;

