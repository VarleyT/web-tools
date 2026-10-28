import { describe, expect, it } from 'vitest'
import { hexToBytes, hexToText, textToHex } from './hex'

describe('textToHex', () => {
  it('encodes ASCII and UTF-8 text', () => {
    expect(textToHex('Hi!')).toBe('486921')
    expect(textToHex('中')).toBe('e4b8ad')
    expect(textToHex('')).toBe('')
  })

  it('applies case, prefix and separator', () => {
    expect(textToHex('Hi', { uppercase: true, prefix: '', separator: ' ' })).toBe('48 69')
    expect(textToHex('Hi', { uppercase: false, prefix: '0x', separator: ' ' })).toBe('0x48 0x69')
    expect(textToHex('Hi', { uppercase: true, prefix: '\\x', separator: '' })).toBe('\\x48\\x69')
    expect(textToHex('Hi', { uppercase: false, prefix: '', separator: ':' })).toBe('48:69')
  })
})

describe('hexToText', () => {
  it('accepts common separators and prefixes', () => {
    for (const input of ['486921', '48 69 21', '48:69:21', '0x48 0x69 0x21', '\\x48\\x69\\x21', '0x486921', '48-69\n21', '48,69,21']) {
      expect(hexToText(input)).toBe('Hi!')
    }
  })

  it('round-trips UTF-8', () => {
    expect(hexToText(textToHex('你好, world'))).toBe('你好, world')
  })

  it('reports invalid input', () => {
    expect(() => hexToBytes('48 6')).toThrow('偶数')
    expect(() => hexToBytes('zz')).toThrow('"z"')
    expect(() => hexToText('ff')).toThrow('UTF-8')
  })
})
