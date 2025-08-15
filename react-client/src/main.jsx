import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import Batch from './pages/Batch.jsx'
import Report from './pages/Report.jsx'
import Compare from './pages/Compare.jsx'
import Split from './pages/Split.jsx'
import Test from './pages/Test.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'batch', element: <Batch /> },
      { path: 'report', element: <Report /> },
      { path: 'compare', element: <Compare /> },
      { path: 'split', element: <Split /> },
      { path: 'test', element: <Test /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
