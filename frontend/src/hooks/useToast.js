import { useState, useCallback, useRef } from 'react';

let toastIdCounter = 0;
const MAX_TOASTS = 3; // Maximum number of toasts to show at once
const DEBOUNCE_TIME = 500; // Milliseconds to wait before allowing duplicate toast

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', timestamp: 0 });

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const now = Date.now();
    const lastToast = lastToastRef.current;
    
    // Prevent duplicate toasts within debounce time
    if (lastToast.message === message && (now - lastToast.timestamp) < DEBOUNCE_TIME) {
      return null;
    }
    
    lastToastRef.current = { message, timestamp: now };
    
    const id = toastIdCounter++;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => {
      // Limit the number of toasts
      const updated = [...prev, newToast];
      if (updated.length > MAX_TOASTS) {
        // Remove oldest toast
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning
  };
}

