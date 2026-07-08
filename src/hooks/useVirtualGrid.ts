import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const DEFAULT_ITEM_MIN_WIDTH = 240
const DEFAULT_GAP = 12
const ITEM_HEIGHT_GRID = 140
const ITEM_HEIGHT_LIST = 64

/**
 * Virtualizes a flat item list for either a grid or list layout.
 *
 * In grid mode items are grouped into rows; each row is one virtualizer entry
 * so the row count (not item count) drives DOM size.
 *
 * Returns:
 *  - `parentRef`      — attach to the scrolling container
 *  - `virtualRows`    — virtualizer rows to render
 *  - `totalHeight`    — total scroll height (px) to set on the inner div
 *  - `getRowItems`    — resolves the items inside a given virtual row
 *  - `colCount`       — number of columns (1 in list mode)
 *  - `measureElement` — pass to each row div as `ref` for dynamic sizing
 */
export function useVirtualGrid<T>(
  items: T[],
  viewMode: 'grid' | 'list',
  itemMinWidth = DEFAULT_ITEM_MIN_WIDTH,
  gap = DEFAULT_GAP,
) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Observe container width changes
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const colCount =
    viewMode === 'list'
      ? 1
      : Math.max(1, Math.floor((containerWidth + gap) / (itemMinWidth + gap)))

  // Memoize row groups so getRowItems always reads a stable, up-to-date value
  const rows = useMemo<T[][]>(() => {
    const result: T[][] = []
    for (let i = 0; i < items.length; i += colCount) {
      result.push(items.slice(i, i + colCount))
    }
    return result
  }, [items, colCount])

  const rowHeight = viewMode === 'grid' ? ITEM_HEIGHT_GRID + gap : ITEM_HEIGHT_LIST + gap

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  })

  const getRowItems = useCallback(
    (rowIndex: number): T[] => rows[rowIndex] ?? [],
    [rows],
  )

  return {
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalHeight:  virtualizer.getTotalSize(),
    getRowItems,
    colCount,
    measureElement: virtualizer.measureElement,
  }
}
