import React from 'react';
import './NavigationTabs.css';

function NavigationTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'lodging', label: 'Lodging Options', shortLabel: 'Lodging', icon: '🏠' },
    { id: 'activities', label: 'Activity Planning', shortLabel: 'Activities', icon: '🎯' },
    { id: 'votes', label: 'All Vote Results', shortLabel: 'Votes', icon: '📊' }
  ];

  return (
    <div className="navigation-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          aria-label={tab.label}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          <span className="tab-label-short">{tab.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}

export default NavigationTabs;

