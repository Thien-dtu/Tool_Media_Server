export default function ResultsGrid({ results, savedSet = new Set(), onDownload, downloadingIds = new Set(), downloadedIds = new Set(), onMediaClick, flattenedMedia = [] }) {
    if (!results || results.length === 0) return <div className="results">Không tìm thấy kết quả nào.</div>
    const keyOf = (it) => `${it.username}|${it.id || it.post_id || ''}`

    // Helper to find flattened index for main media
    const getMainMediaIndex = (itemIndex) => {
      return flattenedMedia.findIndex(m => m.itemIndex === itemIndex && m.carouselIndex === null)
    }

    // Helper to find flattened index for carousel media
    const getCarouselMediaIndex = (itemIndex, carouselIndex) => {
      return flattenedMedia.findIndex(m => m.itemIndex === itemIndex && m.carouselIndex === carouselIndex)
    }

    return (
      <div className="results results-grid">
        {results.map((item, idx) => {
          const key = keyOf(item)
          const isSaved = savedSet.has(key) || downloadedIds.has(key)
          const isLoading = downloadingIds.has(key)
          const mainMediaIndex = getMainMediaIndex(idx)

          return (
            <div key={idx} className="result-item">
              {item.video ? (
                <video
                  src={item.video?.play_uri || item.video}
                  controls
                  style={{ width: '100%', height: 180, objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => onMediaClick && onMediaClick(mainMediaIndex)}
                />
              ) : (
                <img
                  src={item.image}
                  alt={item.caption || item.accessibility_caption || 'Image'}
                  style={{ width: '100%', height: 180, objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => onMediaClick && onMediaClick(mainMediaIndex)}
                />
              )}
              {Array.isArray(item.carousel) && item.carousel.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {item.carousel.map((c, i) => {
                    const carouselMediaIndex = getCarouselMediaIndex(idx, i)
                    return (
                      <div key={i} style={{ width: 88, height: 88, overflow: 'hidden', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => onMediaClick && onMediaClick(carouselMediaIndex)}>
                        {c.video ? (
                          <video src={c.video} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        ) : (
                          <img src={c.image} alt={`carousel-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    )
                  })}
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
  
  