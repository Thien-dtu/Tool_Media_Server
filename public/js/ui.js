/**
 * A collection of functions for updating the user interface.
 */
import { dom, state } from './main.js';

// --- UI Update Helpers ---

export function showStatusMessage(message, isError = false) {
    dom.overallStatusDiv.innerHTML = message;
    dom.overallStatusDiv.style.display = 'block';
    if (isError) {
        dom.overallStatusDiv.style.backgroundColor = '#f8d7da';
        dom.overallStatusDiv.style.color = '#721c24';
    } else {
        dom.overallStatusDiv.style.backgroundColor = '#e2f0e8';
        dom.overallStatusDiv.style.color = '#218838';
    }
}

export function hideStatusMessages() {
    dom.overallStatusDiv.style.display = 'none';
    dom.multiUrlProgressDiv.style.display = 'none';
    dom.multiUrlProgressDiv.innerHTML = '';
}

export function updateUrlStatus(element, message, isError = false) {
    element.innerHTML = message;
    if (isError) {
        element.classList.add('error');
    } else {
        element.classList.remove('error');
    }
}

export function updateApiParams() {
    const selectedApi = dom.apiSelect.value;
    dom.apiParamsTextarea.value = state.defaultApiParams[selectedApi] || '{}';
}


// --- Result Rendering ---

export async function displayResults(results, apiName) {
    dom.resultsDiv.innerHTML = '';
    dom.downloadAllBtn.style.display = 'none';

    if (results.length === 0) {
        dom.resultsDiv.textContent = 'Không tìm thấy kết quả nào.';
        return;
    }

    const renderMap = {
        'get_list_fb_user_photos': renderFbUserPhotos,
        'get_list_fb_user_reels': renderFbUserReels,
        'get_list_ig_post': renderIgPost,
        'get_list_ig_user_stories': renderIgUserStories,
    };

    const renderFunction = renderMap[apiName] || renderGenericResults;
    await renderFunction(results);

    if (results.length > 0) {
        dom.downloadAllBtn.style.display = 'block';
    }
}

async function renderFbUserPhotos(results) {
    const savedList = await fetchSavedList();
    dom.resultsDiv.innerHTML = results.map(item => {
        if (item.image || item.accessibility_caption) {
            const isSaved = savedList.some(e => e.username === item.username && e.id === item.id);
            return `
                <div class="result-item">
                    <img src="${item.image}" alt="${item.accessibility_caption || 'Image'}">
                    <p>Chú thích: ${item.accessibility_caption || '(Không có chú thích)'}</p>
                    <span style="color:${isSaved ? 'green' : 'red'};font-weight:bold;">${isSaved ? 'Đã lưu' : 'Chưa lưu'}</span>
                </div>
            `;
        }
        return '';
    }).join('');
}

function renderFbUserReels(results) {
    dom.resultsDiv.innerHTML = results.map(item => {
        if (item.video || item.id) {
            return `
                <div class="result-item">
                    <video src="${item.video?.play_uri || ''}" controls style="max-width:180px;max-height:180px;"></video>
                    <p>ID: ${item.id || ''}</p>
                    <p>Tiêu đề: ${item.title || '(Không có tiêu đề)'}</p>
                    <p>Lượt xem: ${item.view_count || 'N/A'}</p>
                </div>
            `;
        }
        return '';
    }).join('');
}

async function renderIgPost(results) {
    const savedList = await fetchSavedList();
    dom.resultsDiv.innerHTML = `<div style="display:flex;gap:20px;flex-wrap:wrap;">` +
        results.map(item => {
            const isSaved = savedList.some(e => e.username === item.username && e.id === item.id);
            const date = new Date(item.created_at * 1000);
            const formattedDate = date.toLocaleString();
            let mediaContent = item.video
                ? `<video src="${item.video}" controls style="max-width:180px;max-height:180px;"></video>`
                : `<img src="${item.image}" alt="Post image" style="max-width:180px;max-height:180px;">`;

            let carouselContent = '';
            if (item.carousel && item.carousel.length > 0) {
                carouselContent = `<div class="carousel">` +
                    item.carousel.map(carouselItem =>
                        carouselItem.video
                            ? `<video src="${carouselItem.video}" controls style="max-width:90px;max-height:90px;"></video>`
                            : `<img src="${carouselItem.image}" alt="Carousel image" style="max-width:90px;max-height:90px;">`
                    ).join('') + `</div>`;
            }
            return `
                <div class="result-item" style="flex-direction:column;align-items:flex-start;min-width:220px;max-width:220px;">
                    <div style="margin-bottom:8px;">${mediaContent}${carouselContent}</div>
                    <div><b>Post ID:</b> ${item.post_id || item.id}</div>
                    <div><b>Caption:</b> ${item.caption || '(No caption)'}</div>
                    <div><b>Created:</b> ${formattedDate}</div>
                    <div><b>Likes:</b> ${item.like_count ?? 'N/A'}</div>
                    <div><b>Comments:</b> ${item.comment_count ?? 'N/A'}</div>
                    <span style="color:${isSaved ? 'green' : 'red'};font-weight:bold;">${isSaved ? 'Đã tải về' : 'Chưa tải'}</span>
                </div>
            `;
        }).join('') + `</div>`;
}

