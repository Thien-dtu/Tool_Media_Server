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

  function parseTitles(content) {
    try {
      const parsed = JSON.parse(content)
      if (parsed.relationships_following && Array.isArray(parsed.relationships_following)) {
        return parsed.relationships_following
          .map(item => item.title)
          .filter(title => title)
      }
      return []
    } catch (e) {
      throw new Error('Invalid JSON format')
    }
  }

  async function onCompare() {
    setError('')
    setDiff1([])
    setDiff2([])
    if (!file1 || !file2) { setError('Vui lòng chọn cả hai tệp để so sánh.'); return }
    try {
      const content1 = await readFileContent(file1)
      const content2 = await readFileContent(file2)

      const titles1 = parseTitles(content1)
      const titles2 = parseTitles(content2)

      const set1 = new Set(titles1)
      const set2 = new Set(titles2)

      const formatUrl = title => `https://www.instagram.com/${title}`

      // Diff 1: Titles in File 1 that ALSO appear in File 2 (Intersection)
      const common = titles1
        .filter(title => set2.has(title))
        .map(formatUrl)

      // Diff 2: Titles in File 2 that DO NOT appear in File 1 (New in File 2)
      const newIn2 = titles2
        .filter(title => !set1.has(title))
        .map(formatUrl)

      setDiff1(common)
      setDiff2(newIn2)
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
      <div className="grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        alignItems: 'start',
        marginTop: '20px'
      }}>
        <DiffPane title="Khác biệt trong Tệp 1" diffs={diff1} />
        <DiffPane title="Khác biệt trong Tệp 2" diffs={diff2} />
      </div>
    </div>
  )
}

