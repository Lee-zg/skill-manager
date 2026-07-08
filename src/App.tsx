import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import TitleBar from '@/components/TitleBar/TitleBar'
import Sidebar from '@/components/Sidebar/Sidebar'
import OnboardingScreen from '@/components/Onboarding/OnboardingScreen'
import CommandPalette from '@/components/CommandPalette/CommandPalette'
import SkillsPage from '@/pages/Skills/SkillsPage'
import WorkspacesPage from '@/pages/Workspaces/WorkspacesPage'
import DiscoverPage from '@/pages/Discover/DiscoverPage'
import ReposPage from '@/pages/Repos/ReposPage'
import SettingsPage from '@/pages/Settings/SettingsPage'

const ONBOARDING_KEY = 'skillhub-onboarded'

export default function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === 'true',
  )
  const [cmdOpen, setCmdOpen] = useState(false)

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboarded(true)
  }

  if (!onboarded) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)' }}>
        <TitleBar />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/skills" replace />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/repos" element={<ReposPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
