export default function DiffPane({ title, diffs }) {
  return (
    <div>
      <h3>{title}</h3>
      {(!diffs || diffs.length === 0) ? <p>Không có khác biệt.</p> : diffs.map((d, i) => <pre key={i}>{d}</pre>)}
    </div>
  )
}

