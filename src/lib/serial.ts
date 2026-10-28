import { bytesToHex, hexToBytes } from './hex'

export type SerialDataBits = 5 | 6 | 7 | 8
export type SerialStopBits = 1 | 1.5 | 2
export type SerialParity = 'none' | 'odd' | 'even' | 'mark' | 'space'
/** software 为 XON / XOFF，由本工具在应用层实现 */
export type SerialFlowControl = 'none' | 'hardware' | 'software'

export interface SerialConfig {
  baudRate: number
  dataBits: SerialDataBits
  stopBits: SerialStopBits
  parity: SerialParity
  flowControl: SerialFlowControl
}

export const BAUD_RATES = [
  110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 56000, 57600, 115200, 128000, 230400, 256000, 460800,
  500000, 921600, 1000000, 1500000, 2000000, 3000000,
] as const

/** Web Serial 规范只接受这些取值，其余取值 open() 直接抛 TypeError */
const WEB_SERIAL_SUPPORTED = {
  dataBits: new Set<SerialDataBits>([7, 8]),
  stopBits: new Set<SerialStopBits>([1, 2]),
  parity: new Set<SerialParity>(['none', 'odd', 'even']),
}

type NativeSetting = keyof typeof WEB_SERIAL_SUPPORTED

export function isSupportedSetting<K extends NativeSetting>(field: K, value: SerialConfig[K]): boolean {
  return (WEB_SERIAL_SUPPORTED[field] as Set<SerialConfig[K]>).has(value)
}

const PARITY_NAMES: Record<SerialParity, string> = { none: '无', odd: '奇', even: '偶', mark: 'Mark', space: 'Space' }

/** 转为 Web Serial 的打开参数；浏览器无法配置的取值给出明确提示 */
export function toSerialOptions(config: SerialConfig): SerialOptions {
  const unsupported = [
    !isSupportedSetting('dataBits', config.dataBits) && `${config.dataBits} 位数据位`,
    !isSupportedSetting('stopBits', config.stopBits) && `${config.stopBits} 位停止位`,
    !isSupportedSetting('parity', config.parity) && `${PARITY_NAMES[config.parity]} 校验`,
  ].filter(Boolean)
  if (unsupported.length) throw new Error(`浏览器 Web Serial 不支持 ${unsupported.join('、')}`)
  return {
    baudRate: config.baudRate,
    dataBits: config.dataBits,
    stopBits: config.stopBits,
    parity: config.parity as SerialOptions['parity'],
    flowControl: config.flowControl === 'hardware' ? 'hardware' : 'none',
  }
}

export const XON = 0x11
export const XOFF = 0x13

/** 软件流控：剔除接收数据中的 XON / XOFF 控制字节，返回剩余数据与处理后的暂停状态 */
export function applySoftwareFlow(bytes: Uint8Array, paused: boolean): { data: Uint8Array; paused: boolean } {
  let state = paused
  const data = bytes.filter((byte) => {
    if (byte === XON) state = false
    else if (byte === XOFF) state = true
    else return true
    return false
  })
  return { data, paused: state }
}

export type DataFormat = 'text' | 'hex'
export type TextEncodingName = 'utf-8' | 'gbk'
export type LineEnding = 'none' | 'lf' | 'cr' | 'crlf'

const LINE_ENDING_TEXT: Record<LineEnding, string> = { none: '', lf: '\n', cr: '\r', crlf: '\r\n' }
const LF = 0x0a

export function parseBaudRate(input: string | number): number {
  const text = String(input).trim()
  const value = Number(text)
  if (text === '' || !Number.isInteger(value) || value <= 0) throw new Error('波特率必须是正整数')
  return value
}

// ── 文本编码 ────────────────────────────────────────────────────────

let gbkTable: Map<string, number> | null = null

