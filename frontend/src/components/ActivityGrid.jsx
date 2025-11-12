import React from 'react';
import ActivityCard from './ActivityCard';
import './ActivityGrid.css';

function ActivityGrid({ activities, loading, onAddNew, onActivityClick, onVote }) {
  if (loading) {
    return <div className="loading">Loading activities...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="activity-grid-container">
        <div className="empty-state">
          <p>No activities yet. Add your first activity!</p>
          <button className="new-page-button" onClick={onAddNew}>
            <span className="new-page-icon">+</span>
            <span>Add Activity</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-grid-container">
      <div className="activity-grid">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onActivityClick={onActivityClick}
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

export default ActivityGrid;

