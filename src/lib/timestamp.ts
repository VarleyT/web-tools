export type TimestampUnit = 's' | 'ms' | 'us' | 'ns'

const MS_PER_UNIT: Record<TimestampUnit, number> = { s: 1000, ms: 1, us: 1e-3, ns: 1e-6 }

const NUMERIC = /^-?\d+(\.\d+)?$/

/** 根据整数位数推断时间戳单位 */
export function detectUnit(digits: string): TimestampUnit {
  const length = digits.replace(/^-/, '').length
  if (length <= 10) return 's'
  if (length <= 13) return 'ms'
  if (length <= 16) return 'us'
  return 'ns'
}

export function timestampToDate(value: string, unit?: TimestampUnit): Date {
  const trimmed = value.trim()
  if (!NUMERIC.test(trimmed)) throw new Error('时间戳只能包含数字')
  const resolvedUnit = unit ?? detectUnit(trimmed.split('.')[0])
  const date = new Date(Math.round(Number(trimmed) * MS_PER_UNIT[resolvedUnit]))
  if (Number.isNaN(date.getTime())) throw new Error('时间戳超出可表示范围')
  return date
}

/** 解析时间戳或日期字符串；不带时区的日期按本地时间解析 */
export function parseTimeInput(input: string): Date {
  const trimmed = input.trim()
  if (trimmed === '') throw new Error('输入为空')
  if (NUMERIC.test(trimmed)) return timestampToDate(trimmed)

  const date = new Date(normalizeDateString(trimmed))
  if (!isValidDate(date)) throw new Error('无法识别的日期格式')
  return date
}

const DATE_WITH_OPTIONAL_TIME = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](.+))?$/

/** 把 2024-1-2 9:05 / 2024-01-02 10:00:00 +08:00 等写法规范成 ISO 8601，其余原样交给 Date 解析 */
function normalizeDateString(text: string): string {
  const match = DATE_WITH_OPTIONAL_TIME.exec(text)
  if (!match) return text
  const [, year, month, day, time] = match
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (!time) return `${date}T00:00:00`
  const normalizedTime = time
    .trim()
    .replace(/^(\d):/, '0$1:')
    .replace(/\s+(?=(?:Z|[+-]\d{2}:?\d{2})$)/i, '')
  return `${date}T${normalizedTime}`
}

export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

/** 按本地时区格式化：支持 YYYY MM DD HH mm ss SSS；非法日期返回空字符串 */
export function formatDate(date: Date, pattern = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!isValidDate(date)) return ''
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    SSS: pad(date.getMilliseconds(), 3),
  }
  return pattern.replace(/YYYY|SSS|MM|DD|HH|mm|ss/g, (token) => tokens[token])
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
  ['second', SECOND],
]

export function relativeTime(date: Date, now: number = Date.now(), locale = 'zh-CN'): string {
  const diff = date.getTime() - now
  if (!Number.isFinite(diff)) return ''
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const [unit, size] = RELATIVE_UNITS.find(([, size]) => Math.abs(diff) >= size) ?? ['second', SECOND]
  return formatter.format(Math.round(diff / size), unit)
}

export interface TimeDescription {
  seconds: string
  milliseconds: string
  local: string
  iso: string
  utc: string
  relative: string
}

export function describeTime(date: Date, now: number = Date.now()): TimeDescription {
  return {
    seconds: String(Math.floor(date.getTime() / 1000)),
    milliseconds: String(date.getTime()),
    local: formatDate(date, 'YYYY-MM-DD HH:mm:ss.SSS'),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    relative: relativeTime(date, now),
  }
}
