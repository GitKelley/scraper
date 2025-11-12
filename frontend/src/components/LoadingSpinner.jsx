import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ size = 'medium', inline = false }) {
  const sizeClass = `spinner-${size}`;
  const containerClass = inline ? 'spinner-inline' : 'spinner-container';
  
  return (
    <div className={containerClass}>
      <div className={`spinner ${sizeClass}`} aria-label="Loading">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
    </div>
  );
}

export default LoadingSpinner;

