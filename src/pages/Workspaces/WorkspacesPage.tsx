import { useEffect, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { useWorkspaceStore, type Workspace } from '@/stores/workspaceStore'
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
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            工作区
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            按业务场景组织你的技能集
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept=".yaml,.yml" onChange={handleImport}
              style={{ display: 'none' }} />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              <Upload size={13} />
              {importing ? '导入中...' : '导入 YAML'}
            </div>
          </label>
          {/* Create */}
          <button onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
            style={{ background: 'var(--color-accent)', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} />
            新建工作区
          </button>
        </div>
      </div>

      {/* Import result toast */}
      {importMsg && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-md"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {importMsg}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              还没有工作区
            </p>
            <button onClick={() => setShowForm(true)}
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer' }}>
              创建第一个工作区
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onActivate={() => activateWorkspace(ws.id)}
                onEdit={() => { setEditTarget(ws); setShowForm(true) }}
                onDelete={async () => {
                  if (confirm(`确认删除工作区 "${ws.name}"？`)) {
                    await deleteWorkspace(ws.id)
                  }
                }}
                onExport={() => handleExport(ws)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit form modal */}
      {showForm && (
        <WorkspaceForm
          initial={editTarget ?? undefined}
          onSave={async (data) => {
            if (editTarget) {
              await updateWorkspace(editTarget.id, data)
            } else {
              await createWorkspace(data)
            }
          }}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
