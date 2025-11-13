import React, { useState, useRef, useEffect } from 'react';
import Wizard from './Wizard';
import './NewRentalPage.css';

function NewRentalPage({ onSave, onCancel, isModal = true }) {
  const [mode, setMode] = useState(null); // null = choice screen, 'import' = import from URL, 'create' = create from scratch
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    source: 'VRBO',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sleeps: '',
    location: '',
    description: '',
    images: [],
    status: 'Idea',
    bookingType: 'Lodging'
  });
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef(null);

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (isModal && mode !== null) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [isModal, mode]);

  const wizardSteps = [
    { label: 'Basic Info' },
    { label: 'Details' },
    { label: 'Pricing & Images' },
    { label: 'Description' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            setFormData(prev => ({
              ...prev,
              images: [...prev.images, dataUrl]
            }));
          };
          reader.readAsDataURL(file);
        }
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const extractUrl = (text) => {
    if (!text || !text.trim()) {
      return null;
    }
    
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
      let url = matches[0];
      url = url.replace(/[.,;:!?]+$/, '');
      url = url.replace(/[)\]}]$/, '');
      return url.trim();
    }
    
    const domainRegex = /(?:www\.)?(?:vrbo|airbnb)\.com\/[^\s<>"{}|\\^`\[\]]+/gi;
    const domainMatches = text.match(domainRegex);
    
    if (domainMatches && domainMatches.length > 0) {
      let url = domainMatches[0];
      url = url.replace(/[.,;:!?]+$/, '');
      url = url.replace(/[)\]}]$/, '');
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      return url.trim();
    }
    
    return null;
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    const extractedUrl = extractUrl(importUrl);
    if (!extractedUrl) {
      alert('No valid URL found. Please enter a VRBO or Airbnb link');
      return;
    }

    if (extractedUrl !== importUrl.trim()) {
      setImportUrl(extractedUrl);
    }

    setIsImporting(true);
    try {
      await onSave(extractedUrl, null);
    } catch (error) {
      const errorMessage = error.message || error.toString() || '';
      if (!errorMessage.includes('retrying') && !errorMessage.includes('Attempt')) {
        console.error('Error importing rental:', error);
      }
      setIsImporting(false);
      throw error;
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleCancel = () => {
    setIsImporting(false);
    setImportUrl('');
    setMode(null);
    setCurrentStep(0);
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const rentalData = {
      title: formData.title || 'Untitled Rental',
      url: formData.url || '',
      source: formData.source,
      price: formData.price ? parseFloat(formData.price) : null,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      sleeps: formData.sleeps ? parseInt(formData.sleeps) : null,
      location: formData.location || null,
      description: formData.description || null,
      images: formData.images.length > 0 ? formData.images : null,
      status: formData.status,
      bookingType: formData.bookingType
    };

    try {
      await onSave(null, rentalData);
    } catch (error) {
      console.error('Error saving rental:', error);
    }
  };

  // Choice screen
  if (mode === null) {
    const choiceContent = (
      <div className="new-rental-page">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Add New Rental</h1>
          </div>

          <div className="choice-screen">
            <div className="choice-options">
              <button
                type="button"
                className="choice-btn import-btn"
                onClick={() => setMode('import')}
              >
                <div className="choice-icon">🔗</div>
                <div className="choice-title">Import from URL</div>
                <div className="choice-description">Paste a VRBO or Airbnb link to automatically import the rental details</div>
              </button>

              <button
                type="button"
                className="choice-btn create-btn"
                onClick={() => setMode('create')}
              >
                <div className="choice-icon">✏️</div>
                <div className="choice-title">Create from Scratch</div>
                <div className="choice-description">Manually enter all rental information</div>
              </button>
            </div>

            <div className="page-footer">
              <div className="footer-actions">
                <button type="button" className="cancel-btn" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (isModal) {
      return (
        <div className="new-rental-page-modal" onClick={(e) => {
          if (e.target === e.currentTarget) {
            onCancel();
          }
        }}>
          {choiceContent}
        </div>
      );
    }
    return choiceContent;
  }

  // Import mode
  if (mode === 'import') {
    const importContent = (
      <div className="new-rental-page">
        <div className="page-content">
          <div className="page-header">
            <button
              type="button"
              className="back-btn"
              onClick={() => setMode(null)}
            >
              ← Back
            </button>
            <h1 className="page-title">Import from URL</h1>
          </div>

          <div className="import-section">
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">🔗</span>
                  Rental URL
                </div>
                <div className="property-value">
                  <input
                    type="url"
                    placeholder="Enter VRBO or Airbnb URL"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="property-input title-input"
                    disabled={isImporting}
                  />
                </div>
                <div className="property-hint">
                  Paste the full URL from VRBO or Airbnb. The rental details will be automatically imported.
                </div>
              </div>
            </div>

            {isImporting && (
              <div className="importing-indicator">
                <div className="spinner"></div>
                <div>Importing rental details...</div>
              </div>
            )}
          </div>

          <div className="page-footer">
            <div className="footer-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={false}
              >
                Cancel
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={handleImportSubmit}
                disabled={isImporting || !importUrl.trim()}
              >
                {isImporting ? 'Importing...' : 'Import Rental'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    if (isModal) {
      return (
        <div className="new-rental-page-modal" onClick={(e) => {
          if (e.target === e.currentTarget && !isImporting) {
            handleCancel();
          }
        }}>
          {importContent}
        </div>
      );
    }
    return importContent;
  }

  // Create mode - Wizard
  if (mode !== 'create') {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Basic Information</h2>
            <p className="wizard-step-description">Start by entering the rental title and source</p>
            
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📝</span>
                  Title *
                </div>
                <div className="property-value">
                  <input
                    type="text"
                    placeholder="Enter rental title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="property-input title-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🏠</span>
                  Source
                </div>
                <div className="property-value">
                  <select
                    value={formData.source}
                    onChange={(e) => handleInputChange('source', e.target.value)}
                    className="property-select"
                  >
                    <option value="VRBO">VRBO</option>
                    <option value="Airbnb">Airbnb</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🔗</span>
                  Rental URL
                </div>
                <div className="property-value">
                  <input
                    type="url"
                    placeholder="Optional"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Details
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Property Details</h2>
            <p className="wizard-step-description">Tell us about the property's capacity and location</p>
            
            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🛏️</span>
                  Bedrooms
                </div>
                <div className="property-value">
                  <input
                    type="number"
                    placeholder="Enter number"
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">🚿</span>
                  Bathrooms
                </div>
                <div className="property-value">
                  <input
                    type="number"
                    placeholder="Enter number"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>

            <div className="property-row">
              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">👤</span>
                  Sleeps
                </div>
                <div className="property-value">
                  <input
                    type="number"
                    placeholder="Enter number"
                    value={formData.sleeps}
                    onChange={(e) => handleInputChange('sleeps', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>

              <div className="property-item">
                <div className="property-label">
                  <span className="property-icon">📍</span>
                  Location
                </div>
                <div className="property-value">
                  <input
                    type="text"
                    placeholder="Enter location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="property-input"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Pricing & Images
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Pricing & Images</h2>
            <p className="wizard-step-description">Add pricing information and photos</p>
            
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">💰</span>
                  Price
                </div>
                <div className="property-value">
                  <input
                    type="number"
                    placeholder="Enter price per night"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
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

      case 3: // Description
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-step-title">Description</h2>
            <p className="wizard-step-description">Add any additional details about the rental</p>
            
            <div className="property-row">
              <div className="property-item full-width">
                <div className="property-label">
                  <span className="property-icon">📄</span>
                  Description
                </div>
                <div className="property-value">
                  <textarea
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
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
    <div className="new-rental-page">
      <div className="page-content">
        <div className="page-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => setMode(null)}
          >
            ← Back
          </button>
          <h1 className="page-title">Create from Scratch</h1>
        </div>

        <Wizard
          steps={wizardSteps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        >
          {renderStepContent()}
        </Wizard>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="new-rental-page-modal" onClick={(e) => {
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

export default NewRentalPage;
