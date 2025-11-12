import React from 'react';
import './FloatingActionButton.css';

function FloatingActionButton({ onClick, label, icon = '+' }) {
  return (
    <button 
      className="fab" 
      onClick={onClick}
      aria-label={label || 'Add new item'}
    >
      <span className="fab-icon">{icon}</span>
      <span className="fab-label">{label}</span>
    </button>
  );
}

export default FloatingActionButton;

