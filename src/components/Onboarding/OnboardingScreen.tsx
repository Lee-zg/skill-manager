import { useState } from 'react'
import { LayersIcon, RefreshCwIcon, CheckCircleIcon } from '@/components/icons'
import { useSkillStore, type ScanResult } from '@/stores/skillStore'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-[var(--color-bg-base)]">
      {/* Logo mark */}
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 72, height: 72,
          background: 'var(--color-accent-muted)',
          border: '1px solid rgba(99,102,241,0.3)',
        }}
      >
        <LayersIcon size={36} className="text-[var(--color-accent)]" />
      </div>

      {step === 'welcome' && (
        <>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] mb-2">
              欢迎使用 SkillHub
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[360px] leading-[1.7]">
              SkillHub 将扫描您本地安装的 Claude Code、Agents 和 cc-switch 技能，统一管理。
            </p>
          </div>
          <Button onClick={handleScan} size="lg" className="px-7">
            开始扫描技能
          </Button>
        </>
      )}

      {step === 'scanning' && (
        <div className="text-center">
          <RefreshCwIcon
            size={24}
            className="text-[var(--color-accent)] animate-spin mx-auto"
          />
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-3">
            正在扫描本地技能...
          </p>
        </div>
      )}

      {step === 'done' && result && (
        <>
          <div className="text-center">
            <CheckCircleIcon
              size={32}
              className="text-[var(--color-success)] mx-auto mb-3"
            />
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1.5">
              扫描完成！共发现 {result.total} 个技能
            </h2>
            <div className="flex flex-col gap-1.5 mt-4">
              {result.byTool.map((t) => (
                <div
                  key={t.toolId}
                  className="flex items-center justify-between gap-8 text-[12px] text-[var(--color-text-secondary)]"
                >
                  <span>{t.toolName}</span>
                  <span
                    style={{
                      color: t.available ? 'var(--color-success)' : 'var(--color-text-placeholder)',
                    }}
                  >
                    {t.available ? `${t.count} 个技能` : '未检测到'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={onComplete} size="lg" className="px-7">
            进入 SkillHub →
          </Button>
        </>
      )}
    </div>
  )
}
