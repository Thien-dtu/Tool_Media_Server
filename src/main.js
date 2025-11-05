const http = require('http');
const path = require('path');
const app = require('./app');
const { setupWebSocket } = require('./ws/websocket');

const server = http.createServer(app);

// Setup WebSocket server
setupWebSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log('📦 Project root directory:', path.resolve(process.cwd()));
});

// Error handling for the server
server.on('error', error => {
    console.error('❌ Server error:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handler
const { getDatabase } = require('../database/db-v3');

function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Closing database connection...`);

    const db = getDatabase();
    if (db.db) {
        db.close();
        console.log('✅ Database connection closed');
    }

    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
