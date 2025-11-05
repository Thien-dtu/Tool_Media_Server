import { useMemo, useRef, useState, useEffect } from 'react'
import ApiSelect from '../components/common/ApiSelect.jsx'
import ApiParamsEditor from '../components/common/ApiParamsEditor.jsx'
import StatusBanner from '../components/StatusBanner.jsx'
import ProgressBars from '../components/common/ProgressBars.jsx'
import CountDisplay from '../components/batch/CountDisplay.jsx'
import NearestLocationModal from '../components/common/NearestLocationModal.jsx'
import { apiBase, callApi, getSavedList, saveShuffledUrls, getLastCursors, saveLastCursor, saveReport, downloadItems, checkSavedStatus, preFetchUsers, getBatchProgress, saveBatchProgress, clearBatchProgress } from '../lib/apiClient.js'

const defaultApiParams = {
  get_list_fb_user_photos: JSON.stringify({ url: 'https://www.facebook.com/trang.quach.526875', type: '5', cursor: '' }, null, 2),
  get_list_fb_user_reels: JSON.stringify({ url: 'https://www.facebook.com/trang.quach.526875', cursor: '' }, null, 2),
  get_list_fb_highlights: JSON.stringify({ url: 'https://www.facebook.com/trang.quach.526875', cursor: '' }, null, 2),
  get_list_ig_post: JSON.stringify({ url: 'https://www.instagram.com/chanz_sweet.052', cursor: '' }, null, 2),
  get_list_ig_user_stories: JSON.stringify({ url: 'https://www.instagram.com/chanz_sweet.052/', raw: '' }, null, 2),
}

