/**
 * Regression tests for useVirtualGrid row-grouping logic.
 *
 * The hook itself calls useVirtualizer (needs real DOM), so we test the pure
 * row-chunking math independently — this is the logic most likely to produce
 * a blank list when broken.
 *
 * Regression: contain:strict was added to the scroll container, which sets
 * size-containment and reports 0 px height to the virtualizer → blank screen.
 * That fix lives in SkillsPage (removed the style), but the row math is what
 * we can unit-test here.
 */
import { describe, it, expect } from 'vitest'

/** Extracted row-grouping logic (mirrors useVirtualGrid internals) */
function groupIntoRows<T>(items: T[], colCount: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += colCount) {
    rows.push(items.slice(i, i + colCount))
  }
  return rows
}

/** Column count formula (mirrors useVirtualGrid internals) */
function computeColCount(
  containerWidth: number,
  itemMinWidth: number,
  gap: number,
  viewMode: 'grid' | 'list',
): number {
  if (viewMode === 'list') return 1
  return Math.max(1, Math.floor((containerWidth + gap) / (itemMinWidth + gap)))
}

const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))

describe('useVirtualGrid row grouping', () => {
  it('groups items into rows of colCount', () => {
    const rows = groupIntoRows(items, 3)
    expect(rows).toHaveLength(4)          // ceil(10 / 3) = 4
    expect(rows[0]).toHaveLength(3)
    expect(rows[3]).toHaveLength(1)       // last row may be partial
  })

  it('returns a single column in list mode', () => {
    const cols = computeColCount(900, 240, 12, 'list')
    expect(cols).toBe(1)
    const rows = groupIntoRows(items, cols)
    expect(rows).toHaveLength(10)
    rows.forEach((r) => expect(r).toHaveLength(1))
  })

  it('calculates correct column count for grid mode', () => {
    // containerWidth=900, itemMinWidth=240, gap=12
    // floor((900+12)/(240+12)) = floor(912/252) = floor(3.619) = 3
    expect(computeColCount(900, 240, 12, 'grid')).toBe(3)
    // very narrow container → at least 1 column
    expect(computeColCount(100, 240, 12, 'grid')).toBe(1)
  })

  it('returns empty rows for empty item list', () => {
    expect(groupIntoRows([], 3)).toHaveLength(0)
  })

  it('handles items exactly divisible by colCount', () => {
    const rows = groupIntoRows(Array.from({ length: 9 }, (_, i) => i), 3)
    expect(rows).toHaveLength(3)
    rows.forEach((r) => expect(r).toHaveLength(3))
  })

  it('produces correct total item count across all rows', () => {
    const rows = groupIntoRows(items, 4)
    const total = rows.reduce((s, r) => s + r.length, 0)
    expect(total).toBe(items.length)
  })
})

describe('SkillsPage scroll container regression', () => {
  it('SkillsPage source must not contain contain:strict (black screen regression)', async () => {
    // Read the source text directly so the test breaks if someone re-adds
    // contain:strict — the property that causes a 0-height scroll container
    // and a blank virtual list.
    const { readFileSync } = await import('fs')
    const { resolve, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    const dir = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(
      resolve(dir, '../../pages/Skills/SkillsPage.tsx'),
      'utf8',
    )
    expect(src).not.toMatch(/contain\s*:\s*['"]strict['"]/)
  })
})
