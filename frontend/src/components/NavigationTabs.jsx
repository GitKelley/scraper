import React from 'react';
import './NavigationTabs.css';

function NavigationTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'lodging', label: 'Lodging Options', icon: '✓' },
    { id: 'activities', label: 'Activity Planning', icon: null },
    { id: 'votes', label: 'All Vote Results', icon: null }
  ];

  return (
    <div className="navigation-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {activeTab === tab.id && tab.icon && (
            <span className="tab-icon">{tab.icon}</span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default NavigationTabs;

