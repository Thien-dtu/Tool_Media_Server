import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { getCursorProgress } from '../../lib/dbApiClient.js'

export default function CursorProgressReport() {
  const [cursors, setCursors] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { cursors } = await getCursorProgress()
      setCursors(cursors || [])
    } catch (err) {
      console.error('Error fetching cursor progress:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: Top 15 Pages Loaded
  const top15ChartData = {
    labels: cursors.slice(0, 15).map(c => c.username || 'N/A'),
    datasets: [{
      label: 'Pages Loaded',
      data: cursors.slice(0, 15).map(c => c.pages_loaded),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 2: API Distribution
  const apiCounts = cursors.reduce((acc, c) => {
    acc[c.api_name] = (acc[c.api_name] || 0) + 1
    return acc
  }, {})

  const apiChartData = {
    labels: Object.keys(apiCounts),
    datasets: [{
      data: Object.values(apiCounts),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    }]
  }

  // Chart 3: Pages Loaded Distribution
  const pagesBuckets = cursors.reduce((acc, c) => {
    if (c.pages_loaded < 10) acc['< 10 pages'] = (acc['< 10 pages'] || 0) + 1
    else if (c.pages_loaded < 50) acc['10-49 pages'] = (acc['10-49 pages'] || 0) + 1
    else if (c.pages_loaded < 100) acc['50-99 pages'] = (acc['50-99 pages'] || 0) + 1
    else acc['100+ pages'] = (acc['100+ pages'] || 0) + 1
    return acc
  }, {})

  const pagesDistributionChartData = {
    labels: Object.keys(pagesBuckets),
    datasets: [{
      data: Object.values(pagesBuckets),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
    }]
  }

  // Chart 4: All Active Cursors
  const allCursorsChartData = {
    labels: cursors.map(c => c.username || 'N/A'),
    datasets: [{
      label: 'Pages Loaded',
      data: cursors.map(c => c.pages_loaded),
      backgroundColor: '#10b981',
      borderColor: '#059669',
      borderWidth: 1
    }]
  }

  // Chart 5: Progress Timeline (simulated by last_updated)
  const sortedByTime = [...cursors].sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated))
  const timelineChartData = {
    labels: sortedByTime.map(c => new Date(c.last_updated).toLocaleTimeString()),
    datasets: [{
      label: 'Pages Loaded Over Time',
      data: sortedByTime.map(c => c.pages_loaded),
      borderColor: '#8b5cf6',
      backgroundColor: '#8b5cf620',
      tension: 0.4
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>⏳ Active Cursors Progress Analysis</h2>

      {cursors.length > 0 ? (
        <>
          {/* Chart 1: Top 15 */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Top 15 Active Downloads</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="cursor-progress-chart" data={top15ChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: API Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Downloads by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="api-chart" data={apiChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Pages Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Progress Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="pages-dist-chart" data={pagesDistributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: All Cursors */}
          <h3 style={{ marginBottom: '16px' }}>All Active Downloads Progress</h3>
          <div style={{ height: '500px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="all-cursors-chart" data={allCursorsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Timeline */}
          <h3 style={{ marginBottom: '16px' }}>Progress Timeline</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key="timeline-chart" data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Cursor Status</h3>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>API</th>
                <th>Pages Loaded</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {cursors.map((cursor, idx) => (
                <tr key={idx}>
                  <td>{cursor.username || 'N/A'}</td>
                  <td>{cursor.api_name}</td>
                  <td style={{ fontWeight: '600' }}>{cursor.pages_loaded}</td>
                  <td>{new Date(cursor.last_updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>No active cursors</p>
      )}
    </div>
  )
}
