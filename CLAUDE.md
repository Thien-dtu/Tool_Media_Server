# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack application for exploring social media data (TikTok, Instagram) with a React frontend and Express + WebSocket backend. The backend proxies API calls to external services via connected WebSocket clients, handles media downloads, and persists reports and saved items.

## Commands

### Development

**Start the server** (port 3000):
```bash
npm start
```

**Start the React dev server** (port 5173):
```bash
cd react-client
npm run dev
```

**Build the React client for production**:
```bash
cd react-client
npm run build
```

**Preview production build**:
```bash
cd react-client
npm run preview
```

**Lint the React code**:
```bash
cd react-client
npm run lint
```

### Installation

Install dependencies for both server and client:
```bash
npm install
cd react-client && npm install
```

## Architecture

### Backend Architecture

The backend uses a **WebSocket-based RPC (Remote Procedure Call) pattern** where the server acts as a relay between the web frontend and external API clients:

1. **HTTP Server** (`src/main.js`, `src/app.js`): Express server serving React build from `react-client/dist` and providing REST endpoints
2. **WebSocket Server** (`src/ws/websocket.js`): Manages connections with external API clients that register with unique IDs
3. **Request Flow**:
   - Frontend calls `POST /call` with `{ id, apiname, apiparams, url }`
   - Backend finds WebSocket client by `id` and sends `{ type: 'api_call', requestId, apiname, apiparams }`
   - WebSocket client executes the API call and responds with `{ type: 'response', requestId, result, error }`
   - Backend resolves the pending HTTP request and returns result to frontend
   - Requests timeout after 60 seconds if no response

4. **Key WebSocket Mechanisms**:
   - Client registration via `{ type: 'register', id }` message
   - Heartbeat monitoring (30s interval, 2x timeout threshold)
   - Reconnection handling (max 5 attempts)
   - Pending requests tracked in Map with timeout cleanup

5. **Routes**:
   - `src/routes/api.js`: API proxy endpoint (`/call`)
   - `src/routes/download.js`: Media download endpoint (`/download`)
   - `src/routes/report.js`: Report save/delete endpoints
   - `src/routes/cursor.js`: Cursor persistence endpoints
   - `src/routes/saved.js`: Saved items endpoints

6. **Data Persistence**: JSON files in `data/` directory:
   - `shuffled_urls_*.jsonl`: URL lists for different sources
   - `ig_user_stories_report.jsonl`: Instagram stories report data
   - `last_cursors.json`: Pagination cursors for various sources
   - `saved_images.json`: User-saved items

7. **Download System** (`src/controllers/downloadController.js`):
   - Downloads media (images/videos) from API results
   - Organizes by username in `result/{username}/{image|video}/` directories
   - Detects file types from buffer, generates timestamped filenames
   - Tracks downloaded items in saved list

### Frontend Architecture

React 19 + Vite application using React Router for navigation:

1. **API Client** (`src/lib/apiClient.js`): Centralized API wrapper using `VITE_API_BASE` env var (defaults to `http://localhost:3000`)

2. **Pages**:
   - `Home`: Main API call interface with URL lists and result display
   - `TiktokDataViewer`: Browse/filter/search TikTok posts with fullscreen viewer
   - `StoryViewer`, `Following`, `FollowingUrls`: Instagram-specific viewers
   - `Batch`, `Split`, `Compare`, `Report`, `Test`: Utility pages for data processing

3. **Key Features**:
   - State management via React hooks (useState, useEffect)
   - @tanstack/react-query for async state
   - Chart.js for data visualization
   - Dayjs for date handling
   - Fullscreen image modal with keyboard navigation (Arrow keys, Escape)

4. **Config**: Set API base URL via `react-client/.env.local`:
   ```
   VITE_API_BASE=http://localhost:3000
   ```

## Code Style Guidelines (from GEMINI.md)

**Key Principles**:
- Simplicity and readability over cleverness
- Minimal code changes - only modify sections related to the task
- Use early returns to avoid nested conditions
- Descriptive names (prefix event handlers with "handle")
- Functional, immutable style unless verbose
- DRY (Don't Repeat Yourself)

**Comments**:
- Add comment at start of each function describing what it does
- Use JSDoc for JavaScript (unless TypeScript)
- Add TODO comments for bugs or suboptimal code

**Function Ordering**:
- Functions that compose others should appear earlier in the file

## Production Deployment

1. Build the React client: `cd react-client && npm run build`
2. Start the server from root: `npm start`
3. Server serves built client from `react-client/dist` at `http://localhost:3000`
4. Place static assets (e.g., JSON files) in `react-client/public/data/` before building to include them in dist

## Performance Optimizations

### Backend
- **Async File Operations**: All file I/O uses `fs.promises` for non-blocking operations
- **Parallel Downloads**: Media downloads use custom concurrency limiter with 5 concurrent downloads (see `src/utils/concurrencyUtils.js`)
- **Batch File Writes**: Saved items list is read once and written once per download batch (vs. per-item)
- **Retry with Exponential Backoff**: Network requests retry up to 3 times with exponential backoff (see `src/utils/retryUtils.js`)

### Frontend
- **Code Splitting**: All pages use React lazy loading to reduce initial bundle size
- **Memoization**: TikTok viewer stats are memoized with `React.useMemo` to prevent recalculation on every render
- **Parallel Downloads**: Frontend batches downloads (5 at a time) using `Promise.all`

## Notes

- CORS enabled for all origins in development (`cors({ origin: '*' })`)
- Request body limit: 50mb for large payloads
- SPA fallback routes GET requests to `index.html` for client-side routing
- WebSocket clients must register before making API calls
- The server does NOT make external API calls directly - it relies on connected WebSocket clients to do so
- Download timeouts: 30s for images, 60s for videos
