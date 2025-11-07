/**
 * Client-side JavaScript utilities
 * Currently, all interactive functionality is implemented inline in index.html
 * This file is reserved for future client-side enhancements
 */

// Utility function to format dates
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDate,
    debounce,
  };
}
