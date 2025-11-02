import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { getCompletionByApi } from '../../lib/dbApiClient.js'

export default function CompletionByApiReport() {
  const [rates, setRates] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { rates } = await getCompletionByApi()
      setRates(rates || [])
    } catch (err) {
      console.error('Error fetching completion by API:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart 1: Completion Rates
  const completionChartData = {
    labels: rates.map(r => r.api_name),
    datasets: [{
      label: 'Completion Rate (%)',
      data: rates.map(r => r.completion_rate),
      backgroundColor: rates.map(r => r.completion_rate > 80 ? '#10b981' : r.completion_rate > 50 ? '#f59e0b' : '#ef4444')
    }]
  }

  // Chart 2: Total Reports by API
  const reportsChartData = {
    labels: rates.map(r => r.api_name),
    datasets: [{
      label: 'Total Reports',
      data: rates.map(r => r.total_reports),
      backgroundColor: '#3b82f6'
    }]
  }

  // Chart 3: Items Saved vs Total Items
  const itemsChartData = {
    labels: rates.map(r => r.api_name),
    datasets: [
      {
        label: 'Total Items',
        data: rates.map(r => r.total_items),
        backgroundColor: '#e5e7eb'
      },
      {
        label: 'Items Saved',
        data: rates.map(r => r.items_saved),
        backgroundColor: '#10b981'
      }
    ]
  }

  // Chart 4: Success Rate Distribution
  const successDistribution = {
    labels: ['Excellent (>90%)', 'Good (70-90%)', 'Fair (50-70%)', 'Poor (<50%)'],
    datasets: [{
      data: [
        rates.filter(r => r.completion_rate > 90).length,
        rates.filter(r => r.completion_rate > 70 && r.completion_rate <= 90).length,
        rates.filter(r => r.completion_rate > 50 && r.completion_rate <= 70).length,
        rates.filter(r => r.completion_rate <= 50).length
      ],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  // Chart 5: Efficiency Score (Items per Report)
  const efficiencyChartData = {
    labels: rates.map(r => r.api_name),
    datasets: [{
      label: 'Items per Report',
      data: rates.map(r => (r.total_items / r.total_reports).toFixed(2)),
      backgroundColor: '#8b5cf6'
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>✅ API Completion Rates Analysis</h2>

      {rates.length > 0 && (
        <>
          {/* Chart 1: Completion Rates */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Completion Rates by API</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="completion-by-api-chart" data={completionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Total Reports */}
          <h3 style={{ marginBottom: '16px' }}>Total Reports by API</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="reports-chart" data={reportsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Items Comparison */}
          <h3 style={{ marginBottom: '16px' }}>Items Saved vs Total Items</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="items-chart" data={itemsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Success Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Success Rate Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Pie key="distribution-chart" data={successDistribution} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Efficiency Score */}
          <h3 style={{ marginBottom: '16px' }}>API Efficiency (Items per Report)</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key="efficiency-chart" data={efficiencyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed API Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>API Name</th>
                <th>Total Reports</th>
                <th>Total Items</th>
                <th>Items Saved</th>
                <th>Items/Report</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((api, idx) => (
                <tr key={idx}>
                  <td>{api.api_name}</td>
                  <td>{api.total_reports}</td>
                  <td>{api.total_items}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{api.items_saved}</td>
                  <td>{(api.total_items / api.total_reports).toFixed(2)}</td>
                  <td style={{ fontWeight: '600', color: api.completion_rate > 80 ? '#059669' : '#dc2626' }}>{api.completion_rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
