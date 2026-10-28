export interface RegexMatch {
  index: number
  value: string
  groups: Array<string | undefined>
  named?: Record<string, string | undefined>
}

export const MAX_MATCHES = 1000

export function buildRegex(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '正则表达式不合法')
  }
}

/** 查找匹配；未带 g 标志时只返回首个匹配 */
export function findMatches(pattern: string, flags: string, text: string, limit = MAX_MATCHES): RegexMatch[] {
  if (pattern === '') return []
  const isGlobal = flags.includes('g')
  const regex = buildRegex(pattern, isGlobal ? flags : flags + 'g')
  const matches: RegexMatch[] = []
  for (const match of text.matchAll(regex)) {
    matches.push({ index: match.index, value: match[0], groups: match.slice(1), named: match.groups })
    if (matches.length >= limit || !isGlobal) break
  }
  return matches
}

export function replaceMatches(pattern: string, flags: string, text: string, replacement: string): string {
  if (pattern === '') return text
  return text.replace(buildRegex(pattern, flags), replacement)
}

export interface RegexPreset {
  label: string
  pattern: string
}

export const REGEX_PRESETS: readonly RegexPreset[] = [
  { label: '邮箱', pattern: '[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+' },
  { label: '手机号', pattern: '1[3-9]\\d{9}' },
  { label: 'URL', pattern: 'https?://[^\\s/$.?#][^\\s]*' },
  { label: 'IPv4', pattern: '\\b((25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b' },
  { label: '身份证号', pattern: '[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]' },
  { label: '日期', pattern: '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])' },
  { label: '中文', pattern: '[\\u4e00-\\u9fa5]+' },
  { label: '十六进制颜色', pattern: '#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b' },
]
