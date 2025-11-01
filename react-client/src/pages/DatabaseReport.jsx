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
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import ReportFilters from '../components/report/ReportFilters.jsx'
import ReportChart from '../components/report/ReportChart.jsx'
import ReportTable from '../components/report/ReportTable.jsx'
import { getRecentReports, getReportsByDateRange, queryReports } from '../lib/dbApiClient.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export default function DatabaseReport() {
  const defaultFilters = {
    apiName: 'get_list_ig_user_stories',
    startDate: '',
    endDate: '',
    usernames: [],
    topN: 99999,
    sortBy: 'total',
    sortOrder: 'desc',
    searchUsername: '',
  }

  const [data, setData] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetchTime, setLastFetchTime] = useState(null)

  const uniqueApis = useMemo(() => [...new Set(data.map(item => item.apiName))], [data])
  const uniqueUsernames = useMemo(() => [...new Set(data.flatMap(item => item.report.map(r => r.username)))], [data])

  // Load data from database on mount
  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setIsLoading(true)
    setError('')
    try {
      // Fetch recent reports (last 100)
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

      if (filters.startDate && filters.endDate) {
        // Use date range endpoint if both dates specified
        const startISO = dayjs(filters.startDate).toISOString()
        const endISO = dayjs(filters.endDate).toISOString()
        const result = await getReportsByDateRange(startISO, endISO)
        reports = result.reports || []
      } else if (filters.apiName || filters.searchUsername) {
        // Use query endpoint for advanced filtering
        const queryParams = {
          apiName: filters.apiName || undefined,
          username: filters.searchUsername || undefined,
          startDate: filters.startDate ? dayjs(filters.startDate).toISOString() : undefined,
          endDate: filters.endDate ? dayjs(filters.endDate).toISOString() : undefined,
          limit: 100
        }
        const result = await queryReports(queryParams)
        reports = result.reports || []
      } else {
        // Default: fetch recent reports
        const result = await getRecentReports(100)
        reports = result.reports || []
      }

      setData(reports)
      setLastFetchTime(new Date())
    } catch (err) {
      console.error('Error fetching filtered reports:', err)
      setError(`Failed to fetch reports: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filterData = () => {
    let filtered = data
    if (filters.apiName) filtered = filtered.filter(item => item.apiName === filters.apiName)
    if (filters.startDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrAfter(dayjs(filters.startDate)))
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => dayjs(item.timestamp).isSameOrBefore(dayjs(filters.endDate)))
    }
    if (filters.usernames.length > 0 && !filters.usernames.includes('all')) {
      filtered = filtered.filter(item => item.report.some(r => filters.usernames.includes(r.username)))
    }
    if (filters.searchUsername) {
      filtered = filtered.filter(item => item.report.some(r => r.username.toLowerCase().includes(filters.searchUsername.toLowerCase())))
    }
    let flatReports = filtered.flatMap(item => item.report.map(r => ({ ...r, timestamp: item.timestamp, apiName: item.apiName })))
    flatReports.sort((a, b) => (filters.sortOrder === 'desc' ? (b[filters.sortBy] ?? 0) - (a[filters.sortBy] ?? 0) : (a[filters.sortBy] ?? 0) - (b[filters.sortBy] ?? 0)))
    return flatReports.slice(0, filters.topN)
  }

  const filtered = filterData()
  const chartData = useMemo(() => ({
    labels: filtered.map(i => i.username),
    datasets: [{ label: 'Total Posts', data: filtered.map(i => i.total), backgroundColor: 'rgba(75,192,192,0.2)', borderColor: 'rgba(75,192,192,1)', borderWidth: 1 }],
  }), [filtered])

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
      item.report.forEach(r => {
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
                  Total reports: {data.length} | Total entries: {data.reduce((sum, item) => sum + (item.report?.length || 0), 0)}
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

          <ReportChart chartData={chartData} />

          <ReportTable rows={filtered} />

          <div className="mt">
            <h3>Filtered Unique Post Count (by IDs)</h3>
            <table>
              <thead>
                <tr><th>Username</th><th>Date Range</th><th>Unique Posts</th></tr>
              </thead>
              <tbody>
                {filteredUniqueCounts.map(({ username, count }) => (
                  <tr key={username}><td>{username}</td><td>{filters.startDate && filters.endDate ? `${filters.startDate} - ${filters.endDate}` : 'All'}</td><td>{count}</td></tr>
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
              <li>Use "Apply Filters to Database Query" to fetch filtered data directly from database (faster for large datasets)</li>
              <li>Local filters (below) work on loaded data only</li>
              <li>Reports are automatically saved to database when running API calls</li>
              <li>Increase "Recent Reports" limit in database settings for more data</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
