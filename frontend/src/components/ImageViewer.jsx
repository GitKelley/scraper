import React, { useState, useEffect, useCallback } from 'react';
import './ImageViewer.css';

function ImageViewer({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose}>×</button>
        
        {images.length > 1 && (
          <>
            <button className="image-viewer-nav image-viewer-prev" onClick={handlePrevious}>
              ‹
            </button>
            <button className="image-viewer-nav image-viewer-next" onClick={handleNext}>
              ›
            </button>
            <div className="image-viewer-counter">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        <div className="image-viewer-image-container">
          <img 
            src={currentImage} 
            alt={`Image ${currentIndex + 1}`}
            className="image-viewer-image"
          />
        </div>

        {images.length > 1 && (
          <div className="image-viewer-thumbnails">
            {images.map((img, index) => (
              <div
                key={index}
                className={`image-viewer-thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >
                <img src={img} alt={`Thumbnail ${index + 1}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageViewer;

