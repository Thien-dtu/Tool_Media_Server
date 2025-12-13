import React, { useMemo, useState, useEffect } from 'react'
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
import { getRecentReports, getReportStats, queryReports } from '../lib/dbApiClient.js'

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
  const [stats, setStats] = useState([])
  const [showStats, setShowStats] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 50

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
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { stats } = await getReportStats()
      setStats(stats || [])
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchReports = async () => {
    setIsLoading(true)
    setError('')
    try {
      const { reports } = await getRecentReports() // No limit - fetch all reports
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
        // Split comma-separated usernames/UIDs into arrays
        const usernames = filters.searchUsername
          ? filters.searchUsername.split(',').map(u => u.trim()).filter(u => u)
          : undefined

        const uids = filters.searchUid
          ? filters.searchUid.split(',').map(u => u.trim()).filter(u => u)
          : undefined

        const queryParams = {
          apiName: filters.apiName || undefined,
          usernames: usernames,
          uids: uids,
          startDate: filters.startDate ? dayjs(filters.startDate).toISOString() : undefined,
          endDate: filters.endDate ? dayjs(filters.endDate).toISOString() : undefined
          // No limit - fetch all matching reports
        }
        const result = await queryReports(queryParams)
        reports = result.reports || []
      } else {
        const result = await getRecentReports() // No limit - fetch all reports
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

  // Optimize: Memoize the base filtered list (date & apiName) separately
  // This prevents re-running expensive date parsing/filtering when only visualization filters change (searchUsername, topN, etc)
  const filteredReports = useMemo(() => {
    let result = data;
    if (filters.apiName) {
        result = result.filter(item => item.apiName === filters.apiName)
    }

    // Optimize date filtering by creating dayjs objects once outside the loop
    const startDate = filters.startDate ? dayjs(filters.startDate) : null
    const endDate = filters.endDate ? dayjs(filters.endDate) : null

    if (startDate || endDate) {
        result = result.filter(item => {
            const itemDate = dayjs(item.timestamp)
            if (startDate && !itemDate.isSameOrAfter(startDate)) return false
            if (endDate && !itemDate.isSameOrBefore(endDate)) return false
            return true
        })
    }
    return result
  }, [data, filters.apiName, filters.startDate, filters.endDate])

  const filteredUniqueCounts = useMemo(() => {
    const userIdSet = {}

    // Parse comma-separated usernames and UIDs for frontend filtering
    const usernameFilters = filters.searchUsername
      ? filters.searchUsername.split(',').map(u => u.trim().toLowerCase()).filter(u => u)
      : []

    const uidFilters = filters.searchUid
      ? filters.searchUid.split(',').map(u => u.trim()).filter(u => u)
      : []

    const hasUsernameFilters = usernameFilters.length > 0
    const hasUidFilters = uidFilters.length > 0

    // Optimize: Use for loops instead of forEach for better performance
    const reportsLength = filteredReports.length
    for (let i = 0; i < reportsLength; i++) {
        const item = filteredReports[i]
        const reports = item.report || []
        const rLength = reports.length

        for (let j = 0; j < rLength; j++) {
            const r = reports[j]
            // Skip if username is null
            if (!r.username) continue

            // Frontend filtering: if searchUsername is set, only show matching usernames
            if (hasUsernameFilters) {
              const rUsernameLower = r.username.toLowerCase()
              let matchesFilter = false
              for (let k = 0; k < usernameFilters.length; k++) {
                  if (rUsernameLower.includes(usernameFilters[k])) {
                      matchesFilter = true
                      break
                  }
              }
              if (!matchesFilter) continue
            }

            // Frontend filtering: if searchUid is set, only show matching UIDs
            if (hasUidFilters && r.uid) {
              let matchesFilter = false
              for (let k = 0; k < uidFilters.length; k++) {
                  if (r.uid.includes(uidFilters[k])) {
                      matchesFilter = true
                      break
                  }
              }
              if (!matchesFilter) continue
            }

            if (!userIdSet[r.username]) userIdSet[r.username] = new Set()

            if (Array.isArray(r.ids)) {
                const ids = r.ids
                const idsLength = ids.length
                for (let k = 0; k < idsLength; k++) {
                    userIdSet[r.username].add(ids[k])
                }
            }
        }
    }

    return Object.entries(userIdSet)
      .map(([username, set]) => ({ username, count: set.size }))
      .sort((a, b) => (filters.sortOrder === 'desc' ? b.count - a.count : a.count - b.count))
      .slice(0, filters.topN || 10)
  }, [filteredReports, filters.searchUsername, filters.searchUid, filters.sortOrder, filters.topN])

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredUniqueCounts.length])

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUniqueCounts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredUniqueCounts, currentPage])

  const totalPages = Math.ceil(filteredUniqueCounts.length / ITEMS_PER_PAGE)

  const handleUsernameClick = (username) => {
    setExpandedUsername(expandedUsername === username ? null : username)
  }

  // Optimize: Memoize expanded user reports to prevent re-filtering on every render
  const expandedUserReports = useMemo(() => {
      if (!expandedUsername) return []

      return filteredReports.flatMap(item =>
        (item.report || [])
          .filter(r => r.username === expandedUsername)
          .map(r => ({ ...r, timestamp: item.timestamp, apiName: item.apiName }))
      )
  }, [filteredReports, expandedUsername])

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

      {/* API Performance Statistics */}
      {stats.length > 0 && (
        <div style={{
          marginBottom: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setShowStats(!showStats)}
            style={{
              width: '100%',
              padding: '16px',
              background: '#f9fafb',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: '600',
              fontSize: '16px',
              color: '#374151'
            }}
          >
            <span>📈 API Performance Statistics</span>
            <span>{showStats ? '▼' : '▶'}</span>
          </button>
          {showStats && (
            <div style={{ padding: '16px', background: 'white' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {stats.map(stat => (
                  <div key={stat.api_name} style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#1f2937',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #3b82f6'
                    }}>
                      {stat.api_name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Total Calls:</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{stat.total_calls}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Unique Users:</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{stat.unique_users}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Items Fetched:</span>
                        <span style={{ fontWeight: '600', color: '#10b981' }}>{stat.total_items_fetched || 0}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Items Saved:</span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>{stat.total_items_saved || 0}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Avg Duration:</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>
                          {stat.avg_duration_seconds ? `${stat.avg_duration_seconds.toFixed(1)}s` : 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Avg Pages:</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>
                          {stat.avg_pages_per_call ? stat.avg_pages_per_call.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Filtered Unique Post Count (by IDs)</h3>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing {Math.min(filteredUniqueCounts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredUniqueCounts.length, currentPage * ITEMS_PER_PAGE)} of {filteredUniqueCounts.length}
              </span>
            </div>
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
                {paginatedData.map(({ username, count }) => (
                  <React.Fragment key={username}>
                    <tr>
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
                                  {expandedUserReports.map((report, idx) => (
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
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '16px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f3f4f6' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
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
