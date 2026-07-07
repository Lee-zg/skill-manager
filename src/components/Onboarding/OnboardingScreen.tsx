import { useState } from 'react'
import { Layers, RefreshCw, CheckCircle } from 'lucide-react'
import { useSkillStore, type ScanResult } from '@/stores/skillStore'

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { scanSkills } = useSkillStore()
  const [step, setStep] = useState<'welcome' | 'scanning' | 'done'>('welcome')
  const [result, setResult] = useState<ScanResult | null>(null)

  const handleScan = async () => {
    setStep('scanning')
    try {
      const r = await scanSkills()
      setResult(r)
      setStep('done')
    } catch {
      setStep('welcome')
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-6 p-8"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ width: 72, height: 72, background: 'var(--color-accent-muted)', border: '1px solid rgba(99,102,241,0.3)' }}
      >
        <Layers size={36} style={{ color: 'var(--color-accent)' }} />
      </div>

      {step === 'welcome' && (
        <>
          <div className="text-center">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              欢迎使用 SkillHub
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 360, lineHeight: 1.7 }}>
              SkillHub 将扫描您本地安装的 Claude Code、Agents 和 cc-switch 技能，统一管理。
            </p>
          </div>
          <button
            onClick={handleScan}
            style={{
              background: 'var(--color-accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            开始扫描技能
          </button>
        </>
      )}

      {step === 'scanning' && (
        <div className="text-center">
          <RefreshCw size={24} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 12 }}>
            正在扫描本地技能...
          </p>
        </div>
      )}

      {step === 'done' && result && (
        <>
          <div className="text-center">
            <CheckCircle size={32} style={{ color: 'var(--color-success)', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              扫描完成！共发现 {result.total} 个技能
            </h2>
            <div className="flex flex-col gap-1.5 mt-4">
              {result.byTool.map((t) => (
                <div key={t.toolId} className="flex items-center justify-between gap-8"
                  style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <span>{t.toolName}</span>
                  <span style={{ color: t.available ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}>
                    {t.available ? `${t.count} 个技能` : '未检测到'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onComplete}
            style={{
              background: 'var(--color-accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            进入 SkillHub →
          </button>
        </>
      )}
    </div>
  )
}
