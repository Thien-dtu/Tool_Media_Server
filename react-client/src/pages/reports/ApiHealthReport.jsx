import { useState, useEffect } from 'react'
import { Bar, Doughnut, Radar, Line } from 'react-chartjs-2'
import { getReportStats, getCompletionByApi } from '../../lib/dbApiClient.js'

export default function ApiHealthReport() {
  const [stats, setStats] = useState([])
  const [completionRates, setCompletionRates] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [statsData, completionData] = await Promise.all([
        getReportStats(),
        getCompletionByApi()
      ])
      setStats(statsData.stats || [])
      setCompletionRates(completionData.rates || [])
    } catch (err) {
      console.error('Error fetching API health:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: API Usage Overview (Total Calls + Unique Users)
  const usageChartData = {
    labels: stats.map(s => s.api_name),
    datasets: [
      {
        label: 'Total Calls',
        data: stats.map(s => s.total_calls),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Unique Users',
        data: stats.map(s => s.unique_users),
        backgroundColor: '#10b981'
      }
    ]
  }

  // Chart 2: Average Duration by API
  const durationChartData = {
    labels: stats.map(s => s.api_name),
    datasets: [{
      label: 'Avg Duration (seconds)',
      data: stats.map(s => s.avg_duration_seconds || 0),
      backgroundColor: stats.map(s => {
        const duration = s.avg_duration_seconds || 0
        if (duration < 30) return '#10b981' // Good: < 30s
        if (duration < 60) return '#f59e0b' // Medium: 30-60s
        return '#ef4444' // Slow: > 60s
      })
    }]
  }

  // Chart 3: Pages per Call Distribution
  const pagesChartData = {
    labels: stats.map(s => s.api_name),
    datasets: [{
      label: 'Avg Pages per Call',
      data: stats.map(s => s.avg_pages_per_call || 0),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 4: Completion Rates by API
  const completionChartData = {
    labels: completionRates.map(c => c.api_name),
    datasets: [{
      label: 'Completion Rate (%)',
      data: completionRates.map(c => c.completion_rate),
      backgroundColor: completionRates.map(c => {
        if (c.completion_rate > 80) return '#10b981'
        if (c.completion_rate > 50) return '#f59e0b'
        return '#ef4444'
      })
    }]
  }

  // Chart 5: API Health Score Radar (normalized metrics)
  const maxCalls = Math.max(...stats.map(s => s.total_calls), 1)
  const maxUsers = Math.max(...stats.map(s => s.unique_users), 1)
  const maxItems = Math.max(...stats.map(s => s.total_items_saved || 0), 1)

  const radarChartData = {
    labels: ['Total Calls', 'Unique Users', 'Items Saved', 'Completion Rate', 'Performance'],
    datasets: stats.map((stat, idx) => {
      const completion = completionRates.find(c => c.api_name === stat.api_name)
      const performanceScore = stat.avg_duration_seconds ? Math.max(0, 100 - stat.avg_duration_seconds) : 50

      return {
        label: stat.api_name,
        data: [
          (stat.total_calls / maxCalls) * 100,
          (stat.unique_users / maxUsers) * 100,
          ((stat.total_items_saved || 0) / maxItems) * 100,
          completion ? completion.completion_rate : 0,
          performanceScore
        ],
        borderColor: `hsl(${idx * 120}, 70%, 50%)`,
        backgroundColor: `hsl(${idx * 120}, 70%, 50%, 0.2)`
      }
    })
  }

  // Chart 6: Total Calls Distribution
  const callsDistributionData = {
    labels: stats.map(s => s.api_name),
    datasets: [{
      data: stats.map(s => s.total_calls),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>🏥 API Health Monitoring</h2>

      {stats.length > 0 && (
        <>
          {/* Chart 1: API Usage Overview */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>API Usage Overview</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="api-usage-chart" data={usageChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Average Duration */}
          <h3 style={{ marginBottom: '16px' }}>Average Duration by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="duration-chart" data={durationChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Pages per Call */}
          <h3 style={{ marginBottom: '16px' }}>Average Pages per Call</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="pages-chart" data={pagesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Completion Rates */}
          <h3 style={{ marginBottom: '16px' }}>Completion Rates by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="completion-chart" data={completionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: API Health Score Radar */}
          <h3 style={{ marginBottom: '16px' }}>API Health Score Comparison (Normalized)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Radar key="health-radar-chart" data={radarChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 6: Calls Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Total Calls Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="calls-distribution-chart" data={callsDistributionData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Performance Metrics Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Performance Metrics</h3>
          <table style={{ marginBottom: '32px' }}>
            <thead>
              <tr>
                <th>API Name</th>
                <th>Total Calls</th>
                <th>Unique Users</th>
                <th>Items Fetched</th>
                <th>Items Saved</th>
                <th>Avg Duration</th>
                <th>Avg Pages</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, idx) => (
                <tr key={idx}>
                  <td>{stat.api_name}</td>
                  <td>{stat.total_calls}</td>
                  <td>{stat.unique_users}</td>
                  <td>{stat.total_items_fetched || 0}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{stat.total_items_saved || 0}</td>
                  <td style={{ color: stat.avg_duration_seconds > 60 ? '#ef4444' : stat.avg_duration_seconds > 30 ? '#f59e0b' : '#10b981' }}>
                    {stat.avg_duration_seconds ? `${stat.avg_duration_seconds.toFixed(1)}s` : 'N/A'}
                  </td>
                  <td>{stat.avg_pages_per_call ? stat.avg_pages_per_call.toFixed(1) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Completion Rates Table */}
          <h3 style={{ marginBottom: '16px' }}>Completion Rate Details</h3>
          <table>
            <thead>
              <tr>
                <th>API Name</th>
                <th>Total Reports</th>
                <th>Total Items</th>
                <th>Items Saved</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {completionRates.map((api, idx) => (
                <tr key={idx}>
                  <td>{api.api_name}</td>
                  <td>{api.total_reports}</td>
                  <td>{api.total_items}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{api.items_saved}</td>
                  <td style={{ fontWeight: '600', color: api.completion_rate > 80 ? '#059669' : api.completion_rate > 50 ? '#f59e0b' : '#dc2626' }}>
                    {api.completion_rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
