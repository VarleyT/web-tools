import { describe, expect, it } from 'vitest'
import {
  base64Decode,
  base64Encode,
  base64ToBytes,
  htmlDecode,
  htmlEncode,
  unicodeEscape,
  unicodeUnescape,
  urlDecode,
  urlEncode,
} from './encoding'

describe('base64', () => {
  it('encodes and decodes UTF-8 text', () => {
    expect(base64Encode('你好, world')).toBe('5L2g5aW9LCB3b3JsZA==')
    expect(base64Decode('5L2g5aW9LCB3b3JsZA==')).toBe('你好, world')
  })

  it('supports URL-safe output without padding', () => {
    expect(base64Encode('??>>', true)).toBe('Pz8-Pg')
    expect(base64Decode('Pz8-Pg')).toBe('??>>')
  })

  it('ignores whitespace and missing padding', () => {
    expect(base64Decode('aGVs\nbG8')).toBe('hello')
  })

  it('rejects illegal characters and lengths', () => {
    expect(() => base64ToBytes('abc$')).toThrow('非法')
    expect(() => base64ToBytes('abcde')).toThrow('长度')
  })

  it('rejects invalid UTF-8 output', () => {
    expect(() => base64Decode('/w==')).toThrow('UTF-8')
  })
})

describe('url', () => {
  it('encodes by component, uri and all modes', () => {
    expect(urlEncode('a b&c=中')).toBe('a%20b%26c%3D%E4%B8%AD')
    expect(urlEncode('https://x.com/?a=1', 'uri')).toBe('https://x.com/?a=1')
    expect(urlEncode('a-', 'all')).toBe('%61%2D')
  })

  it('decodes with optional plus-as-space', () => {
    expect(urlDecode('a%20b+c')).toBe('a b+c')
    expect(urlDecode('a%20b+c', true)).toBe('a b c')
    expect(() => urlDecode('%E4%B8')).toThrow()
  })
})

describe('html entities', () => {
  it('escapes special characters', () => {
    expect(htmlEncode(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
    expect(htmlEncode('中', true)).toBe('&#x4E2D;')
  })

  it('decodes named and numeric entities', () => {
    expect(htmlDecode('&lt;b&gt; &amp; &#20013; &#x1F600; &copy; &unknown;')).toBe('<b> & 中 😀 © &unknown;')
  })
})

describe('unicode escape', () => {
  it('round-trips non-ASCII including surrogate pairs', () => {
    const escaped = unicodeEscape('A中😀')
    expect(escaped).toBe('A\\u4e2d\\ud83d\\ude00')
    expect(unicodeUnescape(escaped)).toBe('A中😀')
  })

  it('escapes all characters when requested and supports \\u{...}', () => {
    expect(unicodeEscape('A', false)).toBe('\\u0041')
    expect(unicodeUnescape('\\u{1F600}')).toBe('😀')
  })
})
