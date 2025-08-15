export default function ResultsGrid({ results, savedSet = new Set(), onDownload, downloadingIds = new Set(), downloadedIds = new Set() }) {
    if (!results || results.length === 0) return <div className="results">Không tìm thấy kết quả nào.</div>
    const keyOf = (it) => `${it.username}|${it.id || it.post_id || ''}`
    return (
      <div className="results results-grid">
        {results.map((item, idx) => {
          const key = keyOf(item)
          const isSaved = savedSet.has(key) || downloadedIds.has(key)
          const isLoading = downloadingIds.has(key)
          return (
            <div key={idx} className="result-item">
              {item.video ? (
                <video src={item.video?.play_uri || item.video} controls style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              ) : (
                <img src={item.image} alt={item.caption || item.accessibility_caption || 'Image'} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              )}
              {Array.isArray(item.carousel) && item.carousel.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {item.carousel.map((c, i) => (
                    <div key={i} style={{ width: 88, height: 88, overflow: 'hidden', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                      {c.video ? (
                        <video src={c.video} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={c.image} alt={`carousel-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div><b>User:</b> {item.username}</div>
              <div><b>ID:</b> {item.post_id || item.id || ''}</div>
              {item.caption && <div><b>Caption:</b> {item.caption}</div>}
              <div style={{ marginTop: 6 }}>
                {isSaved ? (
                  <span style={{ color: 'green', fontWeight: 'bold' }}>Đã tải về</span>
                ) : isLoading ? (
                  <span style={{ color: '#555' }}>Đang tải...</span>
                ) : (
                  <button onClick={() => onDownload && onDownload(item)} style={{ marginTop: 4 }}>Tải về</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  
  