import React, { useState, useRef } from 'react';
import Wizard from './Wizard';
import './NewActivityPage.css';

function NewActivityPage({ onSave, onCancel, isModal = true }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    cost: '',
    duration: '',
    bestTime: '',
    difficulty: '',
    groupSize: '',
    bookingRequired: 'No',
    url: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    images: [],
    status: 'Idea'
  });
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef(null);

  const wizardSteps = [
    { label: 'Basic Info' },
    { label: 'Details' },
    { label: 'Contact & Images' },
    { label: 'Notes' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()]
      }));
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const activityData = {
      title: formData.title || 'Untitled Activity',
      description: formData.description || null,
      location: formData.location || null,
      category: formData.category || null,
      cost: formData.cost || null,
      duration: formData.duration || null,
      bestTime: formData.bestTime || null,
      difficulty: formData.difficulty || null,
      groupSize: formData.groupSize || null,
      bookingRequired: formData.bookingRequired || 'No',
      url: formData.url || null,
      contactPhone: formData.contactPhone || null,
      contactEmail: formData.contactEmail || null,
      notes: formData.notes || null,
      images: formData.images.length > 0 ? formData.images : null,
      status: formData.status
    };

    try {
      await onSave(null, activityData);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Basic Information</h2>
            <p className="wizard-step-description">Start by entering the activity title and category</p>
            
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📝</span>
                  Title *
                </div>
                <div className="property-value">
                  <input
                    type="text"
                    placeholder="Enter activity title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="property-input title-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📂</span>
                  Category
                </div>
                <div className="property-value">
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select category</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Indoor">Indoor</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Nature">Nature</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📄</span>
                  Description
                </div>
                <div className="property-value">
                  <textarea
                    placeholder="Describe the activity..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="property-textarea"
                    rows="6"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Details
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Activity Details</h2>
            <p className="wizard-step-description">Tell us about the activity's logistics and requirements</p>
            
            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">💰</span>
                  Cost
                </div>
                <div className="property-value" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <select
                    value={formData.cost && ['Free', '$', '$$', '$$$'].includes(formData.cost) ? formData.cost : ''}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select cost</option>
                    <option value="Free">Free</option>
                    <option value="$">$ (Budget-friendly)</option>
                    <option value="$$">$$ (Moderate)</option>
                    <option value="$$$">$$$ (Expensive)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter specific price"
                    value={formData.cost && !['Free', '$', '$$', '$$$'].includes(formData.cost) ? formData.cost : ''}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">⏱️</span>
                  Duration
                </div>
                <div className="property-value">
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select duration</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2-3 hours">2-3 hours</option>
                    <option value="Half day">Half day</option>
                    <option value="Full day">Full day</option>
                    <option value="Multiple days">Multiple days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🌅</span>
                  Best Time
                </div>
                <div className="property-value">
                  <select
                    value={formData.bestTime}
                    onChange={(e) => handleInputChange('bestTime', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select time</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Anytime">Anytime</option>
                  </select>
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">💪</span>
                  Difficulty
                </div>
                <div className="property-value">
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Hard">Hard</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">👥</span>
                  Group Size
                </div>
                <div className="property-value">
                  <select
                    value={formData.groupSize}
                    onChange={(e) => handleInputChange('groupSize', e.target.value)}
                    className="property-select"
                  >
                    <option value="">Select group size</option>
                    <option value="1-2">1-2 people</option>
                    <option value="3-5">3-5 people</option>
                    <option value="6-10">6-10 people</option>
                    <option value="10+">10+ people</option>
                  </select>
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">📅</span>
                  Booking Required
                </div>
                <div className="property-value">
                  <select
                    value={formData.bookingRequired}
                    onChange={(e) => handleInputChange('bookingRequired', e.target.value)}
                    className="property-select"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📍</span>
                  Location
                </div>
                <div className="property-value">
                  <input
                    type="text"
                    placeholder="Enter location or address"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Contact & Images
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Contact & Images</h2>
            <p className="wizard-step-description">Add contact information and photos</p>
            
            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🔗</span>
                  Website URL
                </div>
                <div className="property-value">
                  <input
                    type="url"
                    placeholder="Enter website URL (optional)"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">📞</span>
                  Contact Phone
                </div>
                <div className="property-value">
                  <input
                    type="tel"
                    placeholder="Enter phone number (optional)"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">✉️</span>
                  Contact Email
                </div>
                <div className="property-value">
                  <input
                    type="email"
                    placeholder="Enter email (optional)"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">🖼️</span>
                  Images
                </div>
                <div className="property-value">
                  <div className="image-section">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                    />
                    <div className="image-upload-section">
                      <button 
                        type="button" 
                        onClick={handleImageClick} 
                        className="add-image-btn"
                      >
                        📷 Upload Images
                      </button>
                    </div>
                    <div className="image-url-section">
                      <div className="image-url-label">Or enter image URL:</div>
                      <div className="image-input-group">
                        <input
                          type="url"
                          placeholder="Enter image URL"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="property-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddImage();
                            }
                          }}
                        />
                        <button type="button" onClick={handleAddImage} className="add-image-btn">
                          Add URL
                        </button>
                      </div>
                    </div>
                    {formData.images.length > 0 && (
                      <div className="image-list">
                        {formData.images.map((img, index) => (
                          <div key={index} className="image-item">
                            <img src={img} alt={`Image ${index + 1}`} />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="remove-image-btn"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Notes
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Additional Notes</h2>
            <p className="wizard-step-description">Share why you think this activity would be fun for the group</p>
            
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">💭</span>
                  Why I'm Suggesting This
                </div>
                <div className="property-value">
                  <textarea
                    placeholder="Share why you think this activity would be fun for the group..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="property-textarea"
                    rows="8"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="new-activity-page">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Add New Activity</h1>
        </div>

        <Wizard
          steps={wizardSteps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onSubmit={handleSubmit}
        >
          {renderStepContent()}
        </Wizard>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="new-activity-page-modal" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}>
        {content}
      </div>
    );
  }

  return content;
}

export default NewActivityPage;
