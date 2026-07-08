import { useEffect, useState } from 'react'
import { PlusIcon, UploadIcon } from '@/components/icons'
import { useWorkspaceStore, type Workspace } from '@/stores/workspaceStore'
import { Button } from '@/components/ui/button'
import WorkspaceCard from '@/components/WorkspaceCard/WorkspaceCard'
import WorkspaceForm from '@/components/WorkspaceForm/WorkspaceForm'

export default function WorkspacesPage() {
  const {
    workspaces, fetchWorkspaces, createWorkspace, updateWorkspace,
    deleteWorkspace, activateWorkspace, exportYaml, importYaml,
  } = useWorkspaceStore()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  const handleExport = async (ws: Workspace) => {
    const yaml = await exportYaml(ws.id)
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ws.name.replace(/\s+/g, '-')}-workspace.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setImporting(true)
    try {
      const result = await importYaml(text)
      const msg = `导入成功：${result.name}（${result.importedSkills} 个技能）` +
        (result.missingSkills.length > 0 ? `，${result.missingSkills.length} 个技能未找到` : '')
      setImportMsg(msg)
      setTimeout(() => setImportMsg(''), 4000)
    } catch (err) {
      setImportMsg(`导入失败：${err}`)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--color-text-primary)]">工作区</h1>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
            按业务场景组织你的技能集
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <label className="cursor-pointer">
            <input type="file" accept=".yaml,.yml" onChange={handleImport} className="hidden" />
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors">
              <UploadIcon size={13} />
              {importing ? '导入中...' : '导入 YAML'}
            </div>
          </label>
          <Button onClick={() => { setEditTarget(null); setShowForm(true) }} size="md">
            <PlusIcon size={13} />
            新建工作区
          </Button>
        </div>
      </div>

      {/* Import toast */}
      {importMsg && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)]">
          {importMsg}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-[14px] text-[var(--color-text-secondary)]">还没有工作区</p>
            <Button onClick={() => setShowForm(true)} size="lg">
              创建第一个工作区
            </Button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onActivate={() => activateWorkspace(ws.id)}
                onEdit={() => { setEditTarget(ws); setShowForm(true) }}
                onDelete={async () => {
                  if (confirm(`确认删除工作区 "${ws.name}"？`)) await deleteWorkspace(ws.id)
                }}
                onExport={() => handleExport(ws)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <WorkspaceForm
          initial={editTarget ?? undefined}
          onSave={async (data) => {
            if (editTarget) await updateWorkspace(editTarget.id, data)
            else await createWorkspace(data)
          }}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
