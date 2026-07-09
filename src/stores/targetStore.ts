import { create } from 'zustand'
import { listTargets, repairInstallations, runDoctor, type DoctorReport, type TargetInfo } from '@/lib/api'

interface TargetState {
  targets: TargetInfo[]
  doctorReport: DoctorReport | null
  loading: boolean
  fetchTargets: () => Promise<void>
  checkDoctor: () => Promise<DoctorReport>
  repair: () => Promise<DoctorReport>
}

export const useTargetStore = create<TargetState>((set) => ({
  targets: [],
  doctorReport: null,
  loading: false,

  fetchTargets: async () => {
    set({ loading: true })
    try {
      set({ targets: await listTargets() })
    } finally {
      set({ loading: false })
    }
  },

  checkDoctor: async () => {
    const report = await runDoctor()
    set({ doctorReport: report })
    return report
  },

  repair: async () => {
    const report = await repairInstallations()
    set({ doctorReport: report })
    return report
  },
}))
