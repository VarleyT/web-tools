export type HexPrefix = '' | '0x' | '\\x'
export type HexSeparator = '' | ' ' | ':'

export interface HexFormat {
  uppercase: boolean
  prefix: HexPrefix
  separator: HexSeparator
}

export const DEFAULT_HEX_FORMAT: HexFormat = { uppercase: false, prefix: '', separator: '' }

export function bytesToHex(bytes: Uint8Array, format: HexFormat = DEFAULT_HEX_FORMAT): string {
  return Array.from(bytes, (byte) => {
    const hex = byte.toString(16).padStart(2, '0')
    return format.prefix + (format.uppercase ? hex.toUpperCase() : hex)
  }).join(format.separator)
}

/** 文本按 UTF-8 编码为十六进制（ASCII 字符各占 1 字节） */
export function textToHex(text: string, format: HexFormat = DEFAULT_HEX_FORMAT): string {
  return bytesToHex(new TextEncoder().encode(text), format)
}

/** 解析十六进制：兼容空格 / 换行 / 冒号 / 逗号 / 连字符分隔，以及 0x、\x 前缀 */
export function hexToBytes(input: string): Uint8Array<ArrayBuffer> {
  const digits = input
    .replace(/\\x/gi, ' ')
    .split(/[\s,:;-]+/)
    .map((token) => token.replace(/^0x/i, ''))
    .join('')
  const invalid = /[^0-9a-f]/i.exec(digits)
  if (invalid) throw new Error(`包含非十六进制字符 "${invalid[0]}"`)
  if (digits.length % 2 !== 0) throw new Error('十六进制位数必须为偶数（每个字节 2 位）')
  const bytes = new Uint8Array(digits.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(digits.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

export function hexToText(input: string): string {
  const bytes = hexToBytes(input)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码结果不是合法的 UTF-8 / ASCII 文本')
  }
}
