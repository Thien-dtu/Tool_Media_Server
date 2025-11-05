import { useState } from 'react'
import { getPlatformUrls } from '../lib/dbApiClient.js'

/**
 * Page component for displaying platform URLs
 * Shows profile URLs from Facebook and Instagram platforms
 */
export default function PlatformUrls() {
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [urls, setUrls] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Fetch URLs for the selected platform
  const handleFetchUrls = async (platform) => {
    setSelectedPlatform(platform)
    setIsLoading(true)
    setError('')
    setCopySuccess(false)

    try {
      const result = await getPlatformUrls(platform)
      setUrls(result.urls || [])
    } catch (err) {
      console.error('Error fetching platform URLs:', err)
      setError(`Failed to fetch URLs: ${err.message}`)
      setUrls([])
    } finally {
      setIsLoading(false)
    }
  }

  // Copy URLs to clipboard
  const handleCopyToClipboard = async () => {
    if (urls.length === 0) return

    const urlsText = urls.join(', ')

    try {
      await navigator.clipboard.writeText(urlsText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Platform URLs</h1>

      {/* Platform Selection Buttons */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Select Platform</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleFetchUrls('facebook')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedPlatform === 'facebook'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            disabled={isLoading}
          >
            Facebook
          </button>
          <button
            onClick={() => handleFetchUrls('instagram')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedPlatform === 'instagram'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            disabled={isLoading}
          >
            Instagram
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-gray-600 mb-4">
          Loading URLs...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Results Section */}
      {selectedPlatform && !isLoading && !error && (
        <div>
          {/* URL Count and Copy Button */}
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold">
              Total URLs: <span className="text-blue-600">{urls.length}</span>
            </h2>
            {urls.length > 0 && (
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>

          {/* URLs Container */}
          {urls.length > 0 ? (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm text-gray-800 break-all leading-relaxed">
                {urls.join(', ')}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No URLs found for {selectedPlatform}.
            </div>
          )}

          {/* URL List (Optional Detail View) */}
          {urls.length > 0 && (
            <div className="mt-6">
              <details className="bg-white border border-gray-200 rounded-lg">
                <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50">
                  View URLs as List ({urls.length} items)
                </summary>
                <div className="px-4 py-3 max-h-96 overflow-y-auto">
                  <ol className="list-decimal list-inside space-y-1">
                    {urls.map((url, index) => (
                      <li key={index} className="text-sm text-gray-700 break-all">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedPlatform && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Select a platform (Facebook or Instagram) to view all profile URLs</li>
            <li>URLs will be displayed in a container, separated by commas</li>
            <li>Click the "Copy to Clipboard" button to copy all URLs at once</li>
            <li>Expand the "View URLs as List" section to see clickable individual URLs</li>
          </ul>
        </div>
      )}
    </div>
  )
}
