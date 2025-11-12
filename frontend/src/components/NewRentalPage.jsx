import React, { useState, useRef } from 'react';
import './NewRentalPage.css';

function NewRentalPage({ onSave, onCancel, isModal = true }) {
  const [mode, setMode] = useState(null); // null = choice screen, 'import' = import from URL, 'create' = create from scratch
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
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
      // Reset file input
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

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    setIsImporting(true);
    try {
      // Call onSave with the URL - it will scrape it
      await onSave(importUrl.trim(), null);
      // onSave will handle closing the modal and error handling
    } catch (error) {
      // Only log error if it's a final failure (not a retry in progress)
      const errorMessage = error.message || error.toString() || '';
      if (!errorMessage.includes('retrying') && !errorMessage.includes('Attempt')) {
        console.error('Error importing rental:', error);
      }
      setIsImporting(false);
      // Re-throw so App.jsx can handle the error display
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare rental data
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

    // Save manually entered data
    try {
      await onSave(null, rentalData);
    } catch (error) {
      console.error('Error saving rental:', error);
    }
  };

  // Choice screen - show when mode is null
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

  // Import mode - show URL input
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
                    placeholder="Enter VRBO or Airbnb URL (e.g., https://www.vrbo.com/... or https://www.airbnb.com/rooms/...)"
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
                onClick={() => {
                  setMode(null);
                  setImportUrl('');
                  setIsImporting(false);
                }}
                disabled={isImporting}
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
            onCancel();
          }
        }}>
          {importContent}
        </div>
      );
    }
    return importContent;
  }

  // Create mode - show the full form (existing behavior)
  if (mode !== 'create') {
    return null; // Should not reach here, but just in case
  }

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

        <div className="page-properties">
        <div className="property-row">
          <div className="property-item">
            <div className="property-label">
              <span className="property-icon">☀️</span>
              Status
            </div>
            <div className="property-value">
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="property-select"
              >
                <option value="Idea">Idea</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Booked">Booked</option>
              </select>
            </div>
          </div>

          <div className="property-item">
            <div className="property-label">
              <span className="property-icon">📷</span>
              Cost
            </div>
            <div className="property-value">
              <input
                type="number"
                placeholder="Enter price"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="property-input"
              />
            </div>
          </div>
        </div>

        <div className="property-row">
          <div className="property-item">
            <div className="property-label">
              <span className="property-icon">🎯</span>
              Booking Type
            </div>
            <div className="property-value">
              <select
                value={formData.bookingType}
                onChange={(e) => handleInputChange('bookingType', e.target.value)}
                className="property-select"
              >
                <option value="Lodging">Lodging</option>
                <option value="Activity">Activity</option>
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
                placeholder="Enter VRBO or Airbnb URL (optional)"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="property-input"
              />
            </div>
          </div>
        </div>

        <div className="property-row">
          <div className="property-item full-width">
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
        </div>

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

        <div className="property-row">
          <div className="property-item full-width">
            <div className="property-label">
              <span className="property-icon">📝</span>
              Title
            </div>
            <div className="property-value">
              <input
                type="text"
                placeholder="Enter rental title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="property-input title-input"
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
                rows="6"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="page-footer">
        <div className="footer-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="save-btn" onClick={handleSubmit}>
            Save Rental
          </button>
        </div>
      </div>
      </div>
    </div>
  );

  // If modal, wrap in overlay
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