/** TextEncoder 只支持 UTF-8：遍历全部 GBK 双字节码位反查，首次使用时构建一次 */
function getGbkTable(): Map<string, number> {
  if (gbkTable) return gbkTable
  const decoder = new TextDecoder('gbk')
  const table = new Map<string, number>()
  const pair = new Uint8Array(2)
  for (let lead = 0x81; lead <= 0xfe; lead++) {
    for (let trail = 0x40; trail <= 0xfe; trail++) {
      if (trail === 0x7f) continue
      pair[0] = lead
      pair[1] = trail
      const char = decoder.decode(pair)
      if (char.length === 1 && char !== '�' && !table.has(char)) table.set(char, (lead << 8) | trail)
    }
  }
  // WHATWG GBK 编码器把 € 编为单字节 0x80
  table.set('€', 0x80)
  gbkTable = table
  return table
}

export function encodeText(text: string, encoding: TextEncodingName): Uint8Array {
  if (encoding === 'utf-8') return new TextEncoder().encode(text)
  const table = getGbkTable()
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x80) {
      bytes.push(code)
      continue
    }
    const mapped = table.get(char)
    if (mapped === undefined) throw new Error(`字符“${char}”无法用 GBK 编码`)
    if (mapped <= 0xff) bytes.push(mapped)
    else bytes.push(mapped >> 8, mapped & 0xff)
  }
  return Uint8Array.from(bytes)
}

/** 非法字节显示为 �，不抛错：串口数据常夹杂噪声 */
export function decodeBytes(bytes: Uint8Array, encoding: TextEncodingName): string {
  return new TextDecoder(encoding).decode(bytes)
}

// ── 发送内容 ────────────────────────────────────────────────────────

export interface PayloadOptions {
  format: DataFormat
  encoding: TextEncodingName
  lineEnding: LineEnding
  /** 解析 \r \n \t \0 \\ \xHH 转义；未知转义原样保留 */
  escapes: boolean
}

const ESCAPE_PATTERN = /\\(x[0-9a-fA-F]{2}|[rnt0\\])/g
const ESCAPE_BYTES: Record<string, number> = { r: 0x0d, n: 0x0a, t: 0x09, '0': 0x00, '\\': 0x5c }

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function encodeWithEscapes(text: string, encoding: TextEncodingName): Uint8Array {
  const parts: Uint8Array[] = []
  let last = 0
  for (const match of text.matchAll(ESCAPE_PATTERN)) {
    const sequence = match[1]
    parts.push(encodeText(text.slice(last, match.index), encoding))
    parts.push(Uint8Array.of(sequence[0] === 'x' ? parseInt(sequence.slice(1), 16) : ESCAPE_BYTES[sequence]))
    last = match.index + match[0].length
  }
  parts.push(encodeText(text.slice(last), encoding))
  return concatBytes(parts)
}

/** 把发送框内容转为字节；Hex 模式不追加换行 */
export function buildPayload(input: string, options: PayloadOptions): Uint8Array {
  if (options.format === 'hex') return hexToBytes(input)
  const body = options.escapes ? encodeWithEscapes(input, options.encoding) : encodeText(input, options.encoding)
  return concatBytes([body, encodeText(LINE_ENDING_TEXT[options.lineEnding], 'utf-8')])
}

// ── 收发记录 ────────────────────────────────────────────────────────

export type Direction = 'rx' | 'tx'

export interface LogChunk {
  direction: Direction
  bytes: Uint8Array
  time: number
}

export interface LogEntry {
  readonly id: number
  readonly direction: Direction
  /** 首个分片到达时间 */
  readonly time: number
  /** 最后一个分片到达时间，用于判断分帧 */
  readonly lastTime: number
  readonly bytes: Uint8Array
}

export const DEFAULT_PACKET_TIMEOUT_MS = 20
const MIN_PACKET_TIMEOUT_MS = 1
const MAX_PACKET_TIMEOUT_MS = 60000

/** 分包超时取整并限制在 1 ~ 60000 ms；无效输入回退到默认 20 ms */
export function normalizePacketTimeout(value: unknown): number {
  const ms = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Math.floor(Number(value)) : Number.NaN
  if (!Number.isFinite(ms)) return DEFAULT_PACKET_TIMEOUT_MS
  return Math.min(MAX_PACKET_TIMEOUT_MS, Math.max(MIN_PACKET_TIMEOUT_MS, ms))
}

export interface AppendOptions {
  /** 分包超时：相邻 RX 分片间隔不超过该值时视为同一包；null 表示不分包，连续拼接 */
  frameGapMs: number | null
  /** 文本模式按行分条：遇到 LF 后开始新条目 */
  splitOnNewline: boolean
  maxEntries: number
  maxEntryBytes: number
}

