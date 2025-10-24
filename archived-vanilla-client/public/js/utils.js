/**
 * A collection of utility functions.
 */

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Shuffles an array in place.
 * @param {Array<any>} array - The array to shuffle.
 * @returns {Array<any>} The shuffled array.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Extracts a username from a Facebook or Instagram URL.
 * @param {string} url - The URL to parse.
 * @returns {string} The extracted username or a default value.
 */
export function getUsernameFromUrl(url) {
    if (!url) return 'unknown_user';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('facebook.com')) {
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            if (pathParts.length > 0) {
                if (pathParts[0] === 'profile.php' && urlObj.searchParams.has('id')) {
                    return urlObj.searchParams.get('id');
                } else if (pathParts[0] !== 'photo.php' && pathParts[0] !== 'story.php') {
                    return pathParts[0];
                }
            }
        } else if (urlObj.hostname.includes('instagram.com')) {
            let path = urlObj.pathname.split('/').filter(part => part)[0];
            if (path && path.endsWith('/')) path = path.slice(0, -1);
            return path;
        }
    } catch (e) {
        console.error("Error extracting username from URL:", url, e);
    }
    return 'unknown_user';
}
