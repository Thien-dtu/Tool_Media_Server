import { useMemo, useRef, useState } from 'react'
import ApiSelect from '../components/common/ApiSelect.jsx'
import ApiParamsEditor from '../components/common/ApiParamsEditor.jsx'
import StatusBanner from '../components/StatusBanner.jsx'
import ProgressBars from '../components/common/ProgressBars.jsx'
import ResultsGrid from '../components/home/ResultsGrid.jsx'
import NearestLocationModal from '../components/common/NearestLocationModal.jsx'
import { apiBase, callApi, getSavedList, saveShuffledUrls, getLastCursors, saveLastCursor, saveReport, downloadItems } from '../lib/apiClient.js'

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

export default function Home() {
  const [apiName, setApiName] = useState('get_list_fb_user_photos')
  const [apiParamsStr, setApiParamsStr] = useState(defaultApiParams['get_list_fb_user_photos'])
  const [overallMsg, setOverallMsg] = useState('')
  const [errors, setErrors] = useState([])
  const [multiReportHtml, setMultiReportHtml] = useState('')
  const [startFromBeginning, setStartFromBeginning] = useState(false)
  const [getFromNearest, setGetFromNearest] = useState(false)
  const [allResults, setAllResults] = useState([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState({ totalPct: 0, totalText: '', itemPct: 0, itemText: '' })
  const [isFetching, setIsFetching] = useState(false)
  const [modal, setModal] = useState({ open: false, username: '', cursor: '', pagesLoaded: 0, resolve: null })
  const [downloadingIds, setDownloadingIds] = useState(new Set())
  const [downloadedIds, setDownloadedIds] = useState(new Set())
  const [savedSet, setSavedSet] = useState(new Set())

  const clientId = useMemo(() => (import.meta.env.VITE_CLIENT_ID), [])
  const urlLogRef = useRef([])

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

  async function onMakeApiCall() {
    if (isFetching) return
    setIsFetching(true)
    await refreshSavedSet()
    setAllResults([])
    setMultiReportHtml('')
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

    const report = []
    const startTime = Date.now()
    const shuffledUrlList = urlList.length > 1 ? shuffleArray(urlList) : urlList

    // Save the shuffled order for traceability when there are multiple URLs
    if (shuffledUrlList.length > 1) { try { await saveShuffledUrls({ apiName, urls: shuffledUrlList, timestamp: new Date().toISOString() }) } catch {} }

    let lastCursors = {}
    if (apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') {
      try { const usernames = shuffledUrlList.map(getUsernameFromUrl); const resp = await getLastCursors({ apiName, usernames }); lastCursors = resp.lastCursors || {} } catch {}
    }

    for (let i = 0; i < shuffledUrlList.length; i++) {
      const url = shuffledUrlList[i]
      const username = getUsernameFromUrl(url)
      const statusPrefix = `URL ${i + 1}/${shuffledUrlList.length}`
      const pushStatus = (m) => setStatus(`${statusPrefix}: ${m}`)

      let cursorToUse = ''
      if (apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') {
        if (startFromBeginning) {
          cursorToUse = ''
        } else if (getFromNearest) {
          const { cursor } = lastCursors[username] || { cursor: '' }
          cursorToUse = cursor || ''
        } else {
          // No checkbox selected - show modal for individual choice
          const { cursor, pagesLoaded } = lastCursors[username] || { cursor: '', pagesLoaded: 0 }
          const choice = await new Promise((resolve) => setModal({ open: true, username, cursor, pagesLoaded, resolve }))
          cursorToUse = choice ? cursor : ''
        }
      }

      const currentApiParams = { ...apiParamsObj, url, cursor: cursorToUse }
      const startUrlTime = Date.now()
      const { data: fetchedData, pagesLoaded } = await fetchApiDataForSingleUrl(apiName, currentApiParams, pushStatus)
      setAllResults(prev => prev.concat(fetchedData))

      if ((apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') && fetchedData.length > 0) {
        const lastCursor = [...fetchedData].reverse().find(item => item.cursor && item.cursor !== 'None')?.cursor
        if (lastCursor) { try { await saveLastCursor({ apiName, username, cursor: lastCursor, pagesLoaded }) } catch {} }
      }

      const durationUrlStr = new Date(Date.now() - startUrlTime).toISOString().substr(11, 8)
      const savedListForReport = await (async () => { try { return (await getSavedList()).list || [] } catch { return [] } })()
      const totalItemsForUrl = fetchedData.length
      const haveItemsForUrl = fetchedData.filter(item => savedListForReport.some(e => e.username === item.username && e.id === item.id)).length
      const reportData = { apiName, report: [{ url, username, total: totalItemsForUrl, have: haveItemsForUrl, nohave: totalItemsForUrl - haveItemsForUrl, ids: fetchedData.map(item => item.id).filter(Boolean), time: durationUrlStr, pages: pagesLoaded }], timestamp: new Date().toISOString() }
      try { await saveReport(reportData) } catch {}

      report.push(reportData.report[0])
      urlLogRef.current.push(`${statusPrefix} hoàn thành: Tổng ${totalItemsForUrl}, Đã tải ${haveItemsForUrl}, Trang ${pagesLoaded}, Thời gian ${durationUrlStr}`)
      setMultiReportHtml(`<h3>Kết quả tổng hợp:</h3>${report.map(r => `<div style="margin-bottom:10px;"><b>URL:</b> <a href="${r.url}" target="_blank">${r.url}</a><br><b>User:</b> ${r.username || 'N/A'}<br><b>Tổng:</b> ${r.total}, <b>Đã tải:</b> ${r.have}, <b>Chưa tải:</b> ${r.nohave}<br><b>Trang:</b> ${r.pages}, <b>Thời gian:</b> ${r.time}</div>`).join('')}`)

      if (i < shuffledUrlList.length - 1) { setStatus(`Đã hoàn thành ${i + 1}/${shuffledUrlList.length}. Đang chờ 1 giây...`); await sleep(1000) }
    }

    const durationStr = new Date(Date.now() - startTime).toISOString().substr(11, 8)
    if (errors.length > 0) {
      setStatus(`⚠️ Hoàn thành trong ${durationStr} với ${errors.length} lỗi. Xem chi tiết bên dưới.`, true)
    } else {
      setStatus(`✅ Hoàn thành trong ${durationStr}.`)
    }
    setIsFetching(false)
  }

  const onDownloadAll = async () => {
    setIsDownloading(true)
    setProgress({ totalPct: 0, totalText: '', itemPct: 0, itemText: '' })
    try {
      await refreshSavedSet()
      const itemsToDownload = allResults.filter(item => !savedSet.has(`${item.username}|${item.id}`))
      if (itemsToDownload.length === 0) { setStatus('✅ Tất cả đã lưu, không có mục mới!'); return }
      let completed = 0
      for (const item of itemsToDownload) {
        try { await downloadItems({ results: [item], apiName }) } catch {}
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

  const onDownloadOne = async (item) => {
    const key = `${item.username}|${item.id}`
    if (savedSet.has(key) || downloadedIds.has(key) || downloadingIds.has(key)) return
    setDownloadingIds(prev => new Set(prev).add(key))
    try { await downloadItems({ results: [item], apiName }); setDownloadedIds(prev => new Set(prev).add(key)) }
    finally { setDownloadingIds(prev => { const n = new Set(prev); n.delete(key); return n }) }
  }

  const results = allResults

  return (
    <div className="container">
      <h1>Facebook API Client</h1>
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
      {multiReportHtml && <div className="report" dangerouslySetInnerHTML={{ __html: multiReportHtml }} />}
      {isDownloading && <ProgressBars {...progress} />}
      <ResultsGrid
        results={results}
        savedSet={savedSet}
        downloadingIds={downloadingIds}
        downloadedIds={downloadedIds}
        onDownload={onDownloadOne}
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

