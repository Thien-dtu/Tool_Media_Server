import { useMemo, useState } from 'react'
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
import ReportUploader from '../components/report/ReportUploader.jsx'
import ReportFilters from '../components/report/ReportFilters.jsx'
import ReportChart from '../components/report/ReportChart.jsx'
import ReportTable from '../components/report/ReportTable.jsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export default function Report() {
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

  const uniqueApis = useMemo(() => [...new Set(data.map(item => item.apiName))], [data])
  const uniqueUsernames = useMemo(() => [...new Set(data.flatMap(item => item.report.map(r => r.username)))], [data])

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

  const onData = (parsed) => setData(parsed)

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

  return (
    <div className="container">
      <h2>Social Media Data Dashboard</h2>
      <ReportUploader onData={onData} />

      {data.length > 0 && (
        <>
          <ReportFilters
            filters={filters}
            uniqueApis={uniqueApis}
            onChange={(p) => setFilters(f => ({ ...f, ...p }))}
            onReset={() => setFilters(defaultFilters)}
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
        </>
      )}
    </div>
  )
}

