import React from 'react';
import './Wizard.css';

function Wizard({ steps, currentStep, onStepChange, onSubmit, onCancel, children }) {
  const canGoNext = currentStep < steps.length - 1;
  const canGoPrev = currentStep > 0;

  const handleNext = () => {
    if (canGoNext) {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      onStepChange(currentStep - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="wizard">
      {/* Progress indicator */}
      <div className="wizard-progress">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className={`wizard-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}>
              <div className="wizard-step-number">
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="wizard-step-label">{step.label}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`wizard-step-line ${index < currentStep ? 'completed' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="wizard-content">
        {children}
      </div>

      {/* Navigation buttons */}
      <div className="wizard-navigation">
        {currentStep === 0 ? (
          <button
            type="button"
            className="wizard-button wizard-button-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="wizard-button wizard-button-secondary"
            onClick={handlePrev}
            disabled={!canGoPrev}
          >
            ← Previous
          </button>
        )}
        <div className="wizard-step-indicator">
          Step {currentStep + 1} of {steps.length}
        </div>
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            className="wizard-button wizard-button-primary"
            onClick={handleNext}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            className="wizard-button wizard-button-primary"
            onClick={handleSubmit}
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export default Wizard;

