import React, { useState, useMemo } from 'react';
import ActivityCard from './ActivityCard';
import SkeletonLoader from './SkeletonLoader';
import FilterSortBar from './FilterSortBar';
import './ActivityGrid.css';

function ActivityGrid({ activities, loading, onAddNew, onActivityClick, onVote }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');

  const filteredAndSorted = useMemo(() => {
    let result = [...activities];
    
    // Filter by category
    if (filter !== 'all') {
      result = result.filter(activity => activity.category === filter);
    }
    
    // Sort
    if (sort === 'votes') {
      result.sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA;
      });
    } else if (sort === 'name') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    
    return result;
  }, [activities, filter, sort]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(activities.map(a => a.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [activities]);

  const filterOptions = [
    { value: 'all', label: 'All' },
    ...categories.map(cat => ({ value: cat, label: cat }))
  ];

  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'votes', label: 'Most Votes' }
  ];
  if (loading) {
    return <SkeletonLoader type="card" count={6} />;
  }

  if (activities.length === 0) {
    return (
      <div className="activity-grid-container">
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">No activities yet</h3>
          <p className="empty-state-message">Add fun activities and experiences to make your trip memorable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-grid-container">
      {activities.length > 0 && (
        <FilterSortBar
          onFilterChange={setFilter}
          onSortChange={setSort}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        />
      )}
      <div className="activity-grid">
        {filteredAndSorted.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onActivityClick={onActivityClick}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
}

export default ActivityGrid;

