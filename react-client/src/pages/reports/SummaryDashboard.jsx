import { useState, useEffect } from 'react'
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2'
import { getSummaryDashboard, getPlatformComparison, getDownloadTimeline, getApiFrequency, getTopUsers } from '../../lib/dbApiClient.js'

export default function SummaryDashboard() {
  const [summary, setSummary] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [timeline, setTimeline] = useState([])
  const [apiStats, setApiStats] = useState([])
  const [topUsers, setTopUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [summaryData, platformData, timelineData, apiData, userData] = await Promise.all([
        getSummaryDashboard(),
        getPlatformComparison(),
        getDownloadTimeline({ granularity: 'day' }),
        getApiFrequency({ granularity: 'month' }),
        getTopUsers({ limit: 5 })
      ])
      setSummary(summaryData.summary)
      setPlatforms(platformData.platforms || [])
      setTimeline((timelineData.timeline || []).slice(-30))
      setApiStats((apiData.frequency || []).slice(-12))
      setTopUsers(userData.users || [])
    } catch (err) {
      console.error('Error fetching summary:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const overviewChartData = summary ? {
    labels: ['Total Users', 'Active Users', 'Total Downloads', 'API Calls', 'Last 7 Days'],
    datasets: [{
      label: 'Summary Metrics',
      data: [summary.totalUsers, summary.activeUsers, summary.totalDownloads, summary.totalApiCalls, summary.recentDownloads],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    }]
  } : null

  const platformChartData = {
    labels: platforms.map(p => p.platform_name.toUpperCase()),
    datasets: [{
      label: 'Downloads by Platform',
      data: platforms.map(p => p.total_downloads),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }

  const timelineChartData = {
    labels: timeline.map(t => t.period),
    datasets: [{
      label: 'Daily Downloads',
      data: timeline.map(t => t.download_count),
      borderColor: '#10b981',
      backgroundColor: '#10b98140',
      fill: true,
      tension: 0.4
    }]
  }

  // Group API stats by API name
  const apiNames = [...new Set(apiStats.map(a => a.api_name))]
  const apiPeriods = [...new Set(apiStats.map(a => a.period))]

  const apiChartData = {
    labels: apiPeriods,
    datasets: apiNames.map((name, idx) => ({
      label: name,
      data: apiPeriods.map(period => {
        const item = apiStats.find(a => a.period === period && a.api_name === name)
        return item ? item.call_count : 0
      }),
      borderColor: `hsl(${idx * 120}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 120}, 70%, 50%, 0.1)`,
      tension: 0.4
    }))
  }

  const topUsersChartData = {
    labels: topUsers.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Total Downloads',
      data: topUsers.map(u => u.total_downloads),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>📊 Summary Dashboard</h2>

      {summary && (
        <>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '20px', background: '#dbeafe', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#1e40af' }}>Total Users</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e3a8a' }}>{summary.totalUsers}</div>
            </div>
            <div style={{ padding: '20px', background: '#dcfce7', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#15803d' }}>Total Downloads</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#166534' }}>{summary.totalDownloads}</div>
            </div>
            <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#a16207' }}>Total API Calls</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#854d0e' }}>{summary.totalApiCalls}</div>
            </div>
            <div style={{ padding: '20px', background: '#e0e7ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#4338ca' }}>Active Users</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3730a3' }}>{summary.activeUsers}</div>
            </div>
            <div style={{ padding: '20px', background: '#fce7f3', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#be185d' }}>Last 7 Days</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#9f1239' }}>{summary.recentDownloads}</div>
            </div>
          </div>

          {/* Chart 1: Overview Bar Chart */}
          <h3 style={{ marginTop: '40px', marginBottom: '16px' }}>Overview Metrics</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="summary-bar-chart" data={overviewChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Platform Distribution */}
          {platforms.length > 0 && (
            <>
              <h3 style={{ marginBottom: '16px' }}>Platform Distribution</h3>
              <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <Doughnut key="platform-doughnut" data={platformChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </>
          )}

          {/* Chart 3: Download Timeline (Last 30 Days) */}
          {timeline.length > 0 && (
            <>
              <h3 style={{ marginBottom: '16px' }}>Download Activity (Last 30 Days)</h3>
              <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <Line key="timeline-line" data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </>
          )}

          {/* Chart 4: API Usage Trends */}
          {apiStats.length > 0 && (
            <>
              <h3 style={{ marginBottom: '16px' }}>API Usage Trends (Last 12 Months)</h3>
              <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <Line key="api-trends-line" data={apiChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </>
          )}

          {/* Chart 5: Top 5 Users */}
          {topUsers.length > 0 && (
            <>
              <h3 style={{ marginBottom: '16px' }}>Top 5 Most Active Users</h3>
              <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <Bar key="top-users-bar" data={topUsersChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
