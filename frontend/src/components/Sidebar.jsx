import React, { useState, useEffect } from 'react';
import './Sidebar.css';

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    // Target date: December 30, 2025
    const targetDate = new Date('2025-12-30T00:00:00');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        setTimeRemaining({
          years: 0,
          months: 0,
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        return;
      }
      
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
      const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
      const weeks = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24 * 7));
      const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ years, months, weeks, days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch weather for Asheville, NC
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using OpenWeatherMap API (free tier)
        // API key must be set as VITE_OPENWEATHER_API_KEY environment variable
        const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
        
        if (!API_KEY) {
          console.warn('OpenWeatherMap API key not set. Using fallback weather data.');
          setWeather({
            name: 'Asheville',
            main: { temp: 45, feels_like: 42, humidity: 65 },
            weather: [{ main: 'Clouds', description: 'partly cloudy' }],
            wind: { speed: 8 }
          });
          setWeatherLoading(false);
          return;
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Asheville,NC,US&units=imperial&appid=${API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('Weather data received:', data);
          setWeather(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Weather API error:', response.status, errorData);
          // Fallback to sample weather if API fails
          setWeather({
            name: 'Asheville',
            main: { temp: 45, feels_like: 42, humidity: 65 },
            weather: [{ main: 'Clouds', description: 'partly cloudy' }],
            wind: { speed: 8 }
          });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Fallback weather data
        setWeather({
          name: 'Asheville',
          main: { temp: 45, feels_like: 42, humidity: 65 },
          weather: [{ main: 'Clouds', description: 'partly cloudy' }],
          wind: { speed: 8 }
        });
      } finally {
        setWeatherLoading(false);
      }
    };
    
    fetchWeather();
  }, []);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <path 
            d="M7.5 9L4.5 6L7.5 3" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {!isCollapsed && (
        <>
        <div className="sidebar-section">
        <h3 className="sidebar-title">KELLEY 2025 NEW YEARS TRIP</h3>
        <div className="countdown">
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.years).padStart(2, '0')}</div>
            <div className="countdown-label">Years</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.months).padStart(2, '0')}</div>
            <div className="countdown-label">Month</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.weeks).padStart(2, '0')}</div>
            <div className="countdown-label">Weeks</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.days).padStart(2, '0')}</div>
            <div className="countdown-label">Days</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.hours).padStart(2, '0')}</div>
            <div className="countdown-label">Hours</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.minutes).padStart(2, '0')}</div>
            <div className="countdown-label">Minutes</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeRemaining.seconds).padStart(2, '0')}</div>
            <div className="countdown-label">Seconds</div>
          </div>
        </div>
        <div className="countdown-footer">to go</div>
      </div>
      
      {/* Weather Widget */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Weather - Asheville, NC</h3>
        {weatherLoading ? (
          <div className="widget-loading">
            <div className="weather-spinner"></div>
            <span>Loading weather...</span>
          </div>
        ) : weather ? (
          <div className="weather-widget">
            <div className="weather-main">
              <div className="weather-temp">
                {typeof weather.main?.temp === 'number' 
                  ? Math.round(weather.main.temp) 
                  : weather.main?.temp || '--'}°F
              </div>
              <div className="weather-desc">
                {weather.weather?.[0]?.main || 'N/A'}
              </div>
            </div>
            <div className="weather-details">
              <div className="weather-detail">
                <span className="weather-label">Feels like:</span>
                <span className="weather-value">
                  {typeof weather.main?.feels_like === 'number'
                    ? Math.round(weather.main.feels_like)
                    : weather.main?.feels_like || '--'}°F
                </span>
              </div>
              <div className="weather-detail">
                <span className="weather-label">Humidity:</span>
                <span className="weather-value">{weather.main?.humidity || '--'}%</span>
              </div>
              <div className="weather-detail">
                <span className="weather-label">Wind:</span>
                <span className="weather-value">
                  {typeof weather.wind?.speed === 'number'
                    ? Math.round(weather.wind.speed)
                    : weather.wind?.speed || '--'} mph
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Google Map Widget */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Location - Asheville, NC</h3>
        <div className="map-widget">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d207444.4734884498!2d-82.641487!3d35.5951!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88598b5e8b8e0b1f%3A0x5b0b0b0b0b0b0b0b!2sAsheville%2C%20NC!5e0!3m2!1sen!2sus!4v1699123456789!5m2!1sen!2sus"
            width="100%"
            height="200"
            style={{ border: 0, borderRadius: '12px' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Asheville, NC Map"
          ></iframe>
        </div>
      </div>
      </>
      )}
    </aside>
  );
}

export default Sidebar;

