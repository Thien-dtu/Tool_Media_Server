# GEMINI.md

## Project Overview

This project is a Node.js backend application built with Express.js. It acts as a bridge between HTTP clients and a WebSocket client. The server listens for HTTP requests and forwards them as commands to a connected WebSocket client. The primary functionality is to download media (images and videos) from URLs provided by the client, save them to the local filesystem, and track the downloaded content.

The application appears to be designed to work with a client that scrapes or interacts with a platform like Instagram, given the file names and data structures.

**Key Technologies:**
- **Backend:** Node.js, Express.js
- **Real-time Communication:** WebSocket (`ws` library)
- **HTTP Client:** Axios
- **Data Storage:** JSON files for tracking saved media and cursors.

**Architecture:**
- **`main.js`:** The application entry point, responsible for starting the HTTP and WebSocket servers.
- **`app.js`:** Configures the Express application, including middleware and API routes.
- **`routes/`:** Defines the HTTP API endpoints for various functionalities like triggering API calls (`/call`), downloading media (`/download`), and managing reports.
- **`controllers/`:** Contains the core business logic for handling requests from the routes.
- **`ws/`:** Manages WebSocket connections, including client registration, heartbeats, and message passing between the server and clients.
- **`utils/`:** A collection of utility modules for file operations, media type detection, retry logic, and more.
- **`data/`:** Stores persistent data, such as `saved_images.json` (a log of downloaded media) and `last_cursors.json` (for pagination).
- **`result/`:** The directory where downloaded media files are saved, organized by username.

## Building and Running

**Dependencies:**

This project does not have a `package.json` file. Based on the source code, the following dependencies are required:

- `express`
- `cors`
- `ws`
- `axios`

You can install them using npm:

```bash
npm install express cors ws axios
```

**Running the Application:**

To start the server, run the following command from the project's root directory:

```bash
node main.js
```

The server will start on port 3000 by default.

## Development Conventions

- **Code Style:** The code uses CommonJS modules (`require`/`module.exports`). It is written in JavaScript and appears to follow standard formatting conventions.
- **Asynchronous Operations:** The application heavily uses `async/await` for handling asynchronous operations, particularly for file system access and HTTP requests.
- **Error Handling:** The code includes basic error handling for server startup, network requests, and file operations.
- **Modularity:** The code is well-organized into modules with specific responsibilities (e.g., routes, controllers, utils), which makes it easier to understand and maintain.
