import { useState, useEffect } from 'react'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import { getDuplicateUsernames } from '../../lib/dbApiClient.js'

export default function DuplicateUsernamesReport() {
  const [duplicates, setDuplicates] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { duplicates } = await getDuplicateUsernames()
      setDuplicates(duplicates || [])
    } catch (err) {
      console.error('Error fetching duplicate usernames:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: Top 15 Duplicates
  const top15ChartData = {
    labels: duplicates.slice(0, 15).map(d => d.username),
    datasets: [{
      label: 'Number of UIDs',
      data: duplicates.slice(0, 15).map(d => d.uid_count),
      backgroundColor: '#dc2626'
    }]
  }

  // Chart 2: Platform Distribution
  const platformData = duplicates.reduce((acc, dup) => {
    const platforms = dup.platforms.split(', ')
    platforms.forEach(p => {
      acc[p] = (acc[p] || 0) + 1
    })
    return acc
  }, {})

  const platformChartData = {
    labels: Object.keys(platformData),
    datasets: [{
      data: Object.values(platformData),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }

  // Chart 3: UID Count Distribution
  const uidBuckets = duplicates.reduce((acc, dup) => {
    if (dup.uid_count === 2) acc['2 UIDs'] = (acc['2 UIDs'] || 0) + 1
    else if (dup.uid_count === 3) acc['3 UIDs'] = (acc['3 UIDs'] || 0) + 1
    else if (dup.uid_count <= 5) acc['4-5 UIDs'] = (acc['4-5 UIDs'] || 0) + 1
    else acc['6+ UIDs'] = (acc['6+ UIDs'] || 0) + 1
    return acc
  }, {})

  const uidDistributionChartData = {
    labels: Object.keys(uidBuckets),
    datasets: [{
      data: Object.values(uidBuckets),
      backgroundColor: ['#f59e0b', '#ef4444', '#dc2626', '#7f1d1d']
    }]
  }

  // Chart 4: Top 25 Duplicates
  const top25ChartData = {
    labels: duplicates.slice(0, 25).map(d => d.username),
    datasets: [{
      label: 'UID Count',
      data: duplicates.slice(0, 25).map(d => d.uid_count),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 5: Severity Analysis
  const severityData = {
    labels: ['Low (2 UIDs)', 'Medium (3-5 UIDs)', 'High (6+ UIDs)'],
    datasets: [{
      data: [
        duplicates.filter(d => d.uid_count === 2).length,
        duplicates.filter(d => d.uid_count >= 3 && d.uid_count <= 5).length,
        duplicates.filter(d => d.uid_count >= 6).length
      ],
      backgroundColor: ['#f59e0b', '#ef4444', '#dc2626']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>⚠️ Duplicate Usernames Analysis</h2>

      {duplicates.length > 0 ? (
        <>
          {/* Chart 1: Top 15 Duplicates */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Top 15 Duplicate Usernames</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="duplicate-usernames-chart" data={top15ChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Platform Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Duplicates by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="platform-chart" data={platformChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: UID Count Distribution */}
          <h3 style={{ marginBottom: '16px' }}>UID Count Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Pie key="uid-distribution-chart" data={uidDistributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Top 25 */}
          <h3 style={{ marginBottom: '16px' }}>Top 25 Duplicate Usernames</h3>
          <div style={{ height: '500px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="top25-chart" data={top25ChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Severity Analysis */}
          <h3 style={{ marginBottom: '16px' }}>Duplicate Severity Levels</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="severity-chart" data={severityData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Duplicate List</h3>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Number of UIDs</th>
                <th>Platforms</th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((dup, idx) => (
                <tr key={idx}>
                  <td>{dup.username}</td>
                  <td style={{ fontWeight: '600', color: '#dc2626' }}>{dup.uid_count}</td>
                  <td>{dup.platforms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>No duplicate usernames found</p>
      )}
    </div>
  )
}
