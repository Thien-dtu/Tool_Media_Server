import { useEffect } from 'react'

export default function NearestLocationModal({ open, username, cursor, pagesLoaded, onClose }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: '24px', borderRadius: 10, minWidth: 320, maxWidth: '92vw' }}>
        <h2 style={{ marginBottom: 12 }}>Resume from last location?</h2>
        <div style={{ marginBottom: 6 }}><b>User:</b> {username}</div>
        <div style={{ marginBottom: 6 }}><b>Total pages:</b> {pagesLoaded}</div>
        <div style={{ marginBottom: 12 }}><b>Last cursor:</b> <span style={{ wordBreak: 'break-all' }}>{cursor || '(none)'}</span></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => onClose(false)} style={{ background: '#e5e7eb', color: '#0f172a' }}>Start from beginning</button>
          <button onClick={() => onClose(true)}>Get from nearest location</button>
        </div>
      </div>
    </div>
  )
}