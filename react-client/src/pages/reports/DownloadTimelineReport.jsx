import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { getDownloadTimeline } from '../../lib/dbApiClient.js'

export default function DownloadTimelineReport() {
  const [timeline, setTimeline] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [granularity, setGranularity] = useState('day')

  useEffect(() => {
    fetchData()
  }, [granularity])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { timeline } = await getDownloadTimeline({ granularity })
      setTimeline(timeline || [])
    } catch (err) {
      console.error('Error fetching download timeline:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const recent30 = timeline.slice(-30)
  const recent7 = timeline.slice(-7)

  // Chart 1: Downloads and Unique Users Timeline
  const timelineChartData = {
    labels: timeline.map(t => t.period),
    datasets: [
      {
        label: 'Downloads',
        data: timeline.map(t => t.download_count),
        borderColor: '#10b981',
        backgroundColor: '#10b98120',
        yAxisID: 'y'
      },
      {
        label: 'Unique Users',
        data: timeline.map(t => t.unique_users),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f620',
        yAxisID: 'y1'
      }
    ]
  }

  // Chart 2: Last 30 Days Downloads
  const recent30ChartData = {
    labels: recent30.map(t => t.period),
    datasets: [{
      label: 'Downloads (Last 30 Periods)',
      data: recent30.map(t => t.download_count),
      borderColor: '#10b981',
      backgroundColor: '#10b98140',
      fill: true,
      tension: 0.4
    }]
  }

  // Chart 3: Last 7 Days Activity
  const recent7ChartData = {
    labels: recent7.map(t => t.period),
    datasets: [{
      label: 'Downloads (Last 7 Periods)',
      data: recent7.map(t => t.download_count),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 4: User Growth
  const userGrowthChartData = {
    labels: timeline.map(t => t.period),
    datasets: [{
      label: 'Unique Users Over Time',
      data: timeline.map(t => t.unique_users),
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f640',
      fill: true,
      tension: 0.4
    }]
  }

  // Chart 5: Peak vs Average Analysis
  const avg = timeline.length > 0 ? timeline.reduce((sum, t) => sum + t.download_count, 0) / timeline.length : 0
  const max = timeline.length > 0 ? Math.max(...timeline.map(t => t.download_count)) : 0
  const peakAnalysisData = {
    labels: ['Average', 'Peak', 'Latest'],
    datasets: [{
      data: [
        Math.round(avg),
        max,
        timeline.length > 0 ? timeline[timeline.length - 1].download_count : 0
      ],
      backgroundColor: ['#f59e0b', '#10b981', '#3b82f6']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>📅 Download Timeline Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Granularity:
          <select value={granularity} onChange={e => setGranularity(e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px' }}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
      </div>

      {timeline.length > 0 && (
        <>
          {/* Chart 1: Full Timeline */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Downloads & Users Timeline</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line
              key={`timeline-${granularity}`}
              data={timelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { type: 'linear', position: 'left', title: { display: true, text: 'Downloads' } },
                  y1: { type: 'linear', position: 'right', title: { display: true, text: 'Unique Users' }, grid: { drawOnChartArea: false } }
                }
              }}
            />
          </div>

          {/* Chart 2: Last 30 Periods */}
          <h3 style={{ marginBottom: '16px' }}>Last 30 Periods Trend</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key={`recent30-${granularity}`} data={recent30ChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Last 7 Periods */}
          <h3 style={{ marginBottom: '16px' }}>Last 7 Periods Activity</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`recent7-${granularity}`} data={recent7ChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: User Growth */}
          <h3 style={{ marginBottom: '16px' }}>User Growth Over Time</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key={`users-${granularity}`} data={userGrowthChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Peak Analysis */}
          <h3 style={{ marginBottom: '16px' }}>Peak vs Average Analysis</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`peak-${granularity}`} data={peakAnalysisData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Timeline Data (Last 30)</h3>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Downloads</th>
                <th>Unique Users</th>
                <th>Avg/User</th>
              </tr>
            </thead>
            <tbody>
              {timeline.slice(-30).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.period}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{item.download_count}</td>
                  <td>{item.unique_users}</td>
                  <td>{item.unique_users > 0 ? (item.download_count / item.unique_users).toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
