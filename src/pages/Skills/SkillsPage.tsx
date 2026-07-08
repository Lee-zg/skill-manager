import { useEffect, useState } from 'react'
import { useSkillStore } from '@/stores/skillStore'
import { filterSkills } from '@/lib/filterSkills'
import SkillCard from '@/components/SkillCard/SkillCard'
import SkillDetailPanel from '@/components/SkillDetailPanel/SkillDetailPanel'
import SkillsToolbar from '@/components/SkillsToolbar/SkillsToolbar'
import { useVirtualGrid } from '@/hooks/useVirtualGrid'

export default function SkillsPage() {
  const {
    skills,
    loading,
    searchQuery,
    selectedSkill,
    setSelectedSkill,
    viewMode,
    filterTool,
    filterCategory,
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

  const filteredSkills = filterSkills(skills, { searchQuery, filterTool, filterCategory })

  const { parentRef, virtualItems, totalHeight, getRowItems, colCount } =
    useVirtualGrid(filteredSkills, viewMode)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkillsToolbar onScan={handleScan} scanning={scanning} />

        {/* Skills grid/list — virtualised */}
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto p-4"
        >
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
            /* Virtual scroll outer — fixed height tells the browser the total scroll area */
            <div style={{ height: totalHeight, position: 'relative' }}>
              {virtualItems.map((virtualRow) => {
                const rowItems = getRowItems(virtualRow.index)
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'grid',
                      gridTemplateColumns:
                        viewMode === 'grid'
                          ? `repeat(${colCount}, minmax(0, 1fr))`
                          : '1fr',
                      gap: 12,
                      paddingBottom: 12,
                    }}
                  >
                    {rowItems.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        selected={selectedSkill?.id === skill.id}
                        onClick={() => setSelectedSkill(skill)}
                      />
                    ))}
                  </div>
                )
              })}
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
