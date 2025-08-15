export default function UrlTextareas({ a, b, onA, onB }) {
  return (
    <>
      <label>Chuỗi URL thứ nhất:<textarea rows={6} value={a} onChange={(e) => onA(e.target.value)} /></label>
      <label>Chuỗi URL thứ hai:<textarea rows={6} value={b} onChange={(e) => onB(e.target.value)} /></label>
    </>
  )
}

