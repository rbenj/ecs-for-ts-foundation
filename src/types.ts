/**
 * Type definitions and utilities for the ECS framework.
 */

// Polyfill for performance.now() in Node.js environments
declare global {
  interface Performance {
    now(): number;
  }

  var performance: Performance;
}

// Ensure performance is available
if (typeof performance === 'undefined') {
  // Simple polyfill for Node.js environments
  global.performance = {
    now: () => {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    }
  };
}

export { }; 
