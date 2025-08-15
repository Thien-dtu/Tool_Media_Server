export default function FilePicker({ label, onChange }) {
  return (
    <label>{label} <input type="file" accept=".json,.jsonl" onChange={(e) => onChange(e.target.files?.[0] || null)} /></label>
  )
}

