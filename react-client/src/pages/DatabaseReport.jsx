import { useMemo, useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import ReportFilters from '../components/report/ReportFilters.jsx'
import { getRecentReports, getReportsByDateRange, queryReports } from '../lib/dbApiClient.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export default function DatabaseReport() {
  const defaultFilters = {
    apiName: '',
    startDate: '',
    endDate: '',
    usernames: [],
    topN: 99999,
    sortBy: 'total',
    sortOrder: 'desc',
    searchUsername: '',
    searchUid: '',
  }

  const [data, setData] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [expandedUsername, setExpandedUsername] = useState(null)

  // System API types - hardcoded list from database schema
  const uniqueApis = [
    'get_list_fb_user_photos',
    'get_list_fb_user_reels',
    'get_list_fb_highlights',
    'get_list_ig_post',
    'get_list_ig_user_stories'
  ]

  // Load data from database on mount
  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setIsLoading(true)
    setError('')
    try {
      const { reports } = await getRecentReports(100)
      setData(reports || [])
      setLastFetchTime(new Date())
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(`Failed to fetch reports: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFilteredReports = async () => {
    setIsLoading(true)
    setError('')
    try {
      let reports

      // Use queryReports if any filter is specified
      if (filters.apiName || filters.searchUsername || filters.searchUid || filters.startDate || filters.endDate) {
        const queryParams = {
          apiName: filters.apiName || undefined,
          username: filters.searchUsername || undefined,
          uid: filters.searchUid || undefined,
          startDate: filters.startDate ? dayjs(filters.startDate).toISOString() : undefined,
          endDate: filters.endDate ? dayjs(filters.endDate).toISOString() : undefined,
          limit: 100
        }
        const result = await queryReports(queryParams)
        reports = result.reports || []
      } else {
        const result = await getRecentReports(100)
        reports = result.reports || []
      }

      setData(reports)
      setLastFetchTime(new Date())

      // Show message if no data found
      if (reports.length === 0) {
        setError('No reports found matching the specified filters')
      }
    } catch (err) {
      console.error('Error fetching filtered reports:', err)
      setError(`Failed to fetch reports: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUniqueCounts = useMemo(() => {
    const userIdSet = {}
    let filtered = data
    if (filters.apiName) filtered = filtered.filter(item => item.apiName === filters.apiName)
    if (filters.startDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrAfter(dayjs(filters.startDate)))
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrBefore(dayjs(filters.endDate)))
    }

    filtered.forEach(item => {
      (item.report || []).forEach(r => {
        if (filters.searchUsername && !r.username.toLowerCase().includes(filters.searchUsername.toLowerCase())) return
        if (!userIdSet[r.username]) userIdSet[r.username] = new Set()
        if (Array.isArray(r.ids)) r.ids.forEach(id => userIdSet[r.username].add(id))
      })
    })
    return Object.entries(userIdSet)
      .map(([username, set]) => ({ username, count: set.size }))
      .sort((a, b) => (filters.sortOrder === 'desc' ? b.count - a.count : a.count - b.count))
      .slice(0, filters.topN || 10)
  }, [data, filters])

  // Get detailed reports for a specific username
  const getUserReports = (username) => {
    let filtered = data
    if (filters.apiName) filtered = filtered.filter(item => item.apiName === filters.apiName)
    if (filters.startDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrAfter(dayjs(filters.startDate)))
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrBefore(dayjs(filters.endDate)))
    }

    return filtered.flatMap(item =>
      (item.report || [])
        .filter(r => r.username === username)
        .map(r => ({ ...r, timestamp: item.timestamp, apiName: item.apiName }))
    )
  }

  const handleUsernameClick = (username) => {
    setExpandedUsername(expandedUsername === username ? null : username)
  }

  // Chart data - only show users with IDs (horizontal bar chart)
  const chartData = useMemo(() => {
    const usersWithIds = filteredUniqueCounts.filter(u => u.count > 0)
    return {
      labels: usersWithIds.map(u => u.username),
      datasets: [{
        label: 'Unique Posts',
        data: usersWithIds.map(u => u.count),
        backgroundColor: 'rgba(75,192,192,0.6)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1
      }],
    }
  }, [filteredUniqueCounts])

  const chartOptions = {
    indexAxis: 'y', // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Unique Posts'
        }
      },
      y: {
        ticks: {
          font: {
            size: 12
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Unique Post Count by User (Users with Posts Only)',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 30,
        top: 10,
        bottom: 10
      }
    },
    barThickness: 20, // Fixed bar thickness for consistent spacing
    categoryPercentage: 0.8, // Space between categories
    barPercentage: 0.7 // Space between bars in same category
  }

  const handleReset = () => {
    setFilters(defaultFilters)
    fetchReports()
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📊 Database Report Dashboard</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {lastFetchTime && (
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Last updated: {lastFetchTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchReports}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: isLoading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isLoading ? '⏳ Loading...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {isLoading && data.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          Loading reports from database...
        </div>
      )}

      {!isLoading && data.length === 0 && !error && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p>No reports found in database</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Run API calls from Home or Batch page to generate reports
          </p>
        </div>
      )}

      {data.length > 0 && (
        <>
          <div style={{
            padding: '16px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '4px' }}>
                  Database Reports Loaded
                </div>
                <div style={{ fontSize: '14px', color: '#0369a1' }}>
                  Total reports: {data.length} | Total entries: {data.reduce((sum, item) => sum + ((item.report || []).length || 0), 0)}
                </div>
              </div>
              <button
                onClick={fetchFilteredReports}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Apply Filters to Database Query
              </button>
            </div>
          </div>

          <ReportFilters
            filters={filters}
            uniqueApis={uniqueApis}
            onChange={(p) => setFilters(f => ({ ...f, ...p }))}
            onReset={handleReset}
          />

          {/* Horizontal Bar Chart - Only users with IDs */}
          {chartData.labels.length > 0 && (
            <div className="mt" style={{ marginBottom: '32px' }}>
              <div style={{ height: `${Math.max(400, chartData.labels.length * 35)}px` }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Expandable Unique Post Count Table */}
          <div className="mt">
            <h3>Filtered Unique Post Count (by IDs)</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Click on a username to see detailed reports
            </p>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Date Range</th>
                  <th>Unique Posts</th>
                </tr>
              </thead>
              <tbody>
                {filteredUniqueCounts.map(({ username, count }) => (
                  <>
                    <tr key={username}>
                      <td>
                        <span
                          onClick={() => handleUsernameClick(username)}
                          style={{
                            color: '#2563eb',
                            cursor: 'pointer',
                            textDecoration: expandedUsername === username ? 'underline' : 'none',
                            fontWeight: expandedUsername === username ? 'bold' : 'normal',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#1d4ed8'
                            e.target.style.textDecoration = 'underline'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = '#2563eb'
                            e.target.style.textDecoration = expandedUsername === username ? 'underline' : 'none'
                          }}
                        >
                          {username}
                        </span>
                      </td>
                      <td>{filters.startDate && filters.endDate ? `${filters.startDate} - ${filters.endDate}` : 'All'}</td>
                      <td>{count}</td>
                    </tr>
                    {expandedUsername === username && (
                      <tr key={`${username}-details`}>
                        <td colSpan="3" style={{ padding: 0, background: '#f9fafb' }}>
                          <div style={{ padding: '16px', borderTop: '2px solid #2563eb' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>
                              Detailed Reports for {username}
                            </h4>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ background: '#e5e7eb' }}>
                                    <th style={{ padding: '8px' }}>API</th>
                                    <th style={{ padding: '8px' }}>Total</th>
                                    <th style={{ padding: '8px' }}>Have</th>
                                    <th style={{ padding: '8px' }}>No Have</th>
                                    <th style={{ padding: '8px' }}>IDs Count</th>
                                    <th style={{ padding: '8px' }}>Time</th>
                                    <th style={{ padding: '8px' }}>Pages</th>
                                    <th style={{ padding: '8px' }}>Timestamp</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getUserReports(username).map((report, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '8px' }}>{report.apiName}</td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>{report.total}</td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>{report.have}</td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>{report.nohave}</td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>
                                        {Array.isArray(report.ids) ? report.ids.length : 0}
                                      </td>
                                      <td style={{ padding: '8px' }}>{report.time}</td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>{report.pages}</td>
                                      <td style={{ padding: '8px' }}>
                                        {new Date(report.timestamp).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#fef3f2',
            border: '1px solid #fecaca',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#991b1b' }}>💡 Tips</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc2626', fontSize: '14px' }}>
              <li>Click on any username in the table above to expand and view detailed reports</li>
              <li>The chart only shows users who have media IDs (posts with actual content)</li>
              <li>Use "Apply Filters to Database Query" to fetch filtered data directly from database</li>
              <li>Reports are automatically saved to database when running API calls</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
