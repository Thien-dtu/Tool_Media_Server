import { Bar } from 'react-chartjs-2'

export default function ReportChart({ chartData }) {
  if (!chartData) return null
  return (
    <div className="chart">
      <Bar data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
    </div>
  )
}

