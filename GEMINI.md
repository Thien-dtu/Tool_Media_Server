# GEMINI.md

## Project Overview

This project is a full-stack media downloader application with a Node.js backend and a React frontend. It is designed to download media from platforms like Instagram and Facebook. The application uses a SQLite database to store metadata about users, media, and API call reports, providing a robust system for tracking and querying downloaded content.

The backend is built with Express.js and communicates with clients via WebSockets. The frontend is a React application built with Vite that provides a user interface for viewing and analyzing social media data.

The project is in a transitional phase, migrating from a flat-file JSON/JSONL data storage system to a more robust SQLite database. This "Parallel Write Pattern" ensures data integrity and allows for a safe rollback if necessary.

## Key Technologies

*   **Backend:** Node.js, Express.js, WebSocket (`ws`)
*   **Frontend:** React, Vite
*   **Database:** SQLite
*   **Testing:** Jest

## Building and Running

### Backend

To run the backend server:

1.  Install dependencies: `npm install`
2.  Run in development mode: `npm start`

The backend server will run on `http://localhost:3000`.

### Frontend

To run the frontend application:

1.  Navigate to the `react-client` directory: `cd react-client`
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev`

The frontend will be accessible at `http://localhost:5173`.

### Database Migrations

The project includes several scripts for migrating the database schema and data. These scripts are located in the `database` directory.

*   To run the initial migration from JSON to SQLite: `node database/migrate.js`
*   To apply the latest platform ID migration: `node database/apply-migration.js`
*   To migrate existing users to the new platform ID system: `node database/migrate-platform-ids.js`

## Development Conventions

*   **Database:** The database schema is defined in `docs/DATABASE_DESIGN.md`. The application is in a transitional phase, writing to both the new SQLite database and legacy JSON files.
*   **API:** The backend provides a RESTful API for interacting with the database. The available endpoints are documented in `docs/API-ENDPOINTS.md`.
*   **Testing:** The project uses Jest for backend unit testing. To run the tests, use the command `npm run test:unit`. The testing strategy and structure are outlined in `docs/TESTING.md`.
*   **Platform ID Integration:** The application is moving towards using platform-specific IDs (e.g., Facebook UID, Instagram UUID) as primary identifiers for users, while maintaining backward compatibility with usernames. The integration process is detailed in `docs/PLATFORM_ID_INTEGRATION.md`.

## Key Files and Directories

*   `src/`: The Node.js backend source code.
*   `react-client/`: The React frontend source code.
*   `database/`: Database migration scripts and schema definitions.
*   `docs/`: Project documentation.
*   `data/`: JSON and JSONL data files.
*   `scripts/`: Master migration script.
*   `tests/`: Jest tests.
*   `package.json`: Project dependencies and scripts.
*   `README.md`: Project overview and setup instructions.
