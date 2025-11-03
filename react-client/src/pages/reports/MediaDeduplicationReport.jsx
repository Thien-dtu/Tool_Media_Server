import { useState, useEffect } from 'react'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import { getMediaDeduplication } from '../../lib/dbApiClient.js'

export default function MediaDeduplicationReport() {
  const [media, setMedia] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    fetchData()
  }, [limit])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { media } = await getMediaDeduplication(limit)
      setMedia(media || [])
    } catch (err) {
      console.error('Error fetching media deduplication:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: User Count by Media
  const userCountChartData = {
    labels: media.map(m => m.media_id.substring(0, 500)),
    datasets: [{
      label: 'User Count',
      data: media.map(m => m.user_count),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 2: Download Count Distribution
  const downloadCountChartData = {
    labels: media.map(m => m.media_id.substring(0, 500)),
    datasets: [{
      label: 'Total Downloads',
      data: media.map(m => m.download_count),
      backgroundColor: '#10b981'
    }]
  }

  // Chart 3: User vs Download Comparison
  const comparisonChartData = {
    labels: media.slice(0, 10).map(m => m.media_id.substring(0, 500)),
    datasets: [
      {
        label: 'Unique Users',
        data: media.slice(0, 500).map(m => m.user_count),
        backgroundColor: '#8b5cf6'
      },
      {
        label: 'Total Downloads',
        data: media.slice(0, 500).map(m => m.download_count),
        backgroundColor: '#10b981'
      }
    ]
  }

  // Chart 4: Popularity Distribution
  const popularityBuckets = media.reduce((acc, m) => {
    if (m.user_count >= 10) acc['Very Popular (10+ users)'] = (acc['Very Popular (10+ users)'] || 0) + 1
    else if (m.user_count >= 5) acc['Popular (5-9 users)'] = (acc['Popular (5-9 users)'] || 0) + 1
    else if (m.user_count >= 3) acc['Moderate (3-4 users)'] = (acc['Moderate (3-4 users)'] || 0) + 1
    else acc['Low (1-2 users)'] = (acc['Low (1-2 users)'] || 0) + 1
    return acc
  }, {})

  const popularityChartData = {
    labels: Object.keys(popularityBuckets),
    datasets: [{
      data: Object.values(popularityBuckets),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  // Chart 5: Download Frequency (Downloads per User)
  const frequencyChartData = {
    labels: media.slice(0, 500).map(m => m.media_id.substring(0, 500)),
    datasets: [{
      label: 'Avg Downloads per User',
      data: media.slice(0, 500).map(m => (m.download_count / m.user_count).toFixed(2)),
      backgroundColor: '#f59e0b'
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>🎬 Most Popular Media Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Limit: <input type="number" min="10" max="100" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 20)} style={{ marginLeft: '8px', padding: '4px 8px', width: '80px' }} /></label>
      </div>

      {media.length > 0 && (
        <>
          {/* Chart 1: User Count */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Unique Users per Media</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`media-dedup-${limit}`} data={userCountChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Download Count */}
          <h3 style={{ marginBottom: '16px' }}>Total Downloads per Media</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`downloads-${limit}`} data={downloadCountChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: User vs Download Comparison */}
          <h3 style={{ marginBottom: '16px' }}>Users vs Downloads Comparison (Top 10)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`comparison-${limit}`} data={comparisonChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Popularity Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Media Popularity Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`popularity-${limit}`} data={popularityChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Download Frequency */}
          <h3 style={{ marginBottom: '16px' }}>Average Downloads per User (Top 15)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`frequency-${limit}`} data={frequencyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Media Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>Media ID</th>
                <th>Users</th>
                <th>Total Downloads</th>
                <th>Avg Downloads/User</th>
                <th>First Download</th>
                <th>Last Download</th>
              </tr>
            </thead>
            <tbody>
              {media.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.media_id.substring(0, 500)}</td>
                  <td style={{ fontWeight: '600', color: '#3b82f6' }}>{item.user_count}</td>
                  <td>{item.download_count}</td>
                  <td style={{ fontWeight: '600', color: '#f59e0b' }}>{(item.download_count / item.user_count).toFixed(2)}</td>
                  <td>{new Date(item.first_download).toLocaleDateString()}</td>
                  <td>{new Date(item.last_download).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
