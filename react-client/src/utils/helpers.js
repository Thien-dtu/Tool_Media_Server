/**
 * Common utility functions shared across pages
 */

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Sleep with countdown display that updates every second
 * @param {number} seconds - Number of seconds to countdown
 * @param {Function} updateStatusCallback - Callback function to update status with remaining seconds
 */
export async function sleepWithCountdown(seconds, updateStatusCallback) {
  for (let i = seconds; i > 0; i--) {
    updateStatusCallback(i)
    await sleep(1000)
  }
}

/**
 * Shuffle an array randomly
 * @param {Array} arr - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Extract username from Facebook or Instagram URL
 * @param {string} url - Social media URL
 * @returns {string} Username or 'unknown_user'
 */
export function getUsernameFromUrl(url) {
  if (!url) return 'unknown_user'
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('facebook.com')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0) {
        if (pathParts[0] === 'profile.php' && urlObj.searchParams.has('id')) {
          return urlObj.searchParams.get('id')
        } else if (pathParts[0] !== 'photo.php' && pathParts[0] !== 'story.php') {
          return pathParts[0]
        }
      }
    } else if (urlObj.hostname.includes('instagram.com')) {
      let path = urlObj.pathname.split('/').filter(Boolean)[0]
      if (path && path.endsWith('/')) path = path.slice(0, -1)
      return path
    }
  } catch {
    // noop
  }
  return 'unknown_user'
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    }
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  }
}
