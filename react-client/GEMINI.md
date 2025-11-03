# Project Overview

This is a React-based web application for viewing and analyzing data from various sources. Based on the file structure and component names, it appears to be a data visualization dashboard with features for:

*   Displaying data in tables and charts.
*   Batch processing of data.
*   Comparing different data sets.
*   Generating various reports.
*   Viewing data from sources like TikTok and Instagram.

The application is built with [Vite](https://vitejs.dev/), uses [React](https://react.dev/) for the user interface, and [React Router](https://reactrouter.com/) for navigation. Data fetching and state management are likely handled by [TanStack Query](https://tanstack.com/query/latest). Charting capabilities are provided by [Chart.js](https://www.chartjs.org/).

# Building and Running

The following scripts are available in `package.json`:

*   **`npm run dev`**: Starts the development server with hot reloading. The application will be accessible at `http://localhost:5173` by default (Vite's default port, but may vary).
*   **`npm run build`**: Creates a production-ready build of the application in the `dist` directory.
*   **`npm run lint`**: Lints the codebase using ESLint to enforce code quality.
*   **`npm run preview`**: Serves the production build locally for previewing before deployment.

# Development Conventions

*   **Component-Based Architecture:** The application follows a component-based architecture, with components organized in the `src/components` directory.
*   **Routing:** Routing is handled by `react-router-dom`, with routes defined in `src/main.jsx`.
*   **Code Splitting:** Page components are lazy-loaded to improve initial load performance.
*   **Styling:** CSS files are located alongside their respective components, and a global stylesheet is present at `src/index.css`.
*   **API Interaction:** The project includes `src/lib/apiClient.js` and `src/lib/dbApiClient.js`, suggesting that it interacts with backend APIs to fetch and manipulate data.
