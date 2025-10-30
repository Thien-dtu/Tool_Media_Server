/**
 * Simple concurrency limiter for parallel execution
 * @param {number} limit - Maximum number of concurrent operations
 * @returns {Function} - Function that wraps async operations
 */
function createConcurrencyLimiter(limit) {
    let activeCount = 0;
    const queue = [];

    async function run(fn) {
        // Wait if we're at the limit
        while (activeCount >= limit) {
            await new Promise(resolve => queue.push(resolve));
        }

        activeCount++;
        try {
            return await fn();
        } finally {
            activeCount--;
            // Release the next queued operation
            const next = queue.shift();
            if (next) next();
        }
    }

    return run;
}

module.exports = {
    createConcurrencyLimiter,
};