async function renderIgUserStories(results) {
    const savedList = await fetchSavedList();
    dom.resultsDiv.innerHTML = `<div style="display:flex;gap:20px;flex-wrap:wrap;">` +
        results.map(item => {
            const isSaved = savedList.some(e => e.username === item.username && e.id === item.id);
            const date = item.taken_at ? new Date(item.taken_at) : null;
            const expDate = item.expiring_at ? new Date(item.expiring_at) : null;
            let mediaContent = item.video
                ? `<video src="${item.video}" controls style="max-width:180px;max-height:180px;"></video>`
                : `<img src="${item.image}" alt="Story image" style="max-width:180px;max-height:180px;">`;
            return `
                <div class="result-item" style="flex-direction:column;align-items:flex-start;min-width:220px;max-width:220px;">
                    <div style="margin-bottom:8px;">${mediaContent}</div>
                    <div><b>Story ID:</b> ${item.id || item.pk}</div>
                    <div><b>Thời gian đăng:</b> ${date ? date.toLocaleString() : ''}</div>
                    <div><b>Hết hạn:</b> ${expDate ? expDate.toLocaleString() : ''}</div>
                    <div><b>Thời lượng video:</b> ${item.video_duration ? item.video_duration + 's' : 'N/A'}</div>
                    <div><b>Nhạc:</b> ${item.music || '(Không có)'}</div>
                    <span style="color:${isSaved ? 'green' : 'red'};font-weight:bold;">${isSaved ? 'Đã tải về' : 'Chưa tải'}</span>
                </div>
            `;
        }).join('') + `</div>`;
}

function renderGenericResults(results) {
    dom.resultsDiv.innerHTML = results.map(item => `
        <div class="result-item">
            <pre>${JSON.stringify(item, null, 2)}</pre>
        </div>
    `).join('');
}

export async function fetchSavedList() {
    try {
        const resp = await fetch('http://localhost:3000/saved-list');
        const data = await resp.json();
        return data.list || [];
    } catch (e) {
        console.error("Error fetching saved list:", e);
        return [];
    }
}

// --- Modal ---
export function showNearestLocationModal({ username, cursor, pagesLoaded }) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'nearest-location-modal-overlay';
        Object.assign(modalOverlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.4)', zIndex: '9999', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
        });

        const modalBox = document.createElement('div');
        Object.assign(modalBox.style, {
            background: '#fff', padding: '32px 24px', borderRadius: '10px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)', minWidth: '320px',
            maxWidth: '90vw', textAlign: 'center'
        });

        modalBox.innerHTML = `
            <h2 style="margin-bottom:18px;">Resume from last location?</h2>
            <div style="margin-bottom:10px;"><b>User name:</b> ${username}</div>
            <div style="margin-bottom:10px;"><b>Total number of pages:</b> ${pagesLoaded}</div>
            <div style="margin-bottom:18px;"><b>Last cursor:</b> <span style="word-break:break-all;">${cursor || '(none)'}</span></div>
            <div style="margin-bottom:18px;">
                <input type="checkbox" id="modalNearestCheckbox">
                <label for="modalNearestCheckbox" style="font-weight:normal;">Get from nearest location</label>
            </div>
            <button id="modalConfirmBtn" style="margin-right:10px;">OK</button>
        `;

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        document.getElementById('modalConfirmBtn').onclick = () => {
            const checked = document.getElementById('modalNearestCheckbox').checked;
            document.body.removeChild(modalOverlay);
            resolve(checked);
        };
    });
}
