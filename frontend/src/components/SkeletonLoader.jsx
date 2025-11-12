import React from 'react';
import './SkeletonLoader.css';

function SkeletonLoader({ type = 'card', count = 6 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);
  
  if (type === 'card') {
    return (
      <div className="skeleton-grid">
        {skeletons.map((index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-tag"></div>
              <div className="skeleton-line skeleton-details"></div>
              <div className="skeleton-footer">
                <div className="skeleton-line skeleton-price"></div>
                <div className="skeleton-buttons">
                  <div className="skeleton-button"></div>
                  <div className="skeleton-button"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="skeleton-list">
      {skeletons.map((index) => (
        <div key={index} className="skeleton-item">
          <div className="skeleton-line"></div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonLoader;

