import { useState, useEffect } from 'react'
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2'
import { getUserEngagement } from '../../lib/dbApiClient.js'

export default function UserEngagementReport() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { users } = await getUserEngagement(0)
      setUsers(users || [])
    } catch (err) {
      console.error('Error fetching user engagement:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const top15 = users.slice(0, 15)
  const top10 = users.slice(0, 10)

  // Chart 1: Engagement Scores
  const engagementChartData = {
    labels: top15.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Engagement Score',
      data: top15.map(u => Math.round(u.engagement_score)),
      backgroundColor: '#3b82f6'
    }]
  }

  // Chart 2: Downloads Breakdown
  const downloadsChartData = {
    labels: top10.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Total Downloads',
      data: top10.map(u => u.total_downloads),
      backgroundColor: '#10b981'
    }]
  }

  // Chart 3: API Calls vs Downloads
  const comparisonChartData = {
    labels: top10.map(u => u.username || 'N/A'),
    datasets: [
      {
        label: 'Downloads',
        data: top10.map(u => u.total_downloads),
        backgroundColor: '#10b981'
      },
      {
        label: 'API Calls',
        data: top10.map(u => u.total_api_calls),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Active Days',
        data: top10.map(u => u.active_days * 10),
        backgroundColor: '#f59e0b'
      }
    ]
  }

  // Chart 4: Engagement Distribution
  const engagementBuckets = users.reduce((acc, user) => {
    const score = Math.round(user.engagement_score)
    if (score < 50) acc['Low (< 50)'] = (acc['Low (< 50)'] || 0) + 1
    else if (score < 100) acc['Medium (50-100)'] = (acc['Medium (50-100)'] || 0) + 1
    else if (score < 200) acc['High (100-200)'] = (acc['High (100-200)'] || 0) + 1
    else acc['Very High (> 200)'] = (acc['Very High (> 200)'] || 0) + 1
    return acc
  }, {})

  const distributionChartData = {
    labels: Object.keys(engagementBuckets),
    datasets: [{
      data: Object.values(engagementBuckets),
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
    }]
  }

  // Chart 5: Engagement Metrics Radar
  const radarChartData = top10.length > 0 ? {
    labels: ['Downloads', 'API Calls', 'Active Days'],
    datasets: top10.slice(0, 5).map((user, idx) => ({
      label: user.username || 'N/A',
      data: [
        user.total_downloads / Math.max(...top10.map(u => u.total_downloads)) * 100,
        user.total_api_calls / Math.max(...top10.map(u => u.total_api_calls)) * 100,
        user.active_days / Math.max(...top10.map(u => u.active_days)) * 100
      ],
      borderColor: `hsl(${idx * 72}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 72}, 70%, 50%, 0.2)`
    }))
  } : null

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>🎯 User Engagement Analysis</h2>

      {users.length > 0 && (
        <>
          {/* Chart 1: Engagement Scores */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Top 15 Users by Engagement Score</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="user-engagement-chart" data={engagementChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Downloads Breakdown */}
          <h3 style={{ marginBottom: '16px' }}>Top 10 Users by Total Downloads</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="downloads-chart" data={downloadsChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Multi-Metric Comparison */}
          <h3 style={{ marginBottom: '16px' }}>Multi-Metric Comparison (Top 10)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="comparison-chart" data={comparisonChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Engagement Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Engagement Score Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="distribution-chart" data={distributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Radar Chart */}
          {radarChartData && (
            <>
              <h3 style={{ marginBottom: '16px' }}>Top 5 Users - Engagement Metrics Comparison</h3>
              <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <Radar key="radar-chart" data={radarChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </>
          )}

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Engagement Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Downloads</th>
                <th>API Calls</th>
                <th>Active Days</th>
                <th>Engagement Score</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 20).map((user, idx) => (
                <tr key={idx}>
                  <td>{user.username || 'N/A'}</td>
                  <td>{user.total_downloads}</td>
                  <td>{user.total_api_calls}</td>
                  <td>{user.active_days}</td>
                  <td style={{ fontWeight: '600', color: '#3b82f6' }}>{Math.round(user.engagement_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
