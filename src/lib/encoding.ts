const utf8Encoder = new TextEncoder()

function bytesToBinary(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return binary
}

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  const base64 = btoa(bytesToBinary(bytes))
  return urlSafe ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : base64
}

export function base64Encode(text: string, urlSafe = false): string {
  return bytesToBase64(utf8Encoder.encode(text), urlSafe)
}

/** 兼容标准 / URL-safe / 缺省填充 / 含换行的 Base64 输入 */
export function base64ToBytes(input: string): Uint8Array {
  const normalized = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error('包含非法的 Base64 字符')
  }
  const body = normalized.replace(/=+$/, '')
  if (body.length % 4 === 1) {
    throw new Error('Base64 长度不正确')
  }
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

export function base64Decode(input: string): string {
  const bytes = base64ToBytes(input)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码结果不是合法的 UTF-8 文本')
  }
}

export type UrlEncodeMode = 'component' | 'uri' | 'all'

export function urlEncode(text: string, mode: UrlEncodeMode = 'component'): string {
  if (mode === 'uri') return encodeURI(text)
  if (mode === 'component') return encodeURIComponent(text)
  return Array.from(utf8Encoder.encode(text), (byte) => '%' + byte.toString(16).toUpperCase().padStart(2, '0')).join('')
}

export function urlDecode(text: string, plusAsSpace = false): string {
  const source = plusAsSpace ? text.replace(/\+/g, ' ') : text
  try {
    return decodeURIComponent(source)
  } catch {
    throw new Error('包含无法解码的百分号序列')
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  yen: '¥',
  euro: '€',
}

export function htmlEncode(text: string, encodeNonAscii = false): string {
  const escaped = text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
  if (!encodeNonAscii) return escaped
  return Array.from(escaped, (char) => {
    const codePoint = char.codePointAt(0)!
    return codePoint > 0x7e ? `&#x${codePoint.toString(16).toUpperCase()};` : char
  }).join('')
}

export function htmlDecode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X'
      const codePoint = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity
  })
}

export function unicodeEscape(text: string, onlyNonAscii = true): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    result += onlyNonAscii && code < 0x80 ? text[i] : '\\u' + code.toString(16).padStart(4, '0')
  }
  return result
}

export function unicodeUnescape(text: string): string {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (match, hex: string) => {
      const codePoint = parseInt(hex, 16)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
    })
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
}
