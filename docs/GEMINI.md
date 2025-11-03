# GEMINI.md

## Project Overview

This project is a media downloader application with a Node.js backend and a React frontend. It is designed to download media from platforms like Instagram and Facebook. The application uses a SQLite database to store metadata about users, media, and API call reports, providing a robust system for tracking and querying downloaded content.

The backend is built with Express.js and the frontend is a React application.

## Building and Running

### Backend

To run the backend server:

1.  Install dependencies: `npm install`
2.  Run in development mode (with hot-reloading): `npm run dev`
3.  Run in production mode: `npm start`

The backend server will run on `http://localhost:3000`.

### Frontend

To run the frontend application:

1.  Navigate to the `react-client` directory: `cd react-client`
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev`
4.  Build for production: `npm run build`

The frontend will be accessible at `http://localhost:5173`.

## Development Conventions

### Database

The project uses a SQLite database. The database schema is defined in `DATABASE_DESIGN.md`. The application is in a transitional phase, writing to both the new SQLite database and legacy JSON files. This "Parallel Write Pattern" ensures data integrity and allows for a safe rollback if necessary.

### API

The backend provides a RESTful API for interacting with the database. The available endpoints are documented in `API-ENDPOINTS.md`.

### Testing

The project uses Jest for backend unit testing. To run the tests, use the following command:

```bash
npm run test:unit
```

The testing strategy and structure are outlined in `TESTING.md`.

### Platform ID Integration

The application is moving towards using platform-specific IDs (e.g., Facebook UID, Instagram UUID) as primary identifiers for users, while maintaining backward compatibility with usernames. The integration process is detailed in `PLATFORM_ID_INTEGRATION.md`.

## Key Files

*   `API-ENDPOINTS.md`: Documentation for all API endpoints.
*   `DATABASE_DESIGN.md`: The Entity-Relationship Diagram and schema for the SQLite database.
*   `PHASE2.md`: Implementation guide for the database integration.
*   `PLATFORM_ID_INTEGRATION.md`: Guide for the platform ID integration.
*   `TESTING.md`: The project's testing strategy and guide.
