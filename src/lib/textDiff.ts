import { diffChars, diffLines, diffWords, type ChangeObject } from 'diff'

export type DiffMode = 'line' | 'word' | 'char'
export type DiffType = 'added' | 'removed' | 'same'

export interface DiffPart {
  value: string
  type: DiffType
}

export interface DiffSummary {
  parts: DiffPart[]
  added: number
  removed: number
}

function runDiff(original: string, modified: string, mode: DiffMode): ChangeObject<string>[] {
  if (mode === 'char') return diffChars(original, modified)
  if (mode === 'word') return diffWords(original, modified)
  return diffLines(original, modified)
}

export function computeDiff(original: string, modified: string, mode: DiffMode = 'line'): DiffSummary {
  const parts: DiffPart[] = runDiff(original, modified, mode).map((change) => ({
    value: change.value,
    type: change.added ? 'added' : change.removed ? 'removed' : 'same',
  }))
  const lineCount = (value: string) => value.split('\n').length - (value.endsWith('\n') ? 1 : 0)
  const unitsOf = (part: DiffPart) => (mode === 'line' ? lineCount(part.value) : 1)
  const count = (type: DiffType) => parts.filter((part) => part.type === type).reduce((sum, part) => sum + unitsOf(part), 0)
  return { parts, added: count('added'), removed: count('removed') }
}
