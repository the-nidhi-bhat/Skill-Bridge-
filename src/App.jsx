import { lazy, Suspense, useEffect, useState } from 'react'
import Landing from './Landing.jsx'

const Dashboard = lazy(() => import('./Dashboard.jsx'))

function readTheme() {
  try { return localStorage.getItem('skillbridge-theme') || 'light' }
  catch { return 'light' }
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('skillbridge-theme', theme) } catch { /* storage is optional */ }
  }, [theme])

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  if (path !== '/dashboard') return <Landing theme={theme} setTheme={setTheme} />
  return <Suspense fallback={<main className="dashboard-loading" role="status">Preparing your career space…</main>}><Dashboard theme={theme} setTheme={setTheme} /></Suspense>
}
