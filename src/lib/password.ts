export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very-strong'

export const MIN_PASSWORD_LENGTH = 4
export const MAX_PASSWORD_LENGTH = 256

type CharSetName = 'lowercase' | 'uppercase' | 'digits' | 'symbols'

const CHAR_SETS: Record<CharSetName, string> = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
}

const AMBIGUOUS = /[0Oo1lI|]/g
const UINT32_RANGE = 2 ** 32

export type RandomInt = (maxExclusive: number) => number

/** 基于 crypto.getRandomValues 的均匀随机整数，拒绝采样避免取模偏差 */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new Error('随机数范围非法')
  }
  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % maxExclusive
  }
}

function enabledSets(options: PasswordOptions): string[] {
  return (Object.keys(CHAR_SETS) as CharSetName[])
    .filter((name) => options[name])
    .map((name) => (options.excludeAmbiguous ? CHAR_SETS[name].replace(AMBIGUOUS, '') : CHAR_SETS[name]))
}

export function buildCharset(options: PasswordOptions): string {
  return enabledSets(options).join('')
}

/** 生成密码，保证每个启用的字符类别至少出现一次 */
export function generatePassword(options: PasswordOptions, randomInt: RandomInt = secureRandomInt): string {
  const { length } = options
  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new Error(`密码长度须在 ${MIN_PASSWORD_LENGTH} ~ ${MAX_PASSWORD_LENGTH} 之间`)
  }
  const sets = enabledSets(options)
  if (sets.length === 0) throw new Error('至少选择一种字符类型')

  const charset = sets.join('')
  const pick = (source: string) => source[randomInt(source.length)]
  const chars = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(charset))]
  // Fisher-Yates 洗牌，打散必选字符的位置
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function estimateEntropy(length: number, charsetSize: number): number {
  return charsetSize <= 1 ? 0 : length * Math.log2(charsetSize)
}

export function strengthLevel(entropyBits: number): StrengthLevel {
  if (entropyBits < 40) return 'weak'
  if (entropyBits < 60) return 'fair'
  if (entropyBits < 100) return 'strong'
  return 'very-strong'
}
