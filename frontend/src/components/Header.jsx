import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Header.css';

function Header({ user, onSignOut }) {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const settingsRef = useRef(null);
  const userMenuRef = useRef(null);

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('user');
      if (onSignOut) {
        onSignOut();
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showSettings || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showUserMenu]);

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-icon">🎉</div>
          <h1 className="header-title">
            <span className="title-main">Kelley 2026</span>
            <span className="title-subtitle">New Years Trip</span>
          </h1>
        </div>

        {user && (
          <div className="header-actions">
            <div className="settings-container" ref={settingsRef}>
              <button 
                className="icon-button" 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowUserMenu(false);
                }}
                aria-label="Settings"
                title="Settings"
              >
                ⚙️
              </button>
              {showSettings && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">Settings</div>
                  <div className="dropdown-item">
                    <div className="dropdown-item-label">
                      {theme === 'dark' ? (
                        <span style={{ fontSize: '16px', lineHeight: 1 }}>🌙</span>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="8" r="3"/>
                          <path d="M8 1v1M8 14v1M15 8h-1M2 8H1M13.5 2.5l-.7.7M3.2 12.8l-.7.7M13.5 13.5l-.7-.7M3.2 3.2l-.7-.7"/>
                        </svg>
                      )}
                      <span>Theme</span>
                    </div>
                    <button 
                      className="theme-switch"
                      onClick={toggleTheme}
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      <div className={`switch-track ${theme === 'dark' ? 'dark' : 'light'}`}>
                        <div className="switch-thumb"></div>
                      </div>
                      <span className="switch-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu-container" ref={userMenuRef}>
              <button 
                className="user-avatar-button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowSettings(false);
                }}
                aria-label="User menu"
                title={user.name}
              >
                <div className="user-avatar">
                  {getUserInitials(user.name)}
                </div>
              </button>
              {showUserMenu && (
                <div className="dropdown-menu user-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info">
                      <div className="user-avatar-small">
                        {getUserInitials(user.name)}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email || 'No email'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item-button"
                    onClick={handleSignOut}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 12l4-4-4-4M14 8H6"/>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

