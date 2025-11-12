import React, { useState } from 'react';
import './FormField.css';

function FormField({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  required = false,
  placeholder,
  validation,
  ...props 
}) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleBlur = () => {
    setTouched(true);
    if (validation) {
      const validationError = validation(value);
      setLocalError(validationError);
    }
  };

  const handleChange = (e) => {
    onChange(e);
    if (touched && validation) {
      const validationError = validation(e.target.value);
      setLocalError(validationError);
    }
  };

  const displayError = error || (touched && localError);

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-field-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`form-field-input ${displayError ? 'error' : ''}`}
        aria-invalid={!!displayError}
        aria-describedby={displayError ? `${name}-error` : undefined}
        {...props}
      />
      {displayError && (
        <div id={`${name}-error`} className="form-field-error" role="alert">
          {displayError}
        </div>
      )}
    </div>
  );
}

export default FormField;

