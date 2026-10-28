import { describe, expect, it } from 'vitest'
import { describeTime, detectUnit, formatDate, parseTimeInput, relativeTime, timestampToDate } from './timestamp'

describe('timestamp', () => {
  it('detects unit by digit count', () => {
    expect(detectUnit('1700000000')).toBe('s')
    expect(detectUnit('1700000000000')).toBe('ms')
    expect(detectUnit('1700000000000000')).toBe('us')
    expect(detectUnit('1700000000000000000')).toBe('ns')
  })

  it('converts timestamps of every unit to the same instant', () => {
    for (const value of ['1700000000', '1700000000000', '1700000000000000', '1700000000000000000']) {
      expect(timestampToDate(value).getTime()).toBe(1700000000000)
    }
    expect(timestampToDate('1700000000', 'ms').getTime()).toBe(1700000000)
    expect(() => timestampToDate('12a')).toThrow()
  })

  it('parses date strings as local time', () => {
    expect(formatDate(parseTimeInput('2024-03-05 08:09:10'))).toBe('2024-03-05 08:09:10')
    expect(formatDate(parseTimeInput('2024-03-05'))).toBe('2024-03-05 00:00:00')
    expect(parseTimeInput('2024-03-05T00:00:00Z').getTime()).toBe(Date.UTC(2024, 2, 5))
    expect(() => parseTimeInput('not a date')).toThrow()
    expect(() => parseTimeInput(' ')).toThrow('输入为空')
  })

  it('accepts non-padded dates, single-digit hours and spaced offsets', () => {
    expect(formatDate(parseTimeInput('2024-1-2'))).toBe('2024-01-02 00:00:00')
    expect(formatDate(parseTimeInput('2024-1-2 9:05:00'))).toBe('2024-01-02 09:05:00')
    expect(parseTimeInput('2024-01-01 12:00:00 +08:00').getTime()).toBe(Date.UTC(2024, 0, 1, 4))
    expect(parseTimeInput('2024-01-01 12:00:00 Z').getTime()).toBe(Date.UTC(2024, 0, 1, 12))
  })

  it('returns empty strings for invalid dates instead of throwing', () => {
    const invalid = new Date(Number.NaN)
    expect(formatDate(invalid)).toBe('')
    expect(relativeTime(invalid)).toBe('')
  })

  it('formats with milliseconds pattern', () => {
    expect(formatDate(new Date(2024, 0, 2, 3, 4, 5, 6), 'YYYY/MM/DD HH:mm:ss.SSS')).toBe('2024/01/02 03:04:05.006')
  })

  it('describes relative time', () => {
    const now = Date.UTC(2024, 0, 1)
    expect(relativeTime(new Date(now - 3 * 3600 * 1000), now)).toBe('3小时前')
    expect(relativeTime(new Date(now + 2 * 24 * 3600 * 1000), now)).toBe('后天')
    expect(relativeTime(new Date(now), now)).toBe('现在')
    expect(describeTime(new Date(now), now)).toMatchObject({ seconds: String(now / 1000), iso: '2024-01-01T00:00:00.000Z' })
  })
})
