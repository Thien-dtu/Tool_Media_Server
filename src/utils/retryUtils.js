/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @returns {Promise} - The result of the function
 */
async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        shouldRetry = () => true
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if we've exhausted attempts
            if (attempt === maxRetries) {
                break;
            }

            // Don't retry if the error shouldn't be retried
            if (!shouldRetry(error)) {
                break;
            }

            // Log retry attempt
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error:`, error.message);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Exponential backoff with jitter
            delay = Math.min(delay * 2, maxDelay);
            delay = delay + Math.random() * 1000; // Add jitter
        }
    }

    throw lastError;
}

/**
 * Determine if an error should be retried based on status code
 * @param {Error} error - The error object
 * @returns {boolean} - Whether to retry
 */
function shouldRetryNetworkError(error) {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    // Retry on 5xx server errors and 429 (too many requests)
    if (error.response) {
        const status = error.response.status;
        return status >= 500 || status === 429;
    }

    // Don't retry on 4xx client errors (except 429)
    return false;
}

module.exports = {
    retryWithBackoff,
    shouldRetryNetworkError,
};
