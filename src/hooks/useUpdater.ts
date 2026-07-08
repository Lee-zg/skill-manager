import { useState, useCallback } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'up-to-date' }
  | { type: 'available'; update: Update }
  | { type: 'downloading'; progress: number }
  | { type: 'ready' }
  | { type: 'error'; message: string }

/**
 * Wraps Tauri's updater plugin into a simple state machine.
 * Usage: const { status, checkUpdate, install } = useUpdater()
 */
export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })

  const checkUpdate = useCallback(async () => {
    setStatus({ type: 'checking' })
    try {
      const update = await check()
      if (update?.available) {
        setStatus({ type: 'available', update })
      } else {
        setStatus({ type: 'up-to-date' })
        // Reset to idle after 5 s so the button isn't stuck on "最新版本"
        setTimeout(() => setStatus({ type: 'idle' }), 5_000)
      }
    } catch (err) {
      setStatus({ type: 'error', message: String(err) })
    }
  }, [])

  const install = useCallback(async () => {
    if (status.type !== 'available') return
    const { update } = status

    let downloaded = 0
    let total = 0

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0
            setStatus({ type: 'downloading', progress: 0 })
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            setStatus({
              type: 'downloading',
              progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
            })
            break
          case 'Finished':
            setStatus({ type: 'ready' })
            break
        }
      })
      // If install completes without a Finished event (in-place update), relaunch
      await relaunch()
    } catch (err) {
      setStatus({ type: 'error', message: String(err) })
    }
  }, [status])

  return { status, checkUpdate, install }
}
