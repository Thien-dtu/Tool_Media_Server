export default function ProgressBars({ totalPct, totalText, itemPct, itemText }) {
  return (
    <div className="progress">
      <div className="bar" style={{ width: `${totalPct}%` }} />
      <span>{totalText}</span>
      <div className="bar2" style={{ width: `${itemPct}%` }} />
      <span>{itemText}</span>
    </div>
  )
}