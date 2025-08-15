import { useState } from 'react'
import UrlTextareas from '../components/test/UrlTextareas.jsx'

export default function Test() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [result, setResult] = useState('')
  const [count, setCount] = useState(0)

  function compare() {
    const urls1 = a.split(',').map(u => u.trim()).filter(Boolean)
    const urls2 = new Set(b.split(',').map(u => u.trim()).filter(Boolean))
    const uniqueUrls = urls1.filter(url => !urls2.has(url))
    setCount(uniqueUrls.length)
    setResult(uniqueUrls.length > 0 ? uniqueUrls.join(',') : 'Không có URL nào khác biệt.')
  }

  return (
    <div className="container">
      <h2>So sánh 2 chuỗi URL Instagram</h2>
      <UrlTextareas a={a} b={b} onA={setA} onB={setB} />
      <button onClick={compare}>So sánh</button>
      <h3>✅ Kết quả:</h3>
      <p>Số lượng URL chỉ có trong chuỗi thứ nhất: {count}</p>
      <pre>{result}</pre>
    </div>
  )
}

