import { useState, useEffect } from 'react'

export default function FollowingUrls() {
  const [followingData, setFollowingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [urls, setUrls] = useState('')

  useEffect(() => {
    loadFollowingData()
  }, [])

  const loadFollowingData = async () => {
    try {
      setLoading(true)
      
      // Try to load from public folder first, then fallback to data folder
      let data
      try {
        const publicResponse = await fetch('/following.json')
        if (publicResponse.ok) {
          data = await publicResponse.json()
        } else {
          throw new Error('Not found in public folder')
        }
      } catch {
        // Fallback: try to load from data folder via API
        const apiResponse = await fetch('/api/following')
        if (!apiResponse.ok) {
          throw new Error('Failed to load following data from API')
        }
        data = await apiResponse.json()
      }
      
      setFollowingData(data)
      
      // Extract URLs and join with commas
      if (data?.relationships_following) {
        const extractedUrls = data.relationships_following
          // .map(item => `https://www.instagram.com/${item.title}`)
          .map(item => `https://www.instagram.com/${item.title}`)
          .filter(Boolean)
        setUrls(extractedUrls.join(','))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(urls)
      alert('URLs copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = urls
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('URLs copied to clipboard!')
    }
  }

  const downloadUrls = () => {
    const blob = new Blob([urls], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'following_urls.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container">
        <h2>Following URLs</h2>
        <div className="loading">Loading following data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h2>Following URLs</h2>
        <div className="error">Error: {error}</div>
        <button onClick={loadFollowingData}>Retry</button>
      </div>
    )
  }

  const urlCount = urls.split(',').filter(Boolean).length

  return (
    <div className="container">
      <h2>Instagram Following URLs</h2>
      
      <div className="controls" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 'bold', color: '#333' }}>
          Total URLs: {urlCount}
        </div>
        
        <button 
          onClick={copyToClipboard}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Copy to Clipboard
        </button>
        
        <button 
          onClick={downloadUrls}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Download as TXT
        </button>
      </div>

      <div className="urls-display" style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '20px',
        maxHeight: '70vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: '0', color: '#495057' }}>URLs (comma-separated):</h3>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all',
          fontSize: '14px',
          lineHeight: '1.4',
          margin: '0',
          color: '#212529'
        }}>
          {urls || 'No URLs found'}
        </pre>
      </div>
    </div>
  )
}