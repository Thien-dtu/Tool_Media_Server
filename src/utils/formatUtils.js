// Helper function to format time from timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    let date;
    // Check if the timestamp is in milliseconds or seconds
    // A millisecond timestamp is usually larger than 10^12
    if (timestamp > 999999999999) { // Example: 1683948125000 (milliseconds)
        date = new Date(timestamp); // If it's milliseconds, use it directly
    } else { // Example: 1692645576 (seconds)
        date = new Date(timestamp * 1000); // If it's seconds, multiply by 1000
    }

    if (isNaN(date.getTime())) { // Check if the date is valid
        return 'N/A';
    }

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    // Format dd/mm/yyyy, hh:mm:ss AM/PM
    return date.toLocaleString('en-GB', options).replace(',', '');
}

module.exports = {
    formatTimestamp,
};
