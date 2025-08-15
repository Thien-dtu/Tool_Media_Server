import { fetchApiDataForSingleUrl } from './api.js';
import { downloadAll } from './download.js';
import { hideStatusMessages, showStatusMessage, updateUrlStatus, displayResults, updateApiParams, showNearestLocationModal } from './ui.js';
import { getUsernameFromUrl, shuffleArray, sleep } from './utils.js';

// --- DOM Elements ---
export const dom = {
    resultsDiv: document.getElementById('results'),
    overallStatusDiv: document.getElementById('overall-status'),
    multiUrlProgressDiv: document.getElementById('multi-url-progress'),
    apiSelect: document.getElementById('apiSelect'),
    apiParamsTextarea: document.getElementById('apiParams'),
    downloadAllBtn: document.getElementById('downloadAllBtn'),
    makeApiCallBtn: document.getElementById('makeApiCallBtn'),
    progressContainer: document.getElementById('download-progress-container'),
    progressBar: document.getElementById('download-progress-bar'),
    progressText: document.getElementById('download-progress-text'),
    itemProgressContainer: document.getElementById('download-item-progress-container'),
    itemProgressBar: document.getElementById('download-item-progress-bar'),
    itemProgressText: document.getElementById('download-item-progress-text'),
};

// --- State Management ---
export const state = {
    allResults: [],
    isFetching: false,
    clientId: `client_5y9bs978n_100005146594548`,
    defaultApiParams: {
        'get_list_fb_user_photos': JSON.stringify({ url: "https://www.facebook.com/trang.quach.526875", type: "5", cursor: "" }, null, 2),
        'get_list_fb_user_reels': JSON.stringify({ url: "https://www.facebook.com/trang.quach.526875", cursor: "" }, null, 2),
        'get_list_fb_highlights': JSON.stringify({ url: "https://www.facebook.com/trang.quach.526875", cursor: "" }, null, 2),
        'get_list_ig_post': JSON.stringify({ url: "https://www.instagram.com/chanz_sweet.052", cursor: "" }, null, 2),
        'get_list_ig_user_stories': JSON.stringify({ url: "https://www.instagram.com/chanz_sweet.052/", raw: "" }, null, 2)
    }
};


/**
 * Main function to handle multi-URL API calls.
 */
