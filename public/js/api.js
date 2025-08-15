import { showStatusMessage, updateUrlStatus } from './ui.js';
import { sleep, getUsernameFromUrl } from './utils.js';
import { state } from './main.js';

/**
 * Fetches all pages of data for a single URL from the backend API.
 * @param {string} apiName - The name of the API to call.
 * @param {object} apiParams - The parameters for the API call.
 * @param {HTMLElement} [urlStatusElement=null] - The DOM element to update with status messages.
 * @returns {Promise<{data: Array<object>, pagesLoaded: number}>} - The aggregated results and number of pages loaded.
 */
export async function fetchApiDataForSingleUrl(apiName, apiParams, urlStatusElement = null) {
    let allResultsLocal = [];
    let nextCursor = null;
    let currentPage = 0;

    let params = { ...apiParams };

    do {
        if (nextCursor) {
            params.cursor = nextCursor;
        } else {
            if (!params.cursor) params.cursor = "";
        }

        currentPage++;
        const statusMessage = `Đang tải trang ${currentPage} từ URL: <strong>${params.url}</strong>...`;
        if (urlStatusElement) {
            updateUrlStatus(urlStatusElement, statusMessage);
        } else {
            showStatusMessage(statusMessage);
        }

        try {
            const response = await fetch('http://localhost:3000/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: state.clientId,
                    apiname: apiName,
                    apiparams: params
                })
            });
            const data = await response.json();

            if (data.error) {
                const errorMessage = `Lỗi API cho URL <strong>${params.url}</strong>: ${data.error}`;
                if (urlStatusElement) updateUrlStatus(urlStatusElement, errorMessage, true);
                else showStatusMessage(errorMessage, true);
                console.error('API Error:', data.error);
                break;
            }

            if (data.result && Array.isArray(data.result)) {
                const currentUsername = getUsernameFromUrl(params.url);
                const resultsWithContext = data.result.map(item => ({
                    ...item,
                    originalUrl: params.url,
                    username: currentUsername
                }));
                allResultsLocal = allResultsLocal.concat(resultsWithContext);

                let newCursor = null;
                if (data.result.length > 0) {
                    const lastItem = data.result[data.result.length - 1];
                    if (lastItem && lastItem.cursor && lastItem.cursor !== '' && lastItem.cursor !== 'None') {
                        newCursor = lastItem.cursor;
                    }
                }
                nextCursor = newCursor;
            } else {
                const errorMessage = `Phản hồi API không mong muốn cho URL <strong>${params.url}</strong>.`;
                if (urlStatusElement) updateUrlStatus(urlStatusElement, errorMessage, true);
                else showStatusMessage(errorMessage, true);
                console.error('Unexpected API response format:', data);
                nextCursor = null;
            }

            if (nextCursor) {
                await sleep(500);
            }

        } catch (error) {
            const errorMessage = `Lỗi Fetch cho URL <strong>${params.url}</strong>: ${error.message}`;
            if (urlStatusElement) updateUrlStatus(urlStatusElement, errorMessage, true);
            else showStatusMessage(errorMessage, true);
            console.error('Fetch error:', error);
            nextCursor = null;
        }
    } while (nextCursor);

    return { data: allResultsLocal, pagesLoaded: currentPage };
}
