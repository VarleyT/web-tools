import YAML from 'yaml'

export type JsonIndent = 2 | 4 | '\t'

export class JsonParseError extends Error {
  constructor(
    message: string,
    readonly line?: number,
    readonly column?: number,
  ) {
    super(message)
    this.name = 'JsonParseError'
  }
}

function locate(text: string, position: number): { line: number; column: number } {
  const lines = text.slice(0, position).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

/** 解析 JSON，失败时抛出带行列号的 JsonParseError */
export function parseJson(text: string): unknown {
  if (text.trim() === '') throw new JsonParseError('输入为空')
  try {
    return JSON.parse(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const lineColumn = /line (\d+) column (\d+)/.exec(message)
    if (lineColumn) {
      throw new JsonParseError(message, Number(lineColumn[1]), Number(lineColumn[2]))
    }
    const position = /position (\d+)/.exec(message)
    if (position) {
      const { line, column } = locate(text, Number(position[1]))
      throw new JsonParseError(`${message}（第 ${line} 行，第 ${column} 列）`, line, column)
    }
    throw new JsonParseError(message)
  }
}

const NUMBER_LITERAL = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const MAX_REPORTED_LOSSY = 5

/**
 * 找出超出安全整数范围的整数字面量（JSON.parse 后会丢失精度，如 ID、雪花算法值）。
 * 跳过字符串内容，只扫描真正的数字 token。
 */
export function findLossyIntegers(text: string): string[] {
  const lossy: string[] = []
  let i = 0
  while (i < text.length && lossy.length < MAX_REPORTED_LOSSY) {
    const char = text[i]
    if (char === '"') {
      i++
      while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1
      i++
      continue
    }
    if (char === '-' || (char >= '0' && char <= '9')) {
      NUMBER_LITERAL.lastIndex = i
      const literal = NUMBER_LITERAL.exec(text)?.[0] ?? char
      if (/^-?\d+$/.test(literal) && !Number.isSafeInteger(Number(literal))) lossy.push(literal)
      i += literal.length
      continue
    }
    i++
  }
  return lossy
}

/** YAML 版本：以 BigInt 解析整数，找出转为 JSON 后会丢失精度的值；YAML 不合法时返回空数组 */
export function findLossyYamlIntegers(text: string): string[] {
  const lossy: string[] = []
  const visit = (value: unknown): void => {
    if (lossy.length >= MAX_REPORTED_LOSSY) return
    if (typeof value === 'bigint') {
      if (!Number.isSafeInteger(Number(value))) lossy.push(value.toString())
    } else if (Array.isArray(value)) {
      value.forEach(visit)
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(visit)
    }
  }
  try {
    visit(YAML.parse(text, { intAsBigInt: true }))
  } catch {
    return []
  }
  return lossy
}

/** 递归按键名排序，返回新对象 */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])]),
    )
  }
  return value
}

export function formatJson(text: string, indent: JsonIndent = 2, sortKeys = false): string {
  const value = parseJson(text)
  return JSON.stringify(sortKeys ? sortKeysDeep(value) : value, null, indent)
}

export function minifyJson(text: string): string {
  return JSON.stringify(parseJson(text))
}

/** 转义为可嵌入字符串字面量的 JSON 字符串（不含首尾引号） */
export function escapeJsonString(text: string): string {
  return JSON.stringify(text).slice(1, -1)
}

export function unescapeJsonString(text: string): string {
  const quoted = /^".*"$/s.test(text) ? text : `"${text}"`
  let value: unknown
  try {
    value = JSON.parse(quoted)
  } catch {
    throw new Error('不是合法的 JSON 转义字符串')
  }
  return typeof value === 'string' ? value : text
}

export function jsonToYaml(text: string, indent = 2): string {
  return YAML.stringify(parseJson(text), { indent })
}

export function yamlToJson(text: string, indent: JsonIndent = 2): string {
  if (text.trim() === '') throw new Error('输入为空')
  const doc = YAML.parseDocument(text)
  if (doc.errors.length > 0) throw new Error(doc.errors[0].message)
  return JSON.stringify(doc.toJS(), null, indent)
}
