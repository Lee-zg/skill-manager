import { useEffect, useMemo, useState } from 'react'
import { useSkillStore } from '@/stores/skillStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
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
    searchSkills,
    scanSkills,
  } = useSkillStore()
  const { activeWorkspace, listWorkspaceSkills } = useWorkspaceStore()

  const [scanning, setScanning] = useState(false)
  const [workspaceSkillIds, setWorkspaceSkillIds] = useState<Set<string> | null>(null)
  const [scanMessage, setScanMessage] = useState('')

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  useEffect(() => {
    const query = searchQuery.trim()
    const timeoutId = window.setTimeout(() => {
      if (query) void searchSkills(query)
      else void fetchSkills()
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [fetchSkills, searchQuery, searchSkills])

  useEffect(() => {
    if (!activeWorkspace) {
      queueMicrotask(() => setWorkspaceSkillIds(null))
      return
    }

    let cancelled = false
    listWorkspaceSkills(activeWorkspace.id)
      .then((workspaceSkills) => {
        if (!cancelled) {
          setWorkspaceSkillIds(new Set(workspaceSkills.map((item) => item.skillId)))
        }
      })
      .catch(() => {
        if (!cancelled) setWorkspaceSkillIds(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspace, listWorkspaceSkills])

  const handleScan = async () => {
    setScanning(true)
    setScanMessage('')
    try {
      const result = await scanSkills()
      setScanMessage(
        result.errors.length > 0
          ? `扫描完成，发现 ${result.total} 个技能，${result.errors.length} 个问题。`
          : `扫描完成，发现 ${result.total} 个技能。`,
      )
    } finally {
      setScanning(false)
    }
  }

  const filteredSkills = useMemo(() => {
    const scopedSkills = workspaceSkillIds
      ? skills.filter((skill) => workspaceSkillIds.has(skill.id))
      : skills
    return filterSkills(scopedSkills, { searchQuery, filterTool, filterCategory })
  }, [filterCategory, filterTool, searchQuery, skills, workspaceSkillIds])

  const { parentRef, virtualItems, totalHeight, getRowItems, colCount } =
    useVirtualGrid(filteredSkills, viewMode)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkillsToolbar onScan={handleScan} scanning={scanning} />
        {scanMessage && (
          <div className="mx-4 mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
            {scanMessage}
          </div>
        )}

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
                        variant={viewMode}
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
