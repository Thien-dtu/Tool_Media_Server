// Helper function to determine file type from buffer
function getFileTypeFromBuffer(buffer) {
    if (!buffer || buffer.length < 4) {
        return null;
    }
    const signature = buffer.toString('hex', 0, 4);
    // Image types
    if (signature.startsWith('ffd8')) return 'jpg'; // JPEG
    if (signature.startsWith('89504e47')) return 'png'; // PNG
    if (signature.startsWith('47494638')) return 'gif'; // GIF
    if (signature.startsWith('52494646') && buffer.toString('hex', 8, 12) === '57454250') return 'webp'; // WEBP
    // Video types (basic checks for MP4)
    if (signature.startsWith('000000') && buffer.toString('hex', 4, 8) === '66747970') return 'mp4'; // MP4 (starts with ftyp)
    if (signature.startsWith('494433')) return 'mp3'; // MP3
    return null;
}

module.exports = {
    getFileTypeFromBuffer,
};
