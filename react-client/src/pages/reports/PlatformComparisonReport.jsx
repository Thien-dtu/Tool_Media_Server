import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2'
import { getPlatformComparison } from '../../lib/dbApiClient.js'

export default function PlatformComparisonReport() {
  const [platforms, setPlatforms] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { platforms } = await getPlatformComparison()
      setPlatforms(platforms || [])
    } catch (err) {
      console.error('Error fetching platform comparison:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: Multi-metric comparison
  const comparisonChartData = {
    labels: platforms.map(p => p.platform_name.toUpperCase()),
    datasets: [
      {
        label: 'Total Users',
        data: platforms.map(p => p.total_users),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Total Downloads',
        data: platforms.map(p => p.total_downloads),
        backgroundColor: '#10b981'
      },
      {
        label: 'API Calls',
        data: platforms.map(p => p.total_api_calls),
        backgroundColor: '#f59e0b'
      }
    ]
  }

  // Chart 2: User Distribution
  const userDistributionChartData = {
    labels: platforms.map(p => p.platform_name.toUpperCase()),
    datasets: [{
      data: platforms.map(p => p.total_users),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }

  // Chart 3: Download Distribution
  const downloadDistributionChartData = {
    labels: platforms.map(p => p.platform_name.toUpperCase()),
    datasets: [{
      data: platforms.map(p => p.total_downloads),
      backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6']
    }]
  }

  // Chart 4: API Calls Comparison
  const apiCallsChartData = {
    labels: platforms.map(p => p.platform_name.toUpperCase()),
    datasets: [{
      label: 'Total API Calls',
      data: platforms.map(p => p.total_api_calls),
      backgroundColor: ['#f59e0b', '#8b5cf6', '#ec4899']
    }]
  }

  // Chart 5: Platform Performance Radar
  const maxUsers = Math.max(...platforms.map(p => p.total_users))
  const maxDownloads = Math.max(...platforms.map(p => p.total_downloads))
  const maxApiCalls = Math.max(...platforms.map(p => p.total_api_calls))

  const radarChartData = {
    labels: ['Users', 'Downloads', 'API Calls'],
    datasets: platforms.map((platform, idx) => ({
      label: platform.platform_name.toUpperCase(),
      data: [
        (platform.total_users / maxUsers) * 100,
        (platform.total_downloads / maxDownloads) * 100,
        (platform.total_api_calls / maxApiCalls) * 100
      ],
      borderColor: `hsl(${idx * 120}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 120}, 70%, 50%, 0.2)`
    }))
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>🌐 Platform Comparison Analysis</h2>

      {platforms.length > 0 && (
        <>
          {/* Chart 1: Multi-Metric Comparison */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Multi-Metric Platform Comparison</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="platform-comparison-chart" data={comparisonChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: User Distribution */}
          <h3 style={{ marginBottom: '16px' }}>User Distribution by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="user-distribution-chart" data={userDistributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Download Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Download Distribution by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="download-distribution-chart" data={downloadDistributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: API Calls */}
          <h3 style={{ marginBottom: '16px' }}>API Calls by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="api-calls-chart" data={apiCallsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Performance Radar */}
          <h3 style={{ marginBottom: '16px' }}>Platform Performance Comparison (Normalized)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Radar key="performance-radar-chart" data={radarChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Platform Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Total Users</th>
                <th>Total Downloads</th>
                <th>API Calls</th>
                <th>Downloads/User</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '600', textTransform: 'capitalize' }}>{platform.platform_name}</td>
                  <td>{platform.total_users}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{platform.total_downloads}</td>
                  <td>{platform.total_api_calls}</td>
                  <td>{(platform.total_downloads / platform.total_users).toFixed(2)}</td>
                  <td>{platform.last_activity ? new Date(platform.last_activity).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
