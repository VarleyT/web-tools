const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

const PREFIXES: Record<number, RegExp> = {
  2: /^0b/,
  8: /^0o/,
  16: /^0x/,
}

function assertBase(base: number): void {
  if (!Number.isInteger(base) || base < 2 || base > 36) throw new Error('进制范围为 2 ~ 36')
}

export function parseBigInt(value: string, base: number): bigint {
  assertBase(base)
  const cleaned = value.trim().replace(/[\s_]/g, '').toLowerCase()
  const negative = cleaned.startsWith('-')
  const unsigned = negative ? cleaned.slice(1) : cleaned
  const body = PREFIXES[base] ? unsigned.replace(PREFIXES[base], '') : unsigned
  if (body === '') throw new Error('输入为空')

  const bigBase = BigInt(base)
  let result = 0n
  for (const char of body) {
    const digit = DIGITS.indexOf(char)
    if (digit < 0 || digit >= base) throw new Error(`字符 "${char}" 不是合法的 ${base} 进制数字`)
    result = result * bigBase + BigInt(digit)
  }
  return negative ? -result : result
}

export function convertBase(value: string, from: number, to: number, uppercase = false): string {
  assertBase(to)
  const result = parseBigInt(value, from).toString(to)
  return uppercase ? result.toUpperCase() : result
}
