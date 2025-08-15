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
