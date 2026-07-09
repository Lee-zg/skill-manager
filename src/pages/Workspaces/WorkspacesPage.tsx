import { useEffect, useState } from 'react'
import { PlusIcon, UploadIcon } from '@/components/icons'
import { useWorkspaceStore, type Workspace } from '@/stores/workspaceStore'
import { useInvocationStore } from '@/stores/invocationStore'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import WorkspaceCard from '@/components/WorkspaceCard/WorkspaceCard'
import WorkspaceForm from '@/components/WorkspaceForm/WorkspaceForm'

export default function WorkspacesPage() {
  const {
    workspaces, fetchWorkspaces, createWorkspace, updateWorkspace,
    deleteWorkspace, activateWorkspace, exportYaml, importYaml,
  } = useWorkspaceStore()
  const { addConfigMappings } = useInvocationStore()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [mappingMsg, setMappingMsg] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)

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

  const handleAddWorkspaceMapping = async (ws: Workspace) => {
    setMappingMsg('')
    try {
      const result = await addConfigMappings({
        targetType: 'workspace',
        targetId: ws.id,
        toolId: 'codex',
        scope: 'user',
        mode: 'auto',
      })
      setMappingMsg(`已添加工作区「${ws.name}」映射：${result.mapped} 条` +
        (result.conflicts ? `，${result.conflicts} 条冲突` : ''))
      setTimeout(() => setMappingMsg(''), 4000)
    } catch (err) {
      setMappingMsg(`映射失败：${err}`)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">工作区</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            按业务场景组织你的技能集
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <label className="cursor-pointer">
            <input type="file" accept=".yaml,.yml" onChange={handleImport} className="hidden" />
            <div className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 text-[14px] text-[var(--color-text-secondary)] transition-[transform,background-color,border-color,color] duration-150 hover:-translate-y-0.5 hover:bg-[var(--color-bg-hover)]">
              <UploadIcon size={16} />
              {importing ? '导入中...' : '导入 YAML'}
            </div>
          </label>
          <Button onClick={() => { setEditTarget(null); setShowForm(true) }} size="md">
            <PlusIcon size={16} />
            新建工作区
          </Button>
        </div>
      </div>

      {/* Import toast */}
      {importMsg && (
        <div className="mx-6 mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 text-[14px] text-[var(--color-text-secondary)]">
          {importMsg}
        </div>
      )}
      {mappingMsg && (
        <div className="mx-6 mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 text-[14px] text-[var(--color-text-secondary)]">
          {mappingMsg}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-[17px] text-[var(--color-text-secondary)]">还没有工作区</p>
            <Button onClick={() => setShowForm(true)} size="lg">
              创建第一个工作区
            </Button>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onActivate={() => activateWorkspace(ws.id)}
                onEdit={() => { setEditTarget(ws); setShowForm(true) }}
                onDelete={() => setDeleteTarget(ws)}
                onExport={() => handleExport(ws)}
                onMap={() => handleAddWorkspaceMapping(ws)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <WorkspaceForm
          initial={editTarget ?? undefined}
          onSave={async (data) => {
            if (editTarget) {
              await updateWorkspace(editTarget.id, data)
              return editTarget
            }
            return createWorkspace(data)
          }}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除工作区"
        description={`确认删除工作区 "${deleteTarget?.name ?? ''}"？工作区配置会被移除，但不会删除技能文件。`}
        confirmText="删除"
        danger
        onConfirm={async () => {
          if (deleteTarget) await deleteWorkspace(deleteTarget.id)
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
