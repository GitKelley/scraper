import React, { useState, useEffect } from 'react';
import './LandingPage.css';

function LandingPage({ onLogin, onSignUp }) {
  const [headerImage, setHeaderImage] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchHeaderImage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings/header-image`);
        if (response.ok) {
          const data = await response.json();
          if (data.headerImage) {
            setHeaderImage(data.headerImage);
          }
        }
      } catch (error) {
        console.error('Error fetching header image:', error);
      }
    };
    fetchHeaderImage();
  }, [API_BASE_URL]);

  return (
    <div className="landing-page">
      <div className="landing-container">
        {headerImage && (
          <div className="landing-hero-card">
            <img 
              src={headerImage}
              alt="Trip hero"
              className="landing-hero-image"
            />
          </div>
        )}
        
        <div className="landing-content">
          <h1 className="landing-title">Kelley 2026 New Years Trip</h1>
          
          <div className="landing-actions">
            <button className="landing-button login-button" onClick={onLogin}>
              Log In
            </button>
            <button className="landing-button signup-button" onClick={onSignUp}>
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

