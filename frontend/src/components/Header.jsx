import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Header.css';

function Header({ user, onSignOut }) {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('user');
      if (onSignOut) {
        onSignOut();
      }
    }
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  return (
    <>
      <header className="header">
        <div className="header-top">
          <div className="header-left">
            <h1 className="header-title">
              <span className="title-main">Kelley 2026 New Years Trip</span>
            </h1>
          </div>
          <div className="header-right">
            {user && (
              <span className="header-user">Welcome, {user.name}!</span>
            )}
            <div className="settings-container" ref={settingsRef}>
              <button 
                className="header-button settings-button" 
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                ⚙️
              </button>
              {showSettings && (
                <div className="settings-dropdown">
                  <div className="settings-header">Settings</div>
                  <div className="settings-item">
                    <label className="settings-label">
                      <span>Theme</span>
                      <button 
                        className="theme-toggle"
                        onClick={toggleTheme}
                      >
                        {theme === 'dark' ? '🌙' : '☀️'} {theme === 'dark' ? 'Dark' : 'Light'}
                      </button>
                    </label>
                  </div>
                </div>
              )}
            </div>
            {user && (
              <button className="header-button sign-out-button" onClick={handleSignOut}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;

