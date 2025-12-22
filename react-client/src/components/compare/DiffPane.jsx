import { useState } from 'react'
import { copyToClipboard } from '../../utils/helpers'

export default function DiffPane({ title, diffs }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!diffs || diffs.length === 0) return
    const text = diffs.join('\n')

    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--border, #ccc)',
      background: 'var(--card-bg, #fafafa)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>
          {title} <span style={{ fontSize: '14px', color: 'var(--muted, #666)', fontWeight: 'normal' }}>({diffs ? diffs.length : 0})</span>
        </h3>
        {diffs && diffs.length > 0 && (
          <button
            onClick={handleCopy}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: copied ? 'var(--success-bg, #e2f0e8)' : 'var(--primary, #3b82f6)',
              color: copied ? 'var(--success-text, #166534)' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              minWidth: '60px'
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div style={{
        flex: 1,
        background: 'var(--input-bg, #fff)',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid var(--border, #eee)',
        overflowY: 'auto',
        maxHeight: '400px',
        fontSize: '13px',
        fontFamily: 'monospace'
      }}>
        {(!diffs || diffs.length === 0) ? (
          <div style={{ color: 'var(--muted, #999)', fontStyle: 'italic' }}>Không có khác biệt.</div>
        ) : (
          diffs.map((d, i) => (
            <div key={i} style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: i < diffs.length - 1 ? '1px solid var(--border, #f0f0f0)' : 'none'
            }}>
              {d}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

