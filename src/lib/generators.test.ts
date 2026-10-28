import { describe, expect, it } from 'vitest'
import {
  buildCharset,
  estimateEntropy,
  generatePassword,
  secureRandomInt,
  strengthLevel,
  type PasswordOptions,
} from './password'
import { formatUuid, generateUuids, uuidV4, uuidV7, type UuidFormat } from './uuid'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const PLAIN: UuidFormat = { uppercase: false, hyphens: true, braces: false }

describe('uuid', () => {
  it('generates RFC-compliant v4 and v7', () => {
    expect(uuidV4()).toMatch(UUID_PATTERN)
    expect(uuidV4()[14]).toBe('4')
    const v7 = uuidV7(0x0123456789ab)
    expect(v7).toMatch(UUID_PATTERN)
    expect(v7.slice(0, 13)).toBe('01234567-89ab')
    expect(v7[14]).toBe('7')
  })

  it('orders v7 by time', () => {
    const now = Date.now()
    expect(uuidV7(now) < uuidV7(now + 1000)).toBe(true)
  })

  it('keeps v7 strictly increasing within the same millisecond', () => {
    const now = Date.now() + 10_000
    const ids = Array.from({ length: 5000 }, () => uuidV7(now))
    expect(ids.every((id, i) => i === 0 || ids[i - 1] < id)).toBe(true)
    expect(ids.every((id) => UUID_PATTERN.test(id))).toBe(true)
  })

  it('formats and clamps count', () => {
    const id = '0123abcd-0000-4000-8000-000000000000'
    expect(formatUuid(id, { uppercase: true, hyphens: false, braces: true })).toBe('{0123ABCD000040008000000000000000}')
    expect(generateUuids('v4', 3, PLAIN)).toHaveLength(3)
    expect(generateUuids('v7', 0, PLAIN)).toHaveLength(1)
    expect(generateUuids('v4', 99999, PLAIN)).toHaveLength(1000)
  })
})

const base: PasswordOptions = {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: false,
}

describe('password', () => {
  it('includes every enabled class', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword({ ...base, length: 4, symbols: true })
      expect(password).toHaveLength(4)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/\d/)
      expect(password).toMatch(/[^a-zA-Z\d]/)
    }
  })

  it('excludes ambiguous characters', () => {
    expect(buildCharset({ ...base, excludeAmbiguous: true })).not.toMatch(/[0Oo1lI]/)
  })

  it('validates options', () => {
    expect(() => generatePassword({ ...base, length: 2 })).toThrow('长度')
    expect(() => generatePassword({ ...base, lowercase: false, uppercase: false, digits: false })).toThrow('至少')
  })

  it('produces random ints within range', () => {
    for (let i = 0; i < 100; i++) {
      const value = secureRandomInt(7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
    }
    expect(() => secureRandomInt(0)).toThrow()
  })

  it('estimates entropy and strength', () => {
    expect(estimateEntropy(16, 62)).toBeCloseTo(95.27, 1)
    expect(estimateEntropy(10, 1)).toBe(0)
    expect(strengthLevel(30)).toBe('weak')
    expect(strengthLevel(50)).toBe('fair')
    expect(strengthLevel(80)).toBe('strong')
    expect(strengthLevel(128)).toBe('very-strong')
  })
})
