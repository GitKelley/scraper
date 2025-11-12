import React, { useState } from 'react';
import './SignUpPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function SignUpPage({ onSignUp, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!username.trim() || !password.trim() || !name.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          name: name.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));

        // Call the callback to update parent component
        if (onSignUp) {
          onSignUp(data.user);
        }
      } else {
        setError(data.error || 'Failed to sign up');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <h1 className="signup-title">Welcome!</h1>
          <p className="signup-subtitle">Create an account to get started</p>
        </div>
        
        <form onSubmit={handleSubmit} className="signup-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username (min 3 characters)"
              className="form-input"
              autoFocus
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 characters)"
              className="form-input"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              required
            />
          </div>
          
          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="signup-note">
          Your account will be saved securely. No email verification required!
        </p>
      </div>
    </div>
  );
}

export default SignUpPage;
