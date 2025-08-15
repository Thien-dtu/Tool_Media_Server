import { useState } from 'react'
import FilePicker from '../components/compare/FilePicker.jsx'
import DiffPane from '../components/compare/DiffPane.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'

export default function Compare() {
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [diff1, setDiff1] = useState([])
  const [diff2, setDiff2] = useState([])
  const [error, setError] = useState('')

  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e.target.error)
      reader.readAsText(file)
    })
  }

  function parseFileContent(content, fileName) {
    if (fileName.endsWith('.json')) {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : [parsed]
    } else if (fileName.endsWith('.jsonl')) {
      return content.split('\n').filter(l => l.trim() !== '').map(l => JSON.parse(l))
    }
    throw new Error('Unsupported file format')
  }

  async function onCompare() {
    setError('')
    setDiff1([])
    setDiff2([])
    if (!file1 || !file2) { setError('Vui lòng chọn cả hai tệp để so sánh.'); return }
    try {
      const content1 = await readFileContent(file1)
      const content2 = await readFileContent(file2)
      const parsed1 = parseFileContent(content1, file1.name)
      const parsed2 = parseFileContent(content2, file2.name)
      const out1 = []
      const out2 = []
      const max = Math.max(parsed1.length, parsed2.length)
      for (let i = 0; i < max; i++) {
        const a = parsed1[i] || null
        const b = parsed2[i] || null
        const sa = a ? JSON.stringify(a, null, 2) : null
        const sb = b ? JSON.stringify(b, null, 2) : null
        if (sa !== sb) {
          if (sa !== null) out1.push(sa)
          if (sb !== null) out2.push(sb)
        }
      }
      setDiff1(out1)
      setDiff2(out2)
    } catch (e) {
      setError(`Đã xảy ra lỗi khi xử lý tệp: ${e.message}`)
    }
  }

  return (
    <div className="container">
      <h2>So sánh và Hợp nhất tệp JSONL/JSON</h2>
      <div className="panel">
        <FilePicker label="Tệp 1" onChange={setFile1} />
        <FilePicker label="Tệp 2" onChange={setFile2} />
        <button onClick={onCompare}>So sánh</button>
      </div>
      <ErrorBanner message={error} />
      <div className="grid">
        <DiffPane title="Khác biệt trong Tệp 1" diffs={diff1} />
        <DiffPane title="Khác biệt trong Tệp 2" diffs={diff2} />
      </div>
    </div>
  )
}

