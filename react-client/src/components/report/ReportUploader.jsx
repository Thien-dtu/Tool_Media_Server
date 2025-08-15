export default function ReportUploader({ onData }) {
  const onUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const parsed = text.split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
      onData(parsed)
    }
    reader.readAsText(file)
  }
  return (
    <div className="panel">
      <label>Upload JSONL File <input type="file" accept=".jsonl" onChange={onUpload} /></label>
    </div>
  )
}

