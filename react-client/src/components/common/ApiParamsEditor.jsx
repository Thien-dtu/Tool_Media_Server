export default function ApiParamsEditor({ value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      API Parameters (JSON):
      <textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}