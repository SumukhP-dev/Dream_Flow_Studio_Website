// Load environment variables for tests
require('dotenv').config({ path: '.env.test' });

// Set default test environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Mock isomorphic-dompurify to avoid ESM import issues
// Provide a simple sanitization that removes HTML tags
jest.mock('isomorphic-dompurify', () => {
  const sanitize = (input, options = {}) => {
    if (typeof input !== 'string') return input;
    
    const allowedTags = options.ALLOWED_TAGS || [];
    
    // If no tags are allowed, remove all HTML
    if (allowedTags.length === 0) {
      return input.replace(/<[^>]+>/g, '');
    }
    
    // If tags are allowed, remove only non-allowed tags
    // This is a simplified version - in production DOMPurify does more sophisticated sanitization
    const allowedTagsSet = new Set(allowedTags);
    let result = input;
    
    // Remove script tags and other dangerous tags regardless
    result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
    result = result.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    result = result.replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
    
    // Remove tags that are not in the allowed list
    const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    result = result.replace(tagRegex, (match, closing, tagName) => {
      if (allowedTagsSet.has(tagName.toLowerCase())) {
        return match; // Keep allowed tags
      }
      return ''; // Remove disallowed tags
    });
    
    return result;
  };
  
  return {
    __esModule: true,
    default: {
      sanitize,
    },
  };
});

