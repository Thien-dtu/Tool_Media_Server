import { useState } from 'react'
import UrlInput from '../components/split/UrlInput.jsx'
import GroupCard from '../components/split/GroupCard.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'

export default function Split() {
  const [rawUrls, setRawUrls] = useState('')
  const [file, setFile] = useState(null)
  const [groupCount, setGroupCount] = useState(3)
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')

  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e.target.error)
      reader.readAsText(file)
    })
  }

  async function onProcess() {
    setError('')
    setGroups([])
    let input = rawUrls
    if (file) {
      try { input = await readFileContent(file) } catch (e) { setError(`Lỗi đọc tệp: ${e.message}`); return }
    }
    if (!input.trim()) { setError('Vui lòng nhập các URL hoặc tải lên tệp TXT.'); return }
    if (!groupCount || groupCount <= 0) { setError('Số lượng nhóm phải là một số dương.'); return }
    const urls = input.split(',').map(u => u.trim()).filter(Boolean)
    if (urls.length === 0) { setError('Không tìm thấy URL nào hợp lệ.'); return }
    if (groupCount > urls.length) { setError('Số lượng nhóm không thể lớn hơn tổng số URL.'); return }

    const total = urls.length
    const base = Math.floor(total / groupCount)
    let remainder = total % groupCount
    let idx = 0
    const result = []
    for (let i = 0; i < groupCount; i++) {
      let size = base
      if (remainder > 0) { size++; remainder-- }
      const group = urls.slice(idx, idx + size)
      idx += size
      result.push(group)
    }
    setGroups(result)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="container">
      <h2>Chia URL thành Nhóm</h2>
      <UrlInput value={rawUrls} onChange={setRawUrls} />
      <div>-- HOẶC --</div>
      <label>Tải lên tệp TXT chứa URL: <input type="file" accept=".txt" onChange={e => setFile(e.target.files[0] || null)} /></label>
      <label>Số lượng nhóm muốn chia: <input type="number" min={1} value={groupCount} onChange={e => setGroupCount(parseInt(e.target.value) || 1)} /></label>
      <button onClick={onProcess}>Chia URL</button>
      <ErrorBanner message={error} />
      <div className="results">
        {groups.map((g, i) => (
          <GroupCard key={i} index={i} urls={g} onCopy={(t) => copyToClipboard(t)} />
        ))}
      </div>
    </div>
  )
}

