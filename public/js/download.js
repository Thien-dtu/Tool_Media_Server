import { showStatusMessage, displayResults, fetchSavedList } from './ui.js';
import { dom, state } from './main.js';

/**
 * Initiates the download process for all new media items.
 */
export async function downloadAll() {
    const { downloadAllBtn, apiSelect, progressContainer, progressBar, progressText, itemProgressContainer, itemProgressBar, itemProgressText } = dom;

    downloadAllBtn.disabled = true;
    const originalButtonText = downloadAllBtn.textContent;
    downloadAllBtn.textContent = 'Đang gửi yêu cầu tải về server...';
    showStatusMessage('Đang gửi yêu cầu tải về server...');

    Object.assign(progressContainer.style, { display: 'flex' });
    progressBar.style.width = '0%';
    progressText.textContent = '';
    Object.assign(itemProgressContainer.style, { display: 'flex' });
    itemProgressBar.style.width = '0%';
    itemProgressText.textContent = '';

    try {
        const savedList = await fetchSavedList();
        const itemsToDownload = state.allResults.filter(item =>
            !savedList.some(e => e.username === item.username && e.id === item.id)
        );

        if (itemsToDownload.length === 0) {
            showStatusMessage('✅ Tất cả ảnh/video đã được lưu, không có ảnh mới để tải về!', false);
            await displayResults(state.allResults, apiSelect.value);
            return;
        }

        await processDownloads(itemsToDownload);

        showStatusMessage(`✅ Đã tải về tất cả mục mới! ${itemsToDownload.length} / ${itemsToDownload.length}`, false);
        await displayResults(state.allResults, apiSelect.value);

    } catch (error) {
        showStatusMessage('❌ Lỗi trong quá trình tải về: ' + error.message, true);
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = originalButtonText;
        setTimeout(() => {
            progressContainer.style.display = 'none';
            itemProgressContainer.style.display = 'none';
        }, 1500);
    }
}

/**
 * Processes the actual download requests item by item.
 * @param {Array<object>} itemsToDownload - The list of items to download.
 */
async function processDownloads(itemsToDownload) {
    const { progressBar, progressText, itemProgressBar, itemProgressText } = dom;
    const total = itemsToDownload.length;
    let completed = 0;

    for (const item of itemsToDownload) {
        try {
            await fetch('http://localhost:3000/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: [item], apiName: dom.apiSelect.value })
            });
        } catch (error) {
            console.error(`Error downloading item ${item.id}:`, error);
            // Optionally, you can add more robust error handling here
        }
        completed++;
        const percent = Math.round((completed / total) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Đang tải về... (${percent}%)`;
        itemProgressBar.style.width = `${percent}%`;
        itemProgressText.textContent = `Đã tải: ${completed} / ${total}`;
    }
}
