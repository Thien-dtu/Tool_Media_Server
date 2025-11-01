import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LoadingFallback from './components/common/LoadingFallback.jsx'

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
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
