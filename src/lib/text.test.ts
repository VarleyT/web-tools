import { describe, expect, it } from 'vitest'
import { findMatches, replaceMatches } from './regex'
import { computeDiff } from './textDiff'
import { textStats } from './textStats'

describe('textStats', () => {
  it('counts mixed CJK and latin text', () => {
    const stats = textStats('你好 world, it’s me\n\n第二段')
    expect(stats.cjk).toBe(5)
    expect(stats.words).toBe(8)
    expect(stats.lines).toBe(3)
    expect(stats.paragraphs).toBe(2)
    expect(stats.characters).toBe(22)
    expect(stats.charactersNoSpaces).toBe(17)
    expect(stats.bytes).toBe(new TextEncoder().encode('你好 world, it’s me\n\n第二段').length)
  })

  it('handles empty input and emoji', () => {
    expect(textStats('')).toMatchObject({ characters: 0, words: 0, lines: 0, paragraphs: 0, bytes: 0 })
    expect(textStats('😀').characters).toBe(1)
  })
})

describe('regex', () => {
  it('finds all matches with groups', () => {
    const matches = findMatches('(?<key>\\w+)=(\\d+)', 'g', 'a=1, b=22')
    expect(matches).toHaveLength(2)
    expect(matches[1]).toMatchObject({ index: 5, value: 'b=22', groups: ['b', '22'] })
    expect(matches[0].named).toEqual({ key: 'a' })
  })

  it('returns only first match without g flag and respects limit', () => {
    expect(findMatches('\\d', '', '123')).toHaveLength(1)
    expect(findMatches('\\d', 'g', '12345', 2)).toHaveLength(2)
  })

  it('handles zero-length matches and empty pattern', () => {
    expect(findMatches('^', 'gm', 'a\nb')).toHaveLength(2)
    expect(findMatches('', 'g', 'abc')).toEqual([])
  })

  it('replaces and reports invalid patterns', () => {
    expect(replaceMatches('(\\w+)@', 'g', 'a@ b@', '[$1]')).toBe('[a] [b]')
    expect(replaceMatches('', 'g', 'abc', 'x')).toBe('abc')
    expect(() => findMatches('(', 'g', 'x')).toThrow()
  })
})

describe('computeDiff', () => {
  it('counts added and removed lines', () => {
    const result = computeDiff('a\nb\nc\n', 'a\nB\nc\nd\n')
    expect(result.added).toBe(2)
    expect(result.removed).toBe(1)
  })

  it('counts added blank lines', () => {
    const result = computeDiff('a\nb\n', 'a\n\n\nb\n')
    expect(result.added).toBe(2)
    expect(result.removed).toBe(0)
  })

  it('supports char mode', () => {
    const result = computeDiff('cat', 'cut', 'char')
    expect(result.parts.filter((part) => part.type !== 'same').map((part) => part.value)).toEqual(['a', 'u'])
  })
})
