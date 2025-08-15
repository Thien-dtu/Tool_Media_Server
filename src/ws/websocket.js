const WebSocket = require('ws');

const clients = new Map();
const pendingRequests = new Map();
const clientHeartbeats = new Map();

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

function generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
}

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    // Heartbeat check
    setInterval(() => {
        const now = Date.now();
        for (const [id, lastHeartbeat] of clientHeartbeats.entries()) {
            if (now - lastHeartbeat > HEARTBEAT_INTERVAL * 2) {
                const ws = clients.get(id);
                if (ws) {
                    ws.terminate();
                    clients.delete(id);
                    clientHeartbeats.delete(id);
                    console.log('🔌 Client ' + id + ' disconnected due to heartbeat timeout');
                }
            }
        }
    }, HEARTBEAT_INTERVAL);

    wss.on('connection', (ws, req) => {
        console.log('⚡ WebSocket connected');

        let clientId = null;
        let reconnectAttempts = 0;

        ws.on('message', msg => {
            try {
                const data = JSON.parse(msg);

                if (data.type === 'register') {
                    if (clientId) {
                        console.log(
                            '⚠️ Client ' + data.id + ' already registered, updating connection'
                        );
                    }
                    clientId = data.id;
                    clients.set(clientId, ws);
                    clientHeartbeats.set(clientId, Date.now());
                    console.log('✅ Registered client: ' + clientId + ' (total: ' + clients.size + ')');
                    reconnectAttempts = 0;
                } else if (data.type === 'response') {
                    const res = pendingRequests.get(data.requestId);
                    console.log('response', data);
                    if (res) {
                        res.json({ result: data.result, error: data.error });
                        pendingRequests.delete(data.requestId);
                    }
                } else if (data.type === 'heartbeat') {
                    if (clientId) {
                        clientHeartbeats.set(clientId, Date.now());
                    }
                } else if (data.type === 'reconnect') {
                    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        ws.send(
                            JSON.stringify({
                                type: 'error',
                                error: 'Maximum reconnection attempts reached'
                            })
                        );
                        ws.close();
                        return;
                    }
                    reconnectAttempts++;
                    console.log(
                        '🔄 Reconnection attempt ' + reconnectAttempts + ' for client ' + clientId
                    );
                }
            } catch (err) {
                console.error('❌ Invalid message', err);
            }
        });

        ws.on('close', () => {
            if (clientId) {
                clients.delete(clientId);
                clientHeartbeats.delete(clientId);
                console.log(
                    '🔌 WebSocket disconnected: ' + clientId + ' (total: ' + clients.size + ')'
                );
            }
        });

        ws.on('error', error => {
            console.error('❌ WebSocket error for client ' + clientId + ':', error);
        });

        // Send initial heartbeat request
        ws.send(JSON.stringify({ type: 'heartbeat_request' }));
    });

    console.log('🚀 WebSocket server setup complete');
}

module.exports = {
    setupWebSocket,
    clients,
    pendingRequests,
    generateRequestId,
};
