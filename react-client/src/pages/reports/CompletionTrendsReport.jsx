import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { getCompletionTrends } from '../../lib/dbApiClient.js'

export default function CompletionTrendsReport() {
  const [trends, setTrends] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { trends } = await getCompletionTrends({})
      setTrends(trends || [])
    } catch (err) {
      console.error('Error fetching completion trends:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const apiNames = [...new Set(trends.map(t => t.api_name))]
  const dates = [...new Set(trends.map(t => t.date))]

  // Chart 1: Completion Rate Timeline
  const timelineChartData = {
    labels: dates,
    datasets: apiNames.map((apiName, idx) => ({
      label: apiName,
      data: dates.map(date => {
        const item = trends.find(t => t.date === date && t.api_name === apiName)
        return item ? item.completion_rate : null
      }),
      borderColor: `hsl(${idx * 60}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 60}, 70%, 50%, 0.1)`,
      tension: 0.4
    }))
  }

  // Chart 2: Average Completion Rate by API
  const avgRates = apiNames.map(apiName => {
    const apiTrends = trends.filter(t => t.api_name === apiName)
    const avg = apiTrends.reduce((sum, t) => sum + t.completion_rate, 0) / apiTrends.length
    return { name: apiName, avg }
  }).sort((a, b) => b.avg - a.avg)

  const avgRatesChartData = {
    labels: avgRates.map(a => a.name),
    datasets: [{
      label: 'Average Completion Rate (%)',
      data: avgRates.map(a => a.avg),
      backgroundColor: avgRates.map(a => a.avg > 80 ? '#10b981' : a.avg > 50 ? '#f59e0b' : '#ef4444')
    }]
  }

  // Chart 3: Items Saved vs Total Items
  const itemsComparisonData = {
    labels: dates.slice(-20),
    datasets: apiNames.flatMap((apiName, idx) => [
      {
        label: `${apiName} - Total Items`,
        data: dates.slice(-20).map(date => {
          const item = trends.find(t => t.date === date && t.api_name === apiName)
          return item ? item.total_items : 0
        }),
        backgroundColor: `hsl(${idx * 60}, 70%, 70%)`,
        stack: apiName
      },
      {
        label: `${apiName} - Items Saved`,
        data: dates.slice(-20).map(date => {
          const item = trends.find(t => t.date === date && t.api_name === apiName)
          return item ? item.items_saved : 0
        }),
        backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
        stack: apiName
      }
    ])
  }

  // Chart 4: Success Rate Distribution
  const successRateBuckets = trends.reduce((acc, t) => {
    if (t.completion_rate >= 90) acc['90-100%'] = (acc['90-100%'] || 0) + 1
    else if (t.completion_rate >= 70) acc['70-90%'] = (acc['70-90%'] || 0) + 1
    else if (t.completion_rate >= 50) acc['50-70%'] = (acc['50-70%'] || 0) + 1
    else acc['< 50%'] = (acc['< 50%'] || 0) + 1
    return acc
  }, {})

  const distributionChartData = {
    labels: Object.keys(successRateBuckets),
    datasets: [{
      data: Object.values(successRateBuckets),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  // Chart 5: Recent Performance (Last 10 Dates)
  const recent10 = dates.slice(-10)
  const recentPerformanceData = {
    labels: recent10,
    datasets: apiNames.map((apiName, idx) => ({
      label: apiName,
      data: recent10.map(date => {
        const item = trends.find(t => t.date === date && t.api_name === apiName)
        return item ? item.completion_rate : null
      }),
      borderColor: `hsl(${idx * 60}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 60}, 70%, 50%, 0.2)`,
      fill: true,
      tension: 0.4
    }))
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>📊 Completion Rate Trends Analysis</h2>

      {trends.length > 0 && (
        <>
          {/* Chart 1: Completion Rate Timeline */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Completion Rate Timeline</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key="completion-trends-chart" data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Average Completion Rates */}
          <h3 style={{ marginBottom: '16px' }}>Average Completion Rate by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="avg-rates-chart" data={avgRatesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Items Comparison */}
          <h3 style={{ marginBottom: '16px' }}>Items Saved vs Total Items (Last 20 Days)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="items-comparison-chart" data={itemsComparisonData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Success Rate Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Success Rate Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key="distribution-chart" data={distributionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Recent Performance */}
          <h3 style={{ marginBottom: '16px' }}>Recent Performance Trends (Last 10 Days)</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Line key="recent-performance-chart" data={recentPerformanceData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Duplication Data (Last 50)</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>API Name</th>
                <th>Total Items</th>
                <th>Items Saved</th>
                <th>Duplication Rate</th>
              </tr>
            </thead>
            <tbody>
              {trends.slice(-50).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.date}</td>
                  <td>{item.api_name}</td>
                  <td>{item.total_items}</td>
                  <td style={{ color: '#059669' }}>{item.items_saved}</td>
                  <td style={{ fontWeight: '600', color: item.completion_rate > 80 ? '#059669' : '#dc2626' }}>{item.completion_rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
