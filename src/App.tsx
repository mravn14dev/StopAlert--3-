import type { ReactElement } from 'react'
import { MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './context/AppState'
import { AppShell } from './components/AppShell'
import { LandingPage } from './pages/Landing'
import { AuthPage } from './pages/Auth'
import { DashboardPage } from './pages/Dashboard'
import { JourneySetupPage } from './pages/JourneySetup'
import { LivePage } from './pages/Live'
import { ContactsPage } from './pages/Contacts'
import { HistoryPage } from './pages/History'
import { SettingsPage } from './pages/Settings'

function Guard({ children }: { children: ReactElement }) {
  const { user } = useApp()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route
          element={
            <Guard>
              <AppShell />
            </Guard>
          }
        >
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/new" element={<JourneySetupPage />} />
          <Route path="/app/live" element={<LivePage />} />
          <Route path="/app/contacts" element={<ContactsPage />} />
          <Route path="/app/history" element={<HistoryPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
      
      </Routes>

      <footer style={{
        background: "#0b1220",
        color: "#94a3b8",
        textAlign: "center",
        padding: "20px",
        fontSize: "13px",
        borderTop: "1px solid #263449"
      }}>
        <p>© 2026 StopAlert. All Rights Reserved.</p>
        <p>
          Designed &amp; Developed by <strong style={{ color: "#ffffff" }}>YOUR NAME</strong>
        </p>
      </footer>

    </MotionConfig>

  )
}
