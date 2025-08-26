# TikTok Data Tools – Full‑Stack App

A full‑stack project that provides a React interface for exploring social data (with a focus on TikTok) and an Express + WebSocket backend for API calls, downloads, reports, and saved state.

## Features
- TikTok Data Viewer: Browse, filter, sort, and search TikTok posts; view covers fullscreen; use ArrowLeft/ArrowRight to switch images; Escape to close.
- Batch, Split, Compare, Report pages: Utilities for working with URL lists and generating reports.
- Backend APIs: Endpoints for invoking external APIs, persisting shuffled URLs, saving reports, downloads, cursor tracking, and saved items.
- WebSocket server: Client registration, request/response relay, and heartbeats.

## Project Structure
```
root
├─ src/                     # Express app, routes, controllers, WebSocket
│  ├─ app.js
│  ├─ main.js
│  ├─ routes/
│  └─ ws/websocket.js
├─ react-client/            # React app (Vite)
│  ├─ src/
│  ├─ public/
│  └─ vite.config.js
├─ data/                    # Sample JSON data (e.g., TikTok raw JSON files)
└─ public/                  # Legacy static assets (vanilla HTML/JS)
```

## Prerequisites
- Node.js 18+ (recommended 18 or 20)
- npm 9+

## Setup
1. Install dependencies in both root and client:
```bash
npm install
cd react-client && npm install
```

2. (Optional) Configure the API base URL used by the React client. Create `react-client/.env.local`:
```bash
VITE_API_BASE=http://localhost:3000
```
By default, the client uses `http://localhost:3000` when `VITE_API_BASE` is not set.

## Running in Development
Run the server and client in two terminals.

- Server (port 3000):
```bash
npm start
```

- Client (Vite dev server, default port 5173):
```bash
cd react-client
npm run dev
```

Open the React app at `http://localhost:5173`.

Notes:
- The server enables CORS for all origins, so the dev client can call `http://localhost:3000`.
- The TikTok viewer tries to load an initial JSON at `/data/tiktok/wendy_chanz0102.raw.json`. In dev, you can keep the `data/` folder at the repo root and request it directly from the Vite dev server (same origin as the client). Alternatively, upload JSON files via the UI.

## Running in Production
1. Build the client:
```bash
cd react-client
npm run build
```
2. Start the server (serves the built client from `react-client/dist`):
```bash
cd ..
npm start
```
Open `http://localhost:3000`.

If you need the viewer to load JSON files by path (e.g., `/data/tiktok/...`) in production, place those files under `react-client/public/data/...` before building, so they end up in `react-client/dist/data/...`.

## Backend
### Server entry
- `src/main.js` starts HTTP + WebSocket on `PORT` (default 3000)
- `src/app.js` sets up middleware and routes, and serves `react-client/dist`

### REST API Endpoints
Base URL: `http://localhost:3000`

- `POST /call`
  - Proxy-style API invoker.
  - Body: `{ id, apiname, apiparams, url }`
- `POST /download`
  - Trigger download jobs.
  - Body: implementation-specific payload.
- `POST /save-shuffled-urls`
  - Persist shuffled URL lists.
- `POST /save-ig-user-stories-report`
  - Save Instagram user stories report data.
- `POST /delete-report-entry`
  - Delete a report entry.
- `POST /get-last-cursors`
  - Retrieve last cursors for sources.
- `POST /save-last-cursor`
  - Save last cursor per source.
- `GET /saved-list`
  - Retrieve saved items list.
- `POST /check-saved`
  - Check if a url/item is saved.

See controllers under `src/controllers/` for request shapes and persistence details.

### WebSocket
- Initialized in `src/ws/websocket.js`; clients connect to `ws://<server>:3000` (same host/port).
- Messages:
  - `{ type: 'register', id }` to register the client.
  - `{ type: 'heartbeat' }` to keep the connection alive.
  - `{ type: 'response', requestId, result, error }` for async replies.
- The server sends `{ type: 'heartbeat_request' }` and tracks clients with a heartbeat interval.

## Frontend (React + Vite)
- Start: `npm run dev` inside `react-client`
- Build: `npm run build`
- Preview build: `npm run preview`

### Pages
- `Home`, `Split`, `Compare`, `Report`, `Batch`, `Test`, `TiktokDataViewer`
- TikTok Data Viewer highlights:
  - Filters: All, Pinned, Recent, Popular; plus sorting by views/likes/date.
  - Search across descriptions, hashtags, and music titles.
  - Hashtag filter chips.
  - Grid of video covers; click to open fullscreen.
  - Keyboard navigation in modal: ArrowLeft/ArrowRight navigate, Escape closes.
  - Upload one or more JSON files via the UI.

### Config
- API base URL: `react-client/src/lib/apiClient.js` uses `VITE_API_BASE` or defaults to `http://localhost:3000`.

## Data
- Example TikTok RAW JSON files live under `data/tiktok/*.raw.json`.
- For production builds, copy any files you want to serve to `react-client/public/data/...` before building.
- You can also upload JSON directly from the TikTok viewer page.

## Scripts
- Root: `npm start` – starts Express + WebSocket on port 3000.
- Client: `npm run dev`, `npm run build`, `npm run preview` (inside `react-client`).

## Notes
- CORS is enabled for all origins in development by default (`cors({ origin: '*' })`).
- The server includes a SPA fallback to `index.html` for client-side routes.

## License
Not specified. Add a license file if you plan to distribute this publicly.