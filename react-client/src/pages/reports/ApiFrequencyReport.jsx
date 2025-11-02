import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { getApiFrequency } from '../../lib/dbApiClient.js'

export default function ApiFrequencyReport() {
  const [frequency, setFrequency] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [granularity, setGranularity] = useState('day')

  useEffect(() => {
    fetchData()
  }, [granularity])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { frequency } = await getApiFrequency({ granularity })
      setFrequency(frequency || [])
    } catch (err) {
      console.error('Error fetching API frequency:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const apiNames = [...new Set(frequency.map(f => f.api_name))]
  const periods = [...new Set(frequency.map(f => f.period))]

  // Chart 1: API Frequency Timeline
  const timelineChartData = {
    labels: periods,
    datasets: apiNames.map((apiName, idx) => ({
      label: apiName,
      data: periods.map(period => {
        const item = frequency.find(f => f.period === period && f.api_name === apiName)
        return item ? item.call_count : 0
      }),
      borderColor: `hsl(${idx * 60}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 60}, 70%, 50%, 0.1)`,
      tension: 0.4
    }))
  }

  // Chart 2: Total Calls by API
  const totalsByApi = apiNames.map(apiName => ({
    name: apiName,
    total: frequency.filter(f => f.api_name === apiName).reduce((sum, f) => sum + f.call_count, 0)
  })).sort((a, b) => b.total - a.total)

  const totalsChartData = {
    labels: totalsByApi.map(a => a.name),
    datasets: [{
      label: 'Total API Calls',
      data: totalsByApi.map(a => a.total),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    }]
  }

  // Chart 3: API Usage Distribution
  const distributionChartData = {
    labels: totalsByApi.map(a => a.name),
    datasets: [{
      data: totalsByApi.map(a => a.total),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    }]
  }

  // Chart 4: Last 30 Periods Activity
  const recent30 = periods.slice(-30)
  const recent30Data = {
    labels: recent30,
    datasets: apiNames.map((apiName, idx) => ({
      label: apiName,
      data: recent30.map(period => {
        const item = frequency.find(f => f.period === period && f.api_name === apiName)
        return item ? item.call_count : 0
      }),
      backgroundColor: `hsl(${idx * 60}, 70%, 50%)`
    }))
  }

  // Chart 5: Growth Rate Analysis
  const recentPeriods = periods.slice(-10)
  const growthData = {
    labels: recentPeriods,
    datasets: apiNames.map((apiName, idx) => {
      const periodData = recentPeriods.map(period => {
        const item = frequency.find(f => f.period === period && f.api_name === apiName)
        return item ? item.call_count : 0
      })
      return {
        label: apiName,
        data: periodData,
        borderColor: `hsl(${idx * 60}, 70%, 50%)`,
        backgroundColor: `hsl(${idx * 60}, 70%, 50%, 0.1)`,
        fill: true,
        tension: 0.4
      }
    })
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>📞 API Call Frequency Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Granularity:
          <select value={granularity} onChange={e => setGranularity(e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px' }}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
      </div>

      {frequency.length > 0 && (
        <>
          {/* Chart 1: API Frequency Timeline */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>API Call Frequency Over Time</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key={`api-frequency-${granularity}`} data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Total Calls by API */}
          <h3 style={{ marginBottom: '16px' }}>Total Calls by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`totals-${granularity}`} data={totalsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: API Usage Distribution */}
          <h3 style={{ marginBottom: '16px' }}>API Usage Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`distribution-${granularity}`} data={distributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Last 30 Periods Stacked */}
          <h3 style={{ marginBottom: '16px' }}>Last 30 Periods - Stacked API Calls</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`stacked-${granularity}`} data={recent30Data} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} />
          </div>

          {/* Chart 5: Growth Rate (Last 10 Periods) */}
          <h3 style={{ marginBottom: '16px' }}>Recent Growth Trends (Last 10 Periods)</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key={`growth-${granularity}`} data={growthData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed API Call Data (Last 50)</h3>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>API Name</th>
                <th>Call Count</th>
              </tr>
            </thead>
            <tbody>
              {frequency.slice(-50).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.period}</td>
                  <td>{item.api_name}</td>
                  <td style={{ fontWeight: '600' }}>{item.call_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
