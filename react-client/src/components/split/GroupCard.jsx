export default function GroupCard({ index, urls, onCopy }) {
  const text = urls.join(',')
  return (
    <div className="group">
      <h3>Nhóm {index + 1} ({urls.length} URL{urls.length > 1 ? 's' : ''})</h3>
      <button onClick={() => onCopy(text)}>Copy</button>
      <pre>{text}</pre>
    </div>
  )
}

