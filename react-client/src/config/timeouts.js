/**
 * Centralized timeout configuration for API requests and downloads
 * All timeout values are in milliseconds
 */

/**
 * Generate a random timeout value between min and max milliseconds
 * @param {number} min - Minimum timeout in milliseconds
 * @param {number} max - Maximum timeout in milliseconds
 * @returns {number} Random timeout value
 */
function getRandomTimeout(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const timeouts = {
  // Sleep duration between fetching pagination pages (random 1-5 seconds)
  betweenPages: {
    min: 1000,  // 1 second
    max: 5000,  // 5 seconds
    get: () => getRandomTimeout(1000, 5000)
  },

  // Sleep duration between processing different URLs (random 1-5 seconds)
  betweenUrls: {
    min: 1000,  // 1 second
    max: 5000,  // 5 seconds
    get: () => getRandomTimeout(1000, 5000)
  }
}

export default timeouts
