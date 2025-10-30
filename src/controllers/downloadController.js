const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pLimit = require('p-limit');
const { getFileTypeFromBuffer } = require('../utils/mediaUtils');
const { formatTimestamp } = require('../utils/formatUtils');
const { readSavedList, writeSavedList } = require('../utils/fileUtils');
const { retryWithBackoff, shouldRetryNetworkError } = require('../utils/retryUtils');

// Download concurrency limit
const downloadLimit = pLimit(5);

// Helper function to download a single media item
async function downloadMediaItem(mediaItem, imageDownloadDir, videoDownloadDir, itemUsername) {
    let currentDownloadDir = null;
    let downloadCount = 0;
    let errorCount = 0;

    if (mediaItem.video) {
        currentDownloadDir = videoDownloadDir;
    } else if (mediaItem.image) {
        currentDownloadDir = imageDownloadDir;
    } else {
        console.warn(`Skipping mediaItem with no image or video URL:`, mediaItem);
        return { downloadCount: 0, errorCount: 1, savedItem: null };
    }

    // Download image with retry logic
    if (mediaItem.image && currentDownloadDir === imageDownloadDir) {
        const imageUrl = mediaItem.image;
        try {
            const response = await retryWithBackoff(
                () => axios({ url: imageUrl, method: 'GET', responseType: 'arraybuffer', timeout: 30000 }),
                { maxRetries: 3, shouldRetry: shouldRetryNetworkError }
            );

            if (response.status === 200 && response.data) {
                const fileBuffer = Buffer.from(response.data);
                const fileType = getFileTypeFromBuffer(fileBuffer);
                let fileExtension = fileType || 'jpg';
                if (!fileType) console.warn(`Could not determine image type for ${imageUrl}, defaulting to .jpg`);

                const fileName = mediaItem.isCarouselChild ? `${mediaItem.post_id}_p${mediaItem.index}.${fileExtension}` : `${mediaItem.id}.${fileExtension}`;
                const filePath = path.join(currentDownloadDir, fileName);
                await fs.promises.writeFile(filePath, fileBuffer);
                console.log(`Downloaded image: ${fileName} for ${itemUsername}`);
                downloadCount++;
            } else {
                console.error(`Error downloading image ${imageUrl}: Received status code ${response.status} or no data`);
                errorCount++;
            }
        } catch (e) {
            console.error(`Error fetching or writing image ${imageUrl}:`, e.message);
            errorCount++;
        }
    }

    // Download video with retry logic
    if (mediaItem.video && currentDownloadDir === videoDownloadDir) {
        const videoUrl = mediaItem.video;
        try {
            const response = await retryWithBackoff(
                () => axios({ url: videoUrl, method: 'GET', responseType: 'arraybuffer', timeout: 60000 }),
                { maxRetries: 3, shouldRetry: shouldRetryNetworkError }
            );

            if (response.status === 200 && response.data) {
                const fileBuffer = Buffer.from(response.data);
                const fileType = getFileTypeFromBuffer(fileBuffer);
                let fileExtension = fileType || 'mp4';
                if (!fileType) console.warn(`Could not determine video type for ${videoUrl}, defaulting to .mp4`);

                const fileName = mediaItem.isCarouselChild ? `${mediaItem.post_id}_p${mediaItem.index}.${fileExtension}` : `${mediaItem.id}.${fileExtension}`;
                const filePath = path.join(currentDownloadDir, fileName);
                await fs.promises.writeFile(filePath, fileBuffer);
                console.log(`Downloaded video: ${fileName} for ${itemUsername}`);
                downloadCount++;
            } else {
                console.error(`Error downloading video ${videoUrl}: Received status code ${response.status} or no data`);
                errorCount++;
            }
        } catch (e) {
            console.error(`Error fetching or writing video ${videoUrl}:`, e.message);
            errorCount++;
        }
    }

    // Return saved item info for batch writing
    const savedItem = !mediaItem.isCarouselChild && downloadCount > 0
        ? { username: itemUsername, id: mediaItem.post_id || mediaItem.id }
        : null;

    return { downloadCount, errorCount, savedItem };
}