async function makeApiCallMultiUrl() {
    hideStatusMessages();
    dom.resultsDiv.innerHTML = '';
    dom.downloadAllBtn.style.display = 'none';
    state.allResults = [];
    dom.multiUrlProgressDiv.style.display = 'block';
    dom.multiUrlProgressDiv.innerHTML = '';

    let apiParamsObj;
    try {
        apiParamsObj = JSON.parse(dom.apiParamsTextarea.value);
    } catch (e) {
        showStatusMessage('Lỗi: API Parameters không phải JSON hợp lệ!', true);
        return;
    }

    const urlField = apiParamsObj.url;
    if (!urlField) {
        showStatusMessage('Lỗi: Không tìm thấy trường "url" trong API Parameters!', true);
        return;
    }

    const urlList = urlField.split(/(?:,\s*|\n)+/).map(u => u.trim()).filter(Boolean);
    if (urlList.length === 0) {
        showStatusMessage('Lỗi: Không có URL nào!', true);
        return;
    }

    const apiName = dom.apiSelect.value;
    const report = [];
    const startTime = Date.now();

    let shuffledUrlList = (urlList.length > 1) ? shuffleArray([...urlList]) : urlList;

    if (shuffledUrlList.length > 1) {
        try {
            await fetch('http://localhost:3000/save-shuffled-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiName, urls: shuffledUrlList, timestamp: new Date().toISOString() })
            });
        } catch (e) {
            console.error('Lỗi khi lưu thứ tự URL đã shuffle:', e);
        }
    }

    let lastCursors = {};
    if (apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') {
        try {
            const usernames = shuffledUrlList.map(getUsernameFromUrl);
            const resp = await fetch('http://localhost:3000/get-last-cursors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiName, usernames })
            });
            lastCursors = (await resp.json()).lastCursors || {};
        } catch (e) {
            console.error('Lỗi khi lấy last cursors:', e);
        }
    }

    for (let i = 0; i < shuffledUrlList.length; i++) {
        const url = shuffledUrlList[i];
        const username = getUsernameFromUrl(url);
        let useNearest = false;
        let cursorToUse = "";

        if (apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') {
            const { cursor, pagesLoaded } = lastCursors[username] || { cursor: '', pagesLoaded: 0 };
            useNearest = await showNearestLocationModal({ username, cursor, pagesLoaded });
            cursorToUse = useNearest ? cursor : "";
        }

        const currentApiParams = { ...apiParamsObj, url, cursor: cursorToUse };
        const urlStatusItem = document.createElement('div');
        urlStatusItem.className = 'url-status-item';
        dom.multiUrlProgressDiv.appendChild(urlStatusItem);
        updateUrlStatus(urlStatusItem, `Đang xử lý URL ${i + 1}/${shuffledUrlList.length}: <strong>${url}</strong>`);
        showStatusMessage(`Đang xử lý URL ${i + 1} / ${shuffledUrlList.length} (<strong>${url}</strong>)...`);

        const startUrlTime = Date.now();
        const { data: fetchedData, pagesLoaded } = await fetchApiDataForSingleUrl(apiName, currentApiParams, urlStatusItem);
        state.allResults = state.allResults.concat(fetchedData);

        if ((apiName === 'get_list_fb_user_photos' || apiName === 'get_list_ig_post') && fetchedData.length > 0) {
            const lastCursor = fetchedData.slice().reverse().find(item => item.cursor && item.cursor !== 'None')?.cursor;
            if (lastCursor) {
                try {
                    await fetch('http://localhost:3000/save-last-cursor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ apiName, username, cursor: lastCursor, pagesLoaded })
                    });
                } catch (e) {
                    console.error('Lỗi khi lưu last cursor:', e);
                }
            }
        }

        const durationUrlStr = new Date(Date.now() - startUrlTime).toISOString().substr(11, 8);
        const savedListForReport = await (async () => { try { return (await (await fetch('http://localhost:3000/saved-list')).json()).list || [] } catch { return [] } })();
        const totalItemsForUrl = fetchedData.length;
        const haveItemsForUrl = fetchedData.filter(item => savedListForReport.some(e => e.username === item.username && e.id === item.id)).length;
        const reportData = {
            apiName,
            report: [{
                url, username, total: totalItemsForUrl, have: haveItemsForUrl,
                nohave: totalItemsForUrl - haveItemsForUrl,
                ids: fetchedData.map(item => item.id).filter(Boolean),
                time: durationUrlStr, pages: pagesLoaded
            }],
            timestamp: new Date().toISOString()
        };

        try {
            await fetch('http://localhost:3000/save-ig-user-stories-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });
        } catch (e) {
            console.error('Lỗi khi lưu report cho URL:', url, e);
        }

        report.push(reportData.report[0]);
        updateUrlStatus(urlStatusItem, `Hoàn thành URL ${i + 1}/${shuffledUrlList.length}: <strong>${url}</strong><br>Tổng: ${totalItemsForUrl}, Đã tải: ${haveItemsForUrl}, Chưa tải: ${totalItemsForUrl - haveItemsForUrl}<br>Số trang đã tải: ${pagesLoaded}<br>Thời gian tải: ${durationUrlStr}`);

        if (i < shuffledUrlList.length - 1) {
            showStatusMessage(`Đã hoàn thành URL ${i + 1}/${shuffledUrlList.length}. Đang chờ 1 giây...`);
            await sleep(1000);
        }
    }

    const durationStr = new Date(Date.now() - startTime).toISOString().substr(11, 8);
    let reportHtml = '<h3>Kết quả tổng hợp:</h3>';
    report.forEach(r => {
        reportHtml += `<div style="margin-bottom:10px;"><b>URL:</b> <a href="${r.url}" target="_blank">${r.url}</a><br><b>User:</b> ${r.username || 'N/A'}<br><b>Tổng:</b> ${r.total}, <b>Đã tải:</b> ${r.have}, <b>Chưa tải:</b> ${r.nohave}<br><b>Trang:</b> ${r.pages}, <b>Thời gian:</b> ${r.time}</div>`;
    });
    reportHtml += `<b>Tổng thời gian:</b> ${durationStr}`;
    dom.multiUrlProgressDiv.innerHTML = reportHtml;

    showStatusMessage(`✅ Hoàn thành ${shuffledUrlList.length} URL trong ${durationStr}.`);
    dom.downloadAllBtn.style.display = 'block';
    await displayResults(state.allResults, apiName);
}


// --- Initialization ---
function init() {
    // Remove inline event handlers from HTML and attach them here
    dom.apiSelect.onchange = null;
    dom.makeApiCallBtn.onclick = null;
    dom.downloadAllBtn.onclick = null;

    dom.apiSelect.addEventListener('change', updateApiParams);
    dom.makeApiCallBtn.addEventListener('click', makeApiCallMultiUrl);
    dom.downloadAllBtn.addEventListener('click', downloadAll);

    // Initial setup
    updateApiParams();
    console.log("Application initialized. Client ID:", state.clientId);
}

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