function splitAfterNewline(bytes: Uint8Array): Uint8Array[] {
  const segments: Uint8Array[] = []
  let start = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== LF) continue
    segments.push(bytes.subarray(start, i + 1))
    start = i + 1
  }
  if (start < bytes.length) segments.push(bytes.subarray(start))
  return segments
}

function canMerge(last: LogEntry | undefined, chunk: LogChunk, options: AppendOptions): last is LogEntry {
  return (
    last !== undefined &&
    chunk.direction === 'rx' &&
    last.direction === 'rx' &&
    (options.frameGapMs === null || chunk.time - last.lastTime <= options.frameGapMs) &&
    !(options.splitOnNewline && last.bytes[last.bytes.length - 1] === LF) &&
    last.bytes.length + chunk.bytes.length <= options.maxEntryBytes
  )
}

/** 追加收发分片，返回新数组（不修改传入的记录）；超出上限时丢弃最旧的条目 */
export function appendToLog(log: readonly LogEntry[], chunks: readonly LogChunk[], options: AppendOptions): LogEntry[] {
  const next = [...log]
  let nextId = (log[log.length - 1]?.id ?? 0) + 1
  for (const chunk of chunks) {
    const segments = options.splitOnNewline ? splitAfterNewline(chunk.bytes) : [chunk.bytes]
    for (const bytes of segments) {
      const segment = { ...chunk, bytes }
      const last = next[next.length - 1]
      if (canMerge(last, segment, options)) {
        next[next.length - 1] = { ...last, lastTime: segment.time, bytes: concatBytes([last.bytes, bytes]) }
      } else {
        next.push({ id: nextId++, direction: segment.direction, time: segment.time, lastTime: segment.time, bytes: Uint8Array.from(bytes) })
      }
    }
  }
  return next.length > options.maxEntries ? next.slice(next.length - options.maxEntries) : next
}

// ── 显示格式 ────────────────────────────────────────────────────────

const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

export function formatClock(time: number): string {
  const date = new Date(time)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

/**
 * 控制字符换成 Unicode 控制图形（␀ ␍ …），保留 Tab 与换行（一包内的多行照常换行）；
 * 末尾一个换行由分条显示代替
 */
function visibleText(text: string): string {
  return text
    .replace(/\r?\n$/, '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, (char) => String.fromCharCode(0x2400 + char.charCodeAt(0)))
    .replace(/\u007f/g, '␡')
}

export function formatEntry(bytes: Uint8Array, format: DataFormat, encoding: TextEncodingName): string {
  if (format === 'hex') return bytesToHex(bytes, { uppercase: true, prefix: '', separator: ' ' })
  return visibleText(decodeBytes(bytes, encoding))
}

export function formatLogForExport(log: readonly LogEntry[], format: DataFormat, encoding: TextEncodingName): string {
  return log
    .map((entry) => `[${formatClock(entry.time)}] ${entry.direction.toUpperCase()} ${formatEntry(entry.bytes, format, encoding)}`)
    .join('\n')
}

// ── 端口描述 ────────────────────────────────────────────────────────

/** 常见 USB 转串口芯片 / 开发板厂商 ID */
const USB_VENDORS: Record<number, string> = {
  0x0403: 'FTDI',
  0x0483: 'STM32',
  0x067b: 'PL2303',
  0x10c4: 'CP210x',
  0x1a86: 'CH340 / CH343',
  0x2341: 'Arduino',
  0x2e8a: 'Raspberry Pi',
  0x303a: 'Espressif',
}

const hex4 = (value: number): string => value.toString(16).toUpperCase().padStart(4, '0')

/** 浏览器拿不到 COM 口名称，只能用 USB VID:PID 区分设备 */
export function describePort(info: SerialPortInfo): string {
  if (info.usbVendorId === undefined) return '串口设备'
  const id = `${hex4(info.usbVendorId)}:${hex4(info.usbProductId ?? 0)}`
  const vendor = USB_VENDORS[info.usbVendorId]
  return vendor ? `${vendor} (${id})` : `USB 设备 (${id})`
}
