import React from 'react';
import './FormProgress.css';

function FormProgress({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="form-progress" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="progress-text">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}

export default FormProgress;