function getUsernameFromUrl(url) {
  if (!url) return 'unknown_user'
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('facebook.com')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0) {
        if (pathParts[0] === 'profile.php' && urlObj.searchParams.has('id')) {
          return urlObj.searchParams.get('id')
        } else if (pathParts[0] !== 'photo.php' && pathParts[0] !== 'story.php') {
          return pathParts[0]
        }
      }
    } else if (urlObj.hostname.includes('instagram.com')) {
      let path = urlObj.pathname.split('/').filter(Boolean)[0]
      if (path && path.endsWith('/')) path = path.slice(0, -1)
      return path
    }
  } catch {
    // noop
  }
  return 'unknown_user'
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Batch() {
  const [apiName, setApiName] = useState('get_list_fb_user_photos')
  const [apiParamsStr, setApiParamsStr] = useState(defaultApiParams['get_list_fb_user_photos'])
  const [overallMsg, setOverallMsg] = useState('')
  const [errors, setErrors] = useState([])
  const [startFromBeginning, setStartFromBeginning] = useState(false)
  const [getFromNearest, setGetFromNearest] = useState(false)
  const [autoDownload, setAutoDownload] = useState(false)
  const [resumeFromLast, setResumeFromLast] = useState(false)

  const [allResults, setAllResults] = useState([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState({ totalPct: 0, totalText: '', itemPct: 0, itemText: '' })
  const [isFetching, setIsFetching] = useState(false)
  const [modal, setModal] = useState({ open: false, username: '', cursor: '', pagesLoaded: 0, resolve: null })
  const [downloadedIds, setDownloadedIds] = useState(new Set())
  const [savedSet, setSavedSet] = useState(new Set())
  const [lastBatchProgress, setLastBatchProgress] = useState(null)

  const clientId = useMemo(() => (import.meta.env.VITE_CLIENT_ID), [])
  const urlLogRef = useRef([])

  // Load last batch progress on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        const data = await getBatchProgress()
        if (data.progress) {
          setLastBatchProgress(data.progress)
        }
      } catch (err) {
        console.error('Failed to load batch progress:', err)
      }
    }
    loadProgress()
  }, [])

  const setStatus = (msg, error = false) => {
    setOverallMsg(msg ? (error ? `❌ ${msg}` : msg) : '')
  }

  const fetchSavedList = async () => { try { const data = await getSavedList(); return data.list || [] } catch { return [] } }
  const refreshSavedSet = async () => {
    const list = await fetchSavedList()
    setSavedSet(new Set(list.map(e => `${e.username}|${e.id}`)))
  }

  const updateApiParamsForSelect = (name) => {
    setApiName(name)
    setApiParamsStr(defaultApiParams[name] || '{}')
  }

  const handleStartFromBeginningChange = (checked) => {
    setStartFromBeginning(checked)
    if (checked) setGetFromNearest(false)
  }

  const handleGetFromNearestChange = (checked) => {
    setGetFromNearest(checked)
    if (checked) setStartFromBeginning(false)
  }

  async function fetchApiDataForSingleUrl(apiNameLocal, paramsBase, pushStatus) {
    let results = []
    let nextCursor = null
    let page = 0
    let params = { ...paramsBase }
    do {
      if (nextCursor) params.cursor = nextCursor
      else if (!params.cursor) params.cursor = ''
      page++
      pushStatus(`Đang tải trang ${page} từ URL: ${params.url}...`)
      try {
        const data = await callApi({ id: clientId, apiname: apiNameLocal, apiparams: params })
        if (data.error) { 
          const errorMsg = `Lỗi API cho URL ${params.url}: ${data.error}`
          pushStatus(errorMsg)
          setErrors(prev => [...prev, errorMsg])
          break 
        }
        if (Array.isArray(data.result)) {
          const username = getUsernameFromUrl(params.url)
          results = results.concat(data.result.map(item => ({ ...item, originalUrl: params.url, username })))
          let newCursor = null
          if (data.result.length > 0) {
            const last = data.result[data.result.length - 1]
            if (last && last.cursor && last.cursor !== '' && last.cursor !== 'None') newCursor = last.cursor
          }
          nextCursor = newCursor
        } else {
          nextCursor = null
        }
        if (nextCursor) await sleep(500)
      } catch (e) {
        const errorMsg = `Lỗi Fetch cho URL ${params.url}: ${e.message}`
        pushStatus(errorMsg)
        setErrors(prev => [...prev, errorMsg])
        nextCursor = null
      }
    } while (nextCursor)
    return { data: results, pagesLoaded: page }
  }

  async function downloadItemsForUrl(fetchedData, username, urlIndex, totalUrls) {
    if (fetchedData.length === 0) return { downloaded: 0, alreadySaved: 0 }

    const statusPrefix = `URL ${urlIndex}/${totalUrls}`
    const pushStatus = (m) => setStatus(`${statusPrefix}: ${m}`)

    // Check saved status
    let itemsToDownload = []
    try {
      const mediaIds = fetchedData.map(item => item.id).filter(Boolean)
      const savedData = await checkSavedStatus(username, mediaIds)
      const savedIdsArray = savedData.saved || []
      const savedIdsSet = new Set(savedIdsArray)

      // Update savedSet
      setSavedSet(prevSet => {
        const newItems = savedIdsArray.map(id => `${username}|${id}`)
        return new Set([...prevSet, ...newItems])
      })

      itemsToDownload = fetchedData.filter(item => !savedIdsSet.has(item.id))
    } catch (e) {
      console.error('Error checking saved status:', e)
      itemsToDownload = fetchedData
    }

    if (itemsToDownload.length === 0) {
      pushStatus('✅ Tất cả đã lưu, không cần tải về')
      return { downloaded: 0, alreadySaved: fetchedData.length }
    }

    pushStatus(`Đang tải về ${itemsToDownload.length} mục...`)
    let completed = 0
    for (const item of itemsToDownload) {
      try {
        await downloadItems({ results: [item], apiName, clientId })
        completed++
        const percent = Math.round((completed / itemsToDownload.length) * 100)
        pushStatus(`Đang tải về... ${completed}/${itemsToDownload.length} (${percent}%)`)
        setDownloadedIds(prev => new Set(prev).add(`${item.username}|${item.id}`))
      } catch (e) {
        console.error('Download error:', e)
      }
    }

    pushStatus(`✅ Đã tải về ${completed}/${itemsToDownload.length} mục`)
    return { downloaded: completed, alreadySaved: fetchedData.length - itemsToDownload.length }
  }

  async function onMakeApiCall() {
    if (isFetching) return
    setIsFetching(true)
    // await refreshSavedSet()
    setAllResults([])

    urlLogRef.current = []
    setStatus('')
    setErrors([])

    let apiParamsObj
    try {
      apiParamsObj = JSON.parse(apiParamsStr)
    } catch {
      setStatus('API Parameters không phải JSON hợp lệ!', true)
      setIsFetching(false)
      return
    }

    const urlField = apiParamsObj.url
    if (!urlField) { setStatus('Không tìm thấy trường "url" trong API Parameters!', true); setIsFetching(false); return }
    const urlList = urlField.split(/(?:,\s*|\n)+/).map(u => u.trim()).filter(Boolean)
    if (urlList.length === 0) { setStatus('Không có URL nào!', true); setIsFetching(false); return }

    // Resume logic: filter out already completed URLs
    let urlsToProcess = urlList
    let completedUrls = []
    if (resumeFromLast && lastBatchProgress && lastBatchProgress.apiName === apiName) {
      completedUrls = lastBatchProgress.completedUrls || []
      const completedSet = new Set(completedUrls)
      urlsToProcess = urlList.filter(url => !completedSet.has(url))

      if (urlsToProcess.length === 0) {
        setStatus('✅ Tất cả các URL đã được xử lý trước đó!', false)
        setIsFetching(false)
        return
      }

      setStatus(`🔄 Phục hồi: Bỏ qua ${completedUrls.length} URL đã hoàn thành, còn ${urlsToProcess.length} URL cần xử lý`)
      await sleep(2000)
    }

    const report = []
    const startTime = Date.now()
    const shuffledUrlList = urlsToProcess.length > 1 ? shuffleArray(urlsToProcess) : urlsToProcess

    // Save the shuffled order for traceability when there are multiple URLs
    if (shuffledUrlList.length > 1) { try { await saveShuffledUrls({ apiName, urls: shuffledUrlList, timestamp: new Date().toISOString() }) } catch {} }

    // Initialize batch progress
    const batchStartTime = new Date().toISOString()
    await saveBatchProgress({
      apiName,
      timestamp: batchStartTime,
      totalUrls: urlList.length,
      completedUrls: [...completedUrls],
      completedUsernames: lastBatchProgress?.completedUsernames || [],
      lastProcessedIndex: -1
    })

    for (let i = 0; i < shuffledUrlList.length; i++) {
      const url = shuffledUrlList[i]
      const username = getUsernameFromUrl(url)
      const statusPrefix = `URL ${i + 1}/${shuffledUrlList.length}`
      const pushStatus = (m, error = false) => setStatus(error ? `❌ ${statusPrefix}: ${m}` : `${statusPrefix}: ${m}`)

      // Fetch UID for this user sequentially
      pushStatus('Đang kiểm tra UID...')
      try {
        const preFetchResult = await preFetchUsers([url], clientId)
        if (preFetchResult.summary.failed > 0) {
          pushStatus(`⚠️ Không thể lấy UID`, true)
        }
      } catch (err) {
        console.error('Pre-fetch error:', err)
        pushStatus(`⚠️ Lỗi khi kiểm tra UID: ${err.message}`, true)
      }

      let cursorToUse = ''
      if (apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') {
        if (startFromBeginning) {
          cursorToUse = ''
        } else {
          // Get cursor for this individual user
          pushStatus('Đang lấy cursor...')
          try {
            const resp = await getLastCursors({ apiName, usernames: [username] })
            const lastCursor = resp.lastCursors?.[username]

            if (getFromNearest) {
              cursorToUse = lastCursor?.cursor || ''
            } else {
              // No checkbox selected - show modal for individual choice
              const choice = await new Promise((resolve) => setModal({
                open: true,
                username,
                cursor: lastCursor?.cursor || '',
                pagesLoaded: lastCursor?.pagesLoaded || 0,
                resolve
              }))
              cursorToUse = choice ? (lastCursor?.cursor || '') : ''
            }
          } catch (err) {
            console.error('Error fetching cursor:', err)
            cursorToUse = ''
          }
        }
      }

      const currentApiParams = { ...apiParamsObj, url, cursor: cursorToUse }
      const startUrlTime = Date.now()
      const { data: fetchedData, pagesLoaded } = await fetchApiDataForSingleUrl(apiName, currentApiParams, pushStatus)
      setAllResults(prev => prev.concat(fetchedData))

      // Auto-download if enabled
      if (autoDownload && fetchedData.length > 0) {
        pushStatus('Bắt đầu tải về tự động...')
        await downloadItemsForUrl(fetchedData, username, i + 1, shuffledUrlList.length)
      }

      if ((apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') && fetchedData.length > 0) {
        const lastCursor = [...fetchedData].reverse().find(item => item.cursor && item.cursor !== 'None')?.cursor
        if (lastCursor) { try { await saveLastCursor({ apiName, username, cursor: lastCursor, pagesLoaded }) } catch {} }
      }

      const durationUrlStr = new Date(Date.now() - startUrlTime).toISOString().substr(11, 8)
      // const savedListForReport = await (async () => { try { return (await getSavedList()).list || [] } catch { return [] } })()
      // const totalItemsForUrl = fetchedData.length
      // const haveItemsForUrl = fetchedData.filter(item => savedListForReport.some(e => e.username === item.username && e.id === item.id)).length

      const totalItemsForUrl = fetchedData.length
      let haveItemsForUrl = 0;
      
      if (totalItemsForUrl > 0) {
          try {
              const mediaIds = fetchedData.map(item => item.id).filter(Boolean);
              const savedData = await checkSavedStatus(username, mediaIds); // Gọi API check
              
              const savedIdsArray = savedData.saved || []; // Đây LÀ MỘT MẢNG (Array)
              haveItemsForUrl = savedIdsArray.length; // Lấy số lượng đã lưu

              // Cập nhật state 'savedSet' với các mục mới tìm thấy
              // Giờ chúng ta có thể .map() trên 'savedIdsArray'
              setSavedSet(prevSet => {
                  const newItems = savedIdsArray.map(id => `${username}|${id}`);
                  return new Set([...prevSet, ...newItems]);
              });

          } catch (e) {
              console.error("Error checking saved status for report:", e);
              // Báo cáo 0 nếu kiểm tra thất bại
          }
      }

      const reportData = { apiName, report: [{ url, username, total: totalItemsForUrl, have: haveItemsForUrl, nohave: totalItemsForUrl - haveItemsForUrl, ids: fetchedData.map(item => item.id).filter(Boolean), time: durationUrlStr, pages: pagesLoaded }], timestamp: new Date().toISOString() }
      try { await saveReport(reportData) } catch {}

      report.push(reportData.report[0])
      urlLogRef.current.push(`${statusPrefix} hoàn thành: Tổng ${totalItemsForUrl}, Đã tải ${haveItemsForUrl}, Trang ${pagesLoaded}, Thời gian ${durationUrlStr}`)

      // Save progress after each URL
      completedUrls.push(url)
      const completedUsernames = lastBatchProgress?.completedUsernames || []
      if (!completedUsernames.includes(username)) {
        completedUsernames.push(username)
      }
      try {
        await saveBatchProgress({
          apiName,
          timestamp: batchStartTime,
          totalUrls: urlList.length,
          completedUrls: [...completedUrls],
          completedUsernames,
          lastProcessedIndex: i
        })
      } catch (err) {
        console.error('Failed to save batch progress:', err)
      }

      if (i < shuffledUrlList.length - 1) { setStatus(`Đã hoàn thành ${i + 1}/${shuffledUrlList.length}. Đang chờ 1 giây...`); await sleep(1000) }
    }

    const durationStr = new Date(Date.now() - startTime).toISOString().substr(11, 8)
    const autoDownloadSuffix = autoDownload ? ' (đã tự động tải về)' : ''

    // Clear batch progress on successful completion
    if (errors.length === 0) {
      try {
        await clearBatchProgress()
        setLastBatchProgress(null)
      } catch (err) {
        console.error('Failed to clear batch progress:', err)
      }
    }

    if (errors.length > 0) {
      setStatus(`⚠️ Hoàn thành trong ${durationStr} với ${errors.length} lỗi${autoDownloadSuffix}. Xem chi tiết bên dưới.`, true)
    } else {
      setStatus(`✅ Hoàn thành trong ${durationStr}${autoDownloadSuffix}.`)
    }
    setIsFetching(false)
  }

  const onDownloadAll = async () => {
    setIsDownloading(true)
    setProgress({ totalPct: 0, totalText: '', itemPct: 0, itemText: '' })
    try {
      // await refreshSavedSet()
      // const itemsToDownload = allResults.filter(item => !savedSet.has(`${item.username}|${item.id}`))

      // Kiểm tra lại trạng thái đã lưu cho TẤT CẢ các mục trong allResults
      const allUsernames = [...new Set(allResults.map(r => r.username))];
      let allSavedIds = new Set();

      try {
          await Promise.all(allUsernames.map(async (user) => {
              const idsForUser = allResults.filter(r => r.username === user).map(r => r.id).filter(Boolean);
              const savedData = await checkSavedStatus(user, idsForUser);
              savedData.saved.forEach(id => allSavedIds.add(`${user}|${id}`));
          }));
      } catch (e) {
          console.error("Failed to check all saved statuses before download:", e);
          setStatus('Lỗi khi kiểm tra danh sách đã lưu. Hủy tải về.', true);
          setIsDownloading(false); // (Chỉ thêm dòng này nếu là Batch.jsx)
          return;
      }

      const itemsToDownload = allResults.filter(item => !allSavedIds.has(`${item.username}|${item.id}`));

      if (itemsToDownload.length === 0) { setStatus('✅ Tất cả đã lưu, không có mục mới!'); return }
      let completed = 0
      for (const item of itemsToDownload) {
        try { await downloadItems({ results: [item], apiName, clientId }) } catch {}
        completed++
        const percent = Math.round((completed / itemsToDownload.length) * 100)
        setProgress({ totalPct: percent, totalText: `Đang tải về... (${percent}%)`, itemPct: percent, itemText: `Đã tải: ${completed} / ${itemsToDownload.length}` })
        setDownloadedIds(prev => new Set(prev).add(`${item.username}|${item.id}`))
      }
      setStatus(`✅ Đã tải về tất cả mục mới! ${completed} / ${itemsToDownload.length}`)
    } finally {
      setTimeout(() => setIsDownloading(false), 800)
    }
  }

  const results = allResults

  return (
    <div className="container">
      <h1>Batch Download - Tải về hàng loạt</h1>
      <div className="controls">
        <ApiSelect value={apiName} onChange={updateApiParamsForSelect} />
        <ApiParamsEditor value={apiParamsStr} onChange={setApiParamsStr} />
        
        {(apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') && (
          <div className="cursor-options" style={{ margin: '12px 0', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Cursor Options:</div>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={startFromBeginning} 
                onChange={(e) => handleStartFromBeginningChange(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Start from beginning (cursor: "")
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={getFromNearest} 
                onChange={(e) => handleGetFromNearestChange(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Get from nearest location (use saved cursor)
            </label>
            {!startFromBeginning && !getFromNearest && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                No option selected - will show modal for each URL
              </div>
            )}
          </div>
        )}

        <div className="auto-download-option" style={{ margin: '12px 0', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={(e) => setAutoDownload(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: '600', color: '#166534' }}>Automatically download after fetching each URL</span>
          </label>
          <div style={{ marginTop: '6px', fontSize: '14px', color: '#15803d' }}>
            When enabled, media will be downloaded immediately after each URL is processed (no need to click "Tải về tất cả")
          </div>
        </div>

        {lastBatchProgress && (
          <div className="recovery-status" style={{ margin: '12px 0', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
            <div style={{ marginBottom: '8px', fontWeight: '600', color: '#92400e' }}>
              ⚠️ Phát hiện batch chưa hoàn thành
            </div>
            <div style={{ fontSize: '14px', color: '#78350f', marginBottom: '8px' }}>
              <div>API: <strong>{lastBatchProgress.apiName}</strong></div>
              <div>Tổng số URL: <strong>{lastBatchProgress.totalUrls}</strong></div>
              <div>Đã hoàn thành: <strong>{lastBatchProgress.completedUrls?.length || 0}</strong> URL</div>
              <div>Còn lại: <strong>{lastBatchProgress.totalUrls - (lastBatchProgress.completedUrls?.length || 0)}</strong> URL</div>
              <div>Thời gian: {new Date(lastBatchProgress.timestamp).toLocaleString('vi-VN')}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={resumeFromLast}
                onChange={(e) => setResumeFromLast(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: '600', color: '#92400e' }}>Resume from last run (skip completed URLs)</span>
            </label>
            <button
              onClick={async () => {
                await clearBatchProgress()
                setLastBatchProgress(null)
                setResumeFromLast(false)
                setStatus('🗑️ Đã xóa tiến trình cũ')
              }}
              style={{ marginTop: '8px', padding: '6px 12px', fontSize: '13px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Xóa tiến trình cũ
            </button>
          </div>
        )}

        <div className="actions">
          <button onClick={onMakeApiCall} disabled={isFetching}>Make API Call</button>
          <button onClick={onDownloadAll} disabled={isDownloading || results.length === 0} style={{ marginLeft: 12 }}>Tải về tất cả</button>
        </div>
      </div>

      <StatusBanner message={overallMsg} />
      {errors.length > 0 && (
        <div className="errors" style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Lỗi ({errors.length}):</h3>
          {errors.map((error, idx) => (
            <div key={idx} style={{ marginBottom: '4px', color: '#dc2626', fontSize: '14px' }}>{error}</div>
          ))}
        </div>
      )}

      {isDownloading && <ProgressBars {...progress} />}
      
      <CountDisplay
        results={results}
        savedSet={savedSet}
        downloadedIds={downloadedIds}
      />

      <NearestLocationModal
        open={modal.open}
        username={modal.username}
        cursor={modal.cursor}
        pagesLoaded={modal.pagesLoaded}
        onClose={(choice) => { const resolver = modal.resolve; setModal(m => ({ ...m, open: false, resolve: null })); if (resolver) resolver(choice) }}
      />
    </div>
  )
}