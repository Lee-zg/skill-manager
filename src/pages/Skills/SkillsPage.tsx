import { useEffect, useState } from 'react'
import { useSkillStore } from '@/stores/skillStore'
import SkillCard from '@/components/SkillCard/SkillCard'
import SkillDetailPanel from '@/components/SkillDetailPanel/SkillDetailPanel'
import SkillsToolbar from '@/components/SkillsToolbar/SkillsToolbar'

export default function SkillsPage() {
  const {
    skills,
    loading,
    searchQuery,
    selectedSkill,
    setSelectedSkill,
    viewMode,
    filterTool,
    fetchSkills,
    scanSkills,
  } = useSkillStore()

  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const handleScan = async () => {
    setScanning(true)
    try {
      await scanSkills()
    } finally {
      setScanning(false)
    }
  }

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    if (filterTool && s.toolId !== filterTool) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.note?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkillsToolbar onScan={handleScan} scanning={scanning} />

        {/* Skills grid/list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && !skills.length ? (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: 'var(--color-text-placeholder)', fontSize: 13 }}>加载中...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {searchQuery ? '未找到匹配的技能' : '暂无技能'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  style={{
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    opacity: scanning ? 0.7 : 1,
                  }}
                >
                  {scanning ? '扫描中...' : '扫描本地技能'}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr',
                gap: 12,
              }}
            >
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  selected={selectedSkill?.id === skill.id}
                  onClick={() => setSelectedSkill(skill)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedSkill && (
        <SkillDetailPanel skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      )}
    </div>
  )
}