const handleDownload = async (req, res) => {
    const { results, originalUrl, apiName } = req.body;

    if (!results || !Array.isArray(results)) {
        return res.status(400).json({ error: 'Invalid data received' });
    }

    console.log(`📥 Received download request for ${results.length} items. API: ${apiName}`);

    let totalDownloadCount = 0;
    let totalErrorCount = 0;
    const successUserDirs = new Set();
    const newSavedItems = [];

    // Read saved list once at the beginning
    const savedList = await readSavedList();
    const savedSet = new Set(savedList.map(e => `${e.username}|${e.id}`));

    for (const item of results) {
        if (!item.id || !item.username) {
            console.warn('Skipping item without valid ID or username:', item);
            totalErrorCount++;
            continue;
        }

        const itemUsername = item.username;
        const safeUsername = itemUsername.replace(/[^a-zA-Z0-9_-]/g, '_');

        const baseDownloadDir = path.join(process.cwd(), 'result', safeUsername);
        const imageDownloadDir = path.join(baseDownloadDir, 'image');
        const videoDownloadDir = path.join(baseDownloadDir, 'video');

        // Create directories if needed
        if (!successUserDirs.has(safeUsername)) {
            try {
                await fs.promises.mkdir(imageDownloadDir, { recursive: true });
                await fs.promises.mkdir(videoDownloadDir, { recursive: true });
                console.log(`Created directories for user ${safeUsername}: ${imageDownloadDir} and ${videoDownloadDir}`);
                successUserDirs.add(safeUsername);
            } catch (e) {
                console.error(`Error creating directories for user ${safeUsername}:`, e);
                totalErrorCount++;
                continue;
            }
        }

        // Build media items list
        let mediaItemsToDownload = [];

        if (item.image || item.video) {
            mediaItemsToDownload.push({
                id: item.id,
                image: item.image,
                video: item.video,
                caption: item.caption,
                accessibility_caption: item.accessibility_caption,
                taken_at_timestamp: item.taken_at_timestamp,
                created_at: item.created_at,
                like_count: item.like_count,
                comment_count: item.comment_count,
                isCarouselChild: false
            });
        }

        if (item.carousel && Array.isArray(item.carousel)) {
            item.carousel.forEach((carouselItem, index) => {
                if (carouselItem.id && (carouselItem.image || carouselItem.video)) {
                    mediaItemsToDownload.push({
                        id: carouselItem.id,
                        post_id: item.id,
                        index: index + 1,
                        image: carouselItem.image,
                        video: carouselItem.video,
                        caption: item.caption,
                        accessibility_caption: item.accessibility_caption,
                        taken_at_timestamp: item.taken_at_timestamp,
                        created_at: item.created_at,
                        like_count: item.like_count,
                        comment_count: item.comment_count,
                        isCarouselChild: true
                    });
                }
            });
        }

        // Download media items in parallel (max 5 concurrent)
        const downloadPromises = mediaItemsToDownload.map(mediaItem =>
            downloadLimit(() => downloadMediaItem(mediaItem, imageDownloadDir, videoDownloadDir, itemUsername))
        );

        const results = await Promise.all(downloadPromises);

        // Aggregate results
        for (const result of results) {
            totalDownloadCount += result.downloadCount;
            totalErrorCount += result.errorCount;
            if (result.savedItem) {
                const key = `${result.savedItem.username}|${result.savedItem.id}`;
                if (!savedSet.has(key)) {
                    newSavedItems.push(result.savedItem);
                    savedSet.add(key);
                }
            }
        }

        // Save caption
        if (item.accessibility_caption !== undefined || item.caption !== undefined) {
            const captionText = item.accessibility_caption || item.caption || '(No caption)';
            let fullCaptionContent = `Caption text: ${captionText}\n`;

            if (item.taken_at_timestamp) {
                fullCaptionContent += `Created: ${formatTimestamp(item.taken_at_timestamp)}\n`;
            } else if (item.created_at) {
                fullCaptionContent += `Created: ${formatTimestamp(item.created_at)}\n`;
            } else {
                fullCaptionContent += `Created: N/A\n`;
            }

            fullCaptionContent += `Likes: ${item.like_count !== undefined ? item.like_count : 'N/A'}\n`;
            fullCaptionContent += `Comments: ${item.comment_count !== undefined ? item.comment_count : 'N/A'}\n`;

            const captionName = `${item.id}.txt`;
            const captionPath = path.join(
                (item.image && imageDownloadDir) || (item.video && videoDownloadDir) || baseDownloadDir,
                captionName
            );

            try {
                await fs.promises.writeFile(captionPath, fullCaptionContent);
                console.log(`Saved caption: ${captionName} for ${itemUsername}`);
                totalDownloadCount++;
            } catch (e) {
                console.error(`Error saving caption ${captionName} for user ${itemUsername}:`, e);
                totalErrorCount++;
            }
        }
    }

    // Batch write saved items once at the end
    if (newSavedItems.length > 0) {
        const updatedSavedList = savedList.concat(newSavedItems);
        await writeSavedList(updatedSavedList);
        console.log(`✅ Batch saved ${newSavedItems.length} new items to saved list`);
    }

    console.log(`✅ Download process finished. Downloaded: ${totalDownloadCount}, Errors: ${totalErrorCount}`);

    if (totalErrorCount === 0) {
        res.status(200).json({ message: `Downloaded ${totalDownloadCount} files.` });
    } else {
        res.status(500).json({ error: `Finished with ${totalErrorCount} errors. Downloaded ${totalDownloadCount} files. Check server logs for details.` });
    }
};

module.exports = {
    handleDownload,
};
