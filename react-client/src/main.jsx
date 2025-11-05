import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LoadingFallback from './components/common/LoadingFallback.jsx'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
)
import { Bar } from 'react-chartjs-2'

// Lazy load all page components for code splitting
const Home = lazy(() => import('./pages/Home.jsx'))
const Batch = lazy(() => import('./pages/Batch.jsx'))
const Report = lazy(() => import('./pages/Report.jsx'))
const DatabaseReport = lazy(() => import('./pages/DatabaseReport.jsx'))
const Compare = lazy(() => import('./pages/Compare.jsx'))
const Split = lazy(() => import('./pages/Split.jsx'))
const Test = lazy(() => import('./pages/Test.jsx'))
const TiktokDataViewer = lazy(() => import('./pages/TiktokDataViewer.jsx'))
const StoryViewer = lazy(() => import('./pages/StoryViewer.jsx'))
const Following = lazy(() => import('./pages/Following.jsx'))
const FollowingUrls = lazy(() => import('./pages/FollowingUrls.jsx'))
const PlatformUrls = lazy(() => import('./pages/PlatformUrls.jsx'))

// Lazy load report page components
const SummaryDashboard = lazy(() => import('./pages/reports/SummaryDashboard.jsx'))
const TopUsersReport = lazy(() => import('./pages/reports/TopUsersReport.jsx'))
const InactiveUsersReport = lazy(() => import('./pages/reports/InactiveUsersReport.jsx'))
const UserEngagementReport = lazy(() => import('./pages/reports/UserEngagementReport.jsx'))
const DownloadTimelineReport = lazy(() => import('./pages/reports/DownloadTimelineReport.jsx'))
const ApiFrequencyReport = lazy(() => import('./pages/reports/ApiFrequencyReport.jsx'))
const CompletionTrendsReport = lazy(() => import('./pages/reports/CompletionTrendsReport.jsx'))
const MediaDeduplicationReport = lazy(() => import('./pages/reports/MediaDeduplicationReport.jsx'))
const CompletionByApiReport = lazy(() => import('./pages/reports/CompletionByApiReport.jsx'))
const UsernameChangesReport = lazy(() => import('./pages/reports/UsernameChangesReport.jsx'))
const DuplicateUsernamesReport = lazy(() => import('./pages/reports/DuplicateUsernamesReport.jsx'))
const CursorProgressReport = lazy(() => import('./pages/reports/CursorProgressReport.jsx'))
const PlatformComparisonReport = lazy(() => import('./pages/reports/PlatformComparisonReport.jsx'))
const CohortAnalysisReport = lazy(() => import('./pages/reports/CohortAnalysisReport.jsx'))
const ApiHealthReport = lazy(() => import('./pages/reports/ApiHealthReport.jsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingFallback />}><Home /></Suspense> },
      { path: 'batch', element: <Suspense fallback={<LoadingFallback />}><Batch /></Suspense> },
      { path: 'report', element: <Suspense fallback={<LoadingFallback />}><Report /></Suspense> },
      { path: 'db-report', element: <Suspense fallback={<LoadingFallback />}><DatabaseReport /></Suspense> },
      { path: 'compare', element: <Suspense fallback={<LoadingFallback />}><Compare /></Suspense> },
      { path: 'split', element: <Suspense fallback={<LoadingFallback />}><Split /></Suspense> },
      { path: 'test', element: <Suspense fallback={<LoadingFallback />}><Test /></Suspense> },
      { path: 'tiktok', element: <Suspense fallback={<LoadingFallback />}><TiktokDataViewer /></Suspense> },
      { path: 'stories', element: <Suspense fallback={<LoadingFallback />}><StoryViewer /></Suspense> },
      { path: 'following', element: <Suspense fallback={<LoadingFallback />}><Following /></Suspense> },
      { path: 'following-urls', element: <Suspense fallback={<LoadingFallback />}><FollowingUrls /></Suspense> },
      { path: 'platform-urls', element: <Suspense fallback={<LoadingFallback />}><PlatformUrls /></Suspense> },

      // Analytics & Reports pages
      { path: 'reports/summary', element: <Suspense fallback={<LoadingFallback />}><SummaryDashboard /></Suspense> },
      { path: 'reports/top-users', element: <Suspense fallback={<LoadingFallback />}><TopUsersReport /></Suspense> },
      { path: 'reports/inactive-users', element: <Suspense fallback={<LoadingFallback />}><InactiveUsersReport /></Suspense> },
      { path: 'reports/user-engagement', element: <Suspense fallback={<LoadingFallback />}><UserEngagementReport /></Suspense> },
      { path: 'reports/download-timeline', element: <Suspense fallback={<LoadingFallback />}><DownloadTimelineReport /></Suspense> },
      { path: 'reports/api-frequency', element: <Suspense fallback={<LoadingFallback />}><ApiFrequencyReport /></Suspense> },
      { path: 'reports/completion-trends', element: <Suspense fallback={<LoadingFallback />}><CompletionTrendsReport /></Suspense> },
      { path: 'reports/media-deduplication', element: <Suspense fallback={<LoadingFallback />}><MediaDeduplicationReport /></Suspense> },
      { path: 'reports/completion-by-api', element: <Suspense fallback={<LoadingFallback />}><CompletionByApiReport /></Suspense> },
      { path: 'reports/username-changes', element: <Suspense fallback={<LoadingFallback />}><UsernameChangesReport /></Suspense> },
      { path: 'reports/duplicate-usernames', element: <Suspense fallback={<LoadingFallback />}><DuplicateUsernamesReport /></Suspense> },
      { path: 'reports/cursor-progress', element: <Suspense fallback={<LoadingFallback />}><CursorProgressReport /></Suspense> },
      { path: 'reports/platform-comparison', element: <Suspense fallback={<LoadingFallback />}><PlatformComparisonReport /></Suspense> },
      { path: 'reports/cohort-analysis', element: <Suspense fallback={<LoadingFallback />}><CohortAnalysisReport /></Suspense> },
      { path: 'reports/api-health', element: <Suspense fallback={<LoadingFallback />}><ApiHealthReport /></Suspense> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <RouterProvider router={router} />
  // </StrictMode>,
)
