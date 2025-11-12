import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';
import LodgingGrid from './components/LodgingGrid';
import ActivityGrid from './components/ActivityGrid';
import VotingResults from './components/VotingResults';
import RentalDetailModal from './components/RentalDetailModal';
import ActivityDetailModal from './components/ActivityDetailModal';
import NewRentalPage from './components/NewRentalPage';
import NewActivityPage from './components/NewActivityPage';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import Sidebar from './components/Sidebar';
import FloatingActionButton from './components/FloatingActionButton';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const { toasts, removeToast, success, error, info } = useToast();
  const [user, setUser] = useState(null);
  const [showLanding, setShowLanding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('lodging');
  const [lodgingOptions, setLodgingOptions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [votingResults, setVotingResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showNewPage, setShowNewPage] = useState(false);
  const [showNewActivityPage, setShowNewActivityPage] = useState(false);

  // Check for user in localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        // User is already logged in, don't show landing page
        setShowLanding(false);
      } catch (e) {
        console.error('Error parsing user data:', e);
        localStorage.removeItem('user');
        // No valid user, show landing page
        setShowLanding(true);
      }
    } else {
      // No user found, show landing page
      setShowLanding(true);
    }
  }, []);

  // Fetch data from API
  useEffect(() => {
    if (activeTab === 'lodging') {
      fetchLodgingOptions();
    } else if (activeTab === 'activities') {
      fetchActivities();
    } else if (activeTab === 'votes') {
      fetchVotingResults();
    }
  }, [activeTab]);

  const fetchLodgingOptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lodging-options`);
      if (response.ok) {
        const data = await response.json();
        setLodgingOptions(data || []);
      }
    } catch (error) {
      console.error('Error fetching lodging options:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVotingResults = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/voting-results`);
      if (response.ok) {
        const data = await response.json();
        // Ensure results are sorted by net votes (most to least)
        const sorted = (data || []).sort((a, b) => {
          const netA = (a.netVotes || (a.upvotes || 0) - (a.downvotes || 0));
          const netB = (b.netVotes || (b.upvotes || 0) - (b.downvotes || 0));
          return netB - netA; // Descending order (most votes first)
        });
        setVotingResults(sorted);
      }
    } catch (error) {
      console.error('Error fetching voting results:', error);
    }
  };

  const handleVote = async (rentalId, voteType) => {
    if (!user) {
      info('Please sign up to vote');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/lodging-options/${rentalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType, userId: user.id })
      });
      
      if (response.ok) {
        const voteData = await response.json();
        const newUpvotes = voteData.votes?.upvotes ?? 0;
        const newDownvotes = voteData.votes?.downvotes ?? 0;
        const newNetVotes = newUpvotes - newDownvotes;
        
        // Optimistically update voting results if on votes tab
        if (activeTab === 'votes') {
          setVotingResults(prev => {
            return prev.map(item => {
              if (item.id === rentalId) {
                return {
                  ...item,
                  upvotes: newUpvotes,
                  downvotes: newDownvotes,
                  netVotes: newNetVotes
                };
              }
              return item;
            }).sort((a, b) => {
              const netA = a.netVotes || (a.upvotes || 0) - (a.downvotes || 0);
              const netB = b.netVotes || (b.upvotes || 0) - (b.downvotes || 0);
              return netB - netA;
            });
          });
        }
        
        // Update lodging options list without full refresh
        setLodgingOptions(prev => {
          return prev.map(item => {
            if (item.id === rentalId) {
              return {
                ...item,
                upvotes: newUpvotes,
                downvotes: newDownvotes
              };
            }
            return item;
          });
        });
        
        // Update selected rental if it's the one being voted on
        if (selectedRental && selectedRental.id === rentalId) {
          setSelectedRental(prev => ({
            ...prev,
            upvotes: newUpvotes,
            downvotes: newDownvotes
          }));
        }
        // Don't show toast for votes - UI updates optimistically
        return true;
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Failed to vote');
        return false;
      }
    } catch (err) {
      console.error('Error voting:', err);
      error('Failed to vote. Please try again.');
      return false;
    }
  };

  const handleActivityVote = async (activityId, voteType) => {
    if (!user) {
      info('Please sign up to vote');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/activities/${activityId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType, userId: user.id })
      });
      
      if (response.ok) {
        const voteData = await response.json();
        const newUpvotes = voteData.votes?.upvotes ?? 0;
        const newDownvotes = voteData.votes?.downvotes ?? 0;
        
        // Update activities list without full refresh
        setActivities(prev => {
          return prev.map(item => {
            if (item.id === activityId) {
              return {
                ...item,
                upvotes: newUpvotes,
                downvotes: newDownvotes
              };
            }
            return item;
          });
        });
        
        // Update selected activity if it's the one being voted on
        if (selectedActivity && selectedActivity.id === activityId) {
          setSelectedActivity(prev => ({
            ...prev,
            upvotes: newUpvotes,
            downvotes: newDownvotes
          }));
        }
        
        // Update voting results if on votes tab
        if (activeTab === 'votes') {
          fetchVotingResults();
        }
        // Don't show toast for votes - UI updates optimistically
        return true;
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Failed to vote');
        return false;
      }
    } catch (err) {
      console.error('Error voting on activity:', err);
      error('Failed to vote. Please try again.');
      return false;
    }
  };

  const handleSaveRental = async (url, manualData) => {
    try {
      let savedRental;
      
      // If URL is provided, scrape it first, then merge with manual data
      if (url) {
        const response = await fetch(`${API_BASE_URL}/api/scrape-rental`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          savedRental = data.rental;
          
          // Merge manual data with scraped data (manual data takes precedence)
          if (manualData && savedRental) {
            savedRental = {
              ...savedRental,
              ...manualData,
              // Merge images arrays
              images: manualData.images && manualData.images.length > 0 
                ? [...(savedRental.images || []), ...manualData.images]
                : savedRental.images
            };
            
            // Update the rental with merged data
            const updateResponse = await fetch(`${API_BASE_URL}/api/lodging-options/${savedRental.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(savedRental)
            });
            
            if (updateResponse.ok) {
              const updated = await updateResponse.json();
              savedRental = updated;
            }
          }
        } else {
          const error = await response.json();
          // If Airbnb redirected, provide helpful message
          if (error.redirected) {
            throw new Error('Airbnb is blocking automated access. Please use "Create from Scratch" to manually enter the rental details, or try again later.');
          }
          throw new Error(error.message || 'Failed to scrape rental');
        }
      } else {
        // Save manually entered data
        const response = await fetch(`${API_BASE_URL}/api/lodging-options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manualData)
        });
        
        if (response.ok) {
          const data = await response.json();
          savedRental = data;
        } else {
          let errorMessage = 'Failed to save rental';
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
          } catch (e) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
      }
      
      setShowNewPage(false);
      fetchLodgingOptions();
      success('Rental added successfully!');
      
      // Open the newly created rental
      if (savedRental) {
        setSelectedRental(savedRental);
      }
    } catch (err) {
      console.error('Error saving rental:', err);
      const errorMessage = err.message || err.toString() || 'Unknown error';
      
      // Don't show error if it's just a retry in progress (backend handles retries internally)
      // Only show error if it's a final failure
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('connection')) {
        error(`Connection failed. Please make sure the backend server is running on ${API_BASE_URL}`);
      } else if (!errorMessage.includes('retrying') && !errorMessage.includes('Attempt')) {
        // Only show error if it's not a retry message
        error(`Failed to save rental: ${errorMessage}`);
      }
    }
  };

  const handleSaveActivity = async (url, manualData) => {
    try {
      // Save manually entered activity data (no scraping for activities)
      const response = await fetch(`${API_BASE_URL}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowNewActivityPage(false);
        fetchActivities();
        success('Activity added successfully!');
        
        // Open the newly created activity
        if (data) {
          setSelectedActivity(data);
        }
      } else {
        let errorMessage = 'Failed to save activity';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error saving activity:', err);
      const errorMessage = err.message || err.toString() || 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('connection')) {
        error(`Connection failed. Please make sure the backend server is running on ${API_BASE_URL}`);
      } else {
        error(`Failed to save activity: ${errorMessage}`);
      }
    }
  };

  const handleSignUp = (userData) => {
    setUser(userData);
    setShowSignUp(false);
    setShowLanding(false);
    success('Account created successfully!');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setShowLogin(false);
    setShowLanding(false);
    success('Welcome back!');
  };

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowLanding(true);
  };

  // Show landing page if no user
  if (showLanding && !user) {
    return (
      <LandingPage 
        onLogin={() => {
          setShowLanding(false);
          setShowLogin(true);
        }}
        onSignUp={() => {
          setShowLanding(false);
          setShowSignUp(true);
        }}
      />
    );
  }

  // Show login page
  if (showLogin && !user) {
    return (
      <LoginPage 
        onLogin={handleLogin}
        onBack={() => {
          setShowLogin(false);
          setShowLanding(true);
        }}
      />
    );
  }

  // Show sign-up page
  if (showSignUp && !user) {
    return (
      <SignUpPage 
        onSignUp={handleSignUp}
        onBack={() => {
          setShowSignUp(false);
          setShowLanding(true);
        }}
      />
    );
  }

  return (
    <div className="app">
      <Header user={user} onSignOut={handleSignOut} />
      <div className="app-content">
        <div className="main-content">
          <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {activeTab === 'lodging' && (
            <LodgingGrid 
              options={lodgingOptions} 
              loading={loading}
              onAddNew={() => setShowNewPage(true)}
              onRentalClick={(rental) => setSelectedRental(rental)}
              onVote={handleVote}
            />
          )}
          
          {activeTab === 'activities' && (
            <ActivityGrid 
              activities={activities} 
              loading={loading}
              onAddNew={() => setShowNewActivityPage(true)}
              onActivityClick={(activity) => setSelectedActivity(activity)}
              onVote={handleActivityVote}
            />
          )}
          
          {activeTab === 'votes' && (
            <VotingResults 
              results={votingResults}
              loading={loading}
              onRentalClick={(rental) => setSelectedRental(rental)}
              onVote={handleVote}
            />
          )}
        </div>
        
        <Sidebar />
      </div>
      
      {/* Floating Action Button - Mobile optimized */}
      {user && activeTab !== 'votes' && (
        <FloatingActionButton
          onClick={() => {
            if (activeTab === 'lodging') {
              setShowNewPage(true);
            } else if (activeTab === 'activities') {
              setShowNewActivityPage(true);
            }
          }}
          label={activeTab === 'lodging' ? 'Add Rental' : 'Add Activity'}
          icon="+"
        />
      )}
      
      {selectedRental && (
        <RentalDetailModal
          rental={selectedRental}
          onClose={() => setSelectedRental(null)}
          onVote={handleVote}
          onDelete={(id) => {
            setLodgingOptions(prev => prev.filter(r => r.id !== id));
            setSelectedRental(null);
            if (activeTab === 'votes') {
              fetchVotingResults();
            }
            success('Rental deleted successfully');
          }}
          user={user}
        />
      )}
      
      {showNewPage && (
        <NewRentalPage
          onSave={handleSaveRental}
          onCancel={() => setShowNewPage(false)}
          isModal={true}
        />
      )}

      {showNewActivityPage && (
        <NewActivityPage
          onSave={handleSaveActivity}
          onCancel={() => setShowNewActivityPage(false)}
          isModal={true}
        />
      )}

      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onVote={handleActivityVote}
          onDelete={(id) => {
            setActivities(prev => prev.filter(a => a.id !== id));
            setSelectedActivity(null);
            if (activeTab === 'votes') {
              fetchVotingResults();
            }
            success('Activity deleted successfully');
          }}
          user={user}
        />
      )}
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
