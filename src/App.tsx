import { Navigate, Route, Routes } from 'react-router-dom'
import TitleBar from '@/components/TitleBar/TitleBar'
import Sidebar from '@/components/Sidebar/Sidebar'
import SkillsPage from '@/pages/Skills/SkillsPage'
import WorkspacesPage from '@/pages/Workspaces/WorkspacesPage'
import DiscoverPage from '@/pages/Discover/DiscoverPage'
import ReposPage from '@/pages/Repos/ReposPage'
import SettingsPage from '@/pages/Settings/SettingsPage'

export default function App() {
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
    </div>
  )
}
