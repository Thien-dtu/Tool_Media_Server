export default function UrlInput({ value, onChange }) {
  return (
    <label>Dán các URL (cách nhau bởi dấu phẩy):<textarea rows={8} value={value} onChange={(e) => onChange(e.target.value)} /></label>
  )
}

