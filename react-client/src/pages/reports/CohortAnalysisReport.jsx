import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { getCohortAnalysis } from '../../lib/dbApiClient.js'

export default function CohortAnalysisReport() {
  const [cohorts, setCohorts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { cohorts } = await getCohortAnalysis(period)
      setCohorts(cohorts || [])
    } catch (err) {
      console.error('Error fetching cohort analysis:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: User Count & Downloads Timeline
  const timelineChartData = {
    labels: cohorts.map(c => c.cohort),
    datasets: [
      {
        label: 'User Count',
        data: cohorts.map(c => c.user_count),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f620',
        yAxisID: 'y'
      },
      {
        label: 'Total Downloads',
        data: cohorts.map(c => c.total_downloads || 0),
        borderColor: '#10b981',
        backgroundColor: '#10b98120',
        yAxisID: 'y1'
      }
    ]
  }

  // Chart 2: Average Downloads per User
  const avgDownloadsChartData = {
    labels: cohorts.map(c => c.cohort),
    datasets: [{
      label: 'Avg Downloads/User',
      data: cohorts.map(c => c.avg_downloads_per_user || 0),
      borderColor: '#10b981',
      backgroundColor: '#10b98140',
      fill: true,
      tension: 0.4
    }]
  }

  // Chart 3: User Growth
  const userGrowthChartData = {
    labels: cohorts.map(c => c.cohort),
    datasets: [{
      label: 'User Count',
      data: cohorts.map(c => c.user_count),
      backgroundColor: '#3b82f6'
    }]
  }

  // Chart 4: Cohort Size Distribution
  const sizeCategories = cohorts.reduce((acc, c) => {
    if (c.user_count < 5) acc['Small (< 5)'] = (acc['Small (< 5)'] || 0) + 1
    else if (c.user_count < 10) acc['Medium (5-9)'] = (acc['Medium (5-9)'] || 0) + 1
    else if (c.user_count < 20) acc['Large (10-19)'] = (acc['Large (10-19)'] || 0) + 1
    else acc['Very Large (20+)'] = (acc['Very Large (20+)'] || 0) + 1
    return acc
  }, {})

  const distributionChartData = {
    labels: Object.keys(sizeCategories),
    datasets: [{
      data: Object.values(sizeCategories),
      backgroundColor: ['#fef3c7', '#fed7aa', '#fca5a5', '#dc2626']
    }]
  }

  // Chart 5: Total Downloads by Cohort
  const cohortDownloadsChartData = {
    labels: cohorts.map(c => c.cohort),
    datasets: [{
      label: 'Total Downloads',
      data: cohorts.map(c => c.total_downloads || 0),
      backgroundColor: '#10b981',
      borderColor: '#059669',
      borderWidth: 1
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>📊 Cohort Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Period:
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px' }}>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
      </div>

      {cohorts.length > 0 && (
        <>
          {/* Chart 1: User Count & Downloads Timeline */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>User Count & Downloads Over Time</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line
              key={`cohort-${period}`}
              data={timelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { type: 'linear', position: 'left', title: { display: true, text: 'Users' } },
                  y1: { type: 'linear', position: 'right', title: { display: true, text: 'Downloads' }, grid: { drawOnChartArea: false } }
                }
              }}
            />
          </div>

          {/* Chart 2: Average Downloads per User */}
          <h3 style={{ marginBottom: '16px' }}>Average Downloads per User by Cohort</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key={`avg-downloads-${period}`} data={avgDownloadsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: User Growth */}
          <h3 style={{ marginBottom: '16px' }}>User Growth by Cohort</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`user-growth-${period}`} data={userGrowthChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Cohort Size Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Cohort Size Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`distribution-${period}`} data={distributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Total Downloads by Cohort */}
          <h3 style={{ marginBottom: '16px' }}>Total Downloads by Cohort</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`downloads-${period}`} data={cohortDownloadsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Cohort Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Users</th>
                <th>Total Downloads</th>
                <th>Avg Downloads/User</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort, idx) => (
                <tr key={idx}>
                  <td>{cohort.cohort}</td>
                  <td>{cohort.user_count}</td>
                  <td>{cohort.total_downloads}</td>
                  <td style={{ fontWeight: '600', color: '#3b82f6' }}>{cohort.avg_downloads_per_user ? cohort.avg_downloads_per_user.toFixed(1) : '0'}</td>
                  <td>{cohort.last_activity ? new Date(cohort.last_activity).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
