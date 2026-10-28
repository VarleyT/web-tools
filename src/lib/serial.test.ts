import { describe, expect, it } from 'vitest'
import {
  appendToLog,
  buildPayload,
  decodeBytes,
  describePort,
  encodeText,
  formatClock,
  formatEntry,
  applySoftwareFlow,
  formatLogForExport,
  isSupportedSetting,
  normalizePacketTimeout,
  parseBaudRate,
  toSerialOptions,
  XOFF,
  XON,
  type SerialConfig,
  type AppendOptions,
  type LogChunk,
  type LogEntry,
} from './serial'

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values)
const ascii = (text: string): Uint8Array => new TextEncoder().encode(text)

const OPTIONS: AppendOptions = { frameGapMs: 20, splitOnNewline: false, maxEntries: 100, maxEntryBytes: 64 }
const rx = (text: string, time: number): LogChunk => ({ direction: 'rx', bytes: ascii(text), time })
const tx = (text: string, time: number): LogChunk => ({ direction: 'tx', bytes: ascii(text), time })
const texts = (log: readonly LogEntry[]): string[] => log.map((entry) => new TextDecoder().decode(entry.bytes))

describe('parseBaudRate', () => {
  it('accepts positive integers', () => {
    expect(parseBaudRate('115200')).toBe(115200)
    expect(parseBaudRate(' 9600 ')).toBe(9600)
  })

  it('rejects invalid values', () => {
    for (const input of ['', '0', '-9600', '96.5', 'abc']) {
      expect(() => parseBaudRate(input)).toThrow('波特率')
    }
  })
})

describe('toSerialOptions', () => {
  const base: SerialConfig = { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' }

  it('maps supported settings to Web Serial options', () => {
    expect(toSerialOptions({ ...base, dataBits: 7, stopBits: 2, parity: 'even', flowControl: 'hardware' })).toEqual({
      baudRate: 9600,
      dataBits: 7,
      stopBits: 2,
      parity: 'even',
      flowControl: 'hardware',
    })
  })

  it('opens without native flow control for software XON/XOFF', () => {
    expect(toSerialOptions({ ...base, flowControl: 'software' }).flowControl).toBe('none')
  })

  it('rejects settings the browser cannot configure', () => {
    expect(() => toSerialOptions({ ...base, dataBits: 5 })).toThrow('5 位数据位')
    expect(() => toSerialOptions({ ...base, dataBits: 6 })).toThrow('6 位数据位')
    expect(() => toSerialOptions({ ...base, stopBits: 1.5 })).toThrow('1.5 位停止位')
    expect(() => toSerialOptions({ ...base, parity: 'mark' })).toThrow('Mark 校验')
    expect(() => toSerialOptions({ ...base, parity: 'space' })).toThrow('Space 校验')
  })

  it('reports which settings are supported', () => {
    expect(isSupportedSetting('dataBits', 8)).toBe(true)
    expect(isSupportedSetting('dataBits', 6)).toBe(false)
    expect(isSupportedSetting('stopBits', 1.5)).toBe(false)
    expect(isSupportedSetting('parity', 'odd')).toBe(true)
    expect(isSupportedSetting('parity', 'space')).toBe(false)
  })
})

describe('applySoftwareFlow', () => {
  it('strips XON / XOFF and tracks the last state', () => {
    expect(applySoftwareFlow(bytes(0x41, XOFF, 0x42), false)).toEqual({ data: bytes(0x41, 0x42), paused: true })
    expect(applySoftwareFlow(bytes(XOFF, 0x41, XON), false)).toEqual({ data: bytes(0x41), paused: false })
    expect(applySoftwareFlow(bytes(0x41), true)).toEqual({ data: bytes(0x41), paused: true })
  })
})

describe('encodeText / decodeBytes', () => {
  it('handles UTF-8', () => {
    expect(Array.from(encodeText('中A', 'utf-8'))).toEqual([0xe4, 0xb8, 0xad, 0x41])
    expect(decodeBytes(bytes(0xe4, 0xb8, 0xad), 'utf-8')).toBe('中')
  })

  it('handles GBK both ways', () => {
    expect(Array.from(encodeText('你好A', 'gbk'))).toEqual([0xc4, 0xe3, 0xba, 0xc3, 0x41])
    expect(decodeBytes(bytes(0xc4, 0xe3, 0xba, 0xc3), 'gbk')).toBe('你好')
    expect(Array.from(encodeText('€', 'gbk'))).toEqual([0x80])
  })

  it('matches the browser GBK decoder for every CJK unified ideograph', () => {
    let text = ''
    for (let code = 0x4e00; code <= 0x9fa5; code++) text += String.fromCharCode(code)
    expect(decodeBytes(encodeText(text, 'gbk'), 'gbk')).toBe(text)
  })

  it('rejects characters GBK cannot encode', () => {
    expect(() => encodeText('😀', 'gbk')).toThrow('GBK')
  })

  it('does not throw on malformed input', () => {
    expect(decodeBytes(bytes(0xff), 'utf-8')).toBe('�')
  })
})

describe('buildPayload', () => {
  it('appends line endings to text', () => {
    const base = { format: 'text', encoding: 'utf-8', escapes: false } as const
    expect(Array.from(buildPayload('AT', { ...base, lineEnding: 'none' }))).toEqual([0x41, 0x54])
    expect(Array.from(buildPayload('AT', { ...base, lineEnding: 'crlf' }))).toEqual([0x41, 0x54, 0x0d, 0x0a])
    expect(Array.from(buildPayload('', { ...base, lineEnding: 'lf' }))).toEqual([0x0a])
    expect(Array.from(buildPayload('A', { ...base, lineEnding: 'cr' }))).toEqual([0x41, 0x0d])
  })

  it('parses escape sequences into raw bytes', () => {
    const options = { format: 'text', encoding: 'utf-8', escapes: true, lineEnding: 'none' } as const
    expect(Array.from(buildPayload('A\\r\\n\\t\\0\\xFF', options))).toEqual([0x41, 0x0d, 0x0a, 0x09, 0x00, 0xff])
    expect(Array.from(buildPayload('\\\\n', options))).toEqual([0x5c, 0x6e])
    expect(Array.from(buildPayload('\\q', options))).toEqual([0x5c, 0x71])
  })

  it('keeps backslashes literal without escapes', () => {
    const options = { format: 'text', encoding: 'utf-8', escapes: false, lineEnding: 'none' } as const
    expect(Array.from(buildPayload('\\n', options))).toEqual([0x5c, 0x6e])
  })

  it('parses hex and ignores line endings', () => {
    const options = { format: 'hex', encoding: 'utf-8', escapes: false, lineEnding: 'crlf' } as const
    expect(Array.from(buildPayload('AA 55 0x01', options))).toEqual([0xaa, 0x55, 0x01])
    expect(() => buildPayload('AA 5', options)).toThrow('偶数')
  })
})

describe('appendToLog', () => {
  it('merges RX chunks within the frame gap', () => {
    const log = appendToLog([], [rx('he', 0), rx('llo', 10), rx('!', 40)], OPTIONS)
    expect(texts(log)).toEqual(['hello', '!'])
    expect(log[0]).toMatchObject({ id: 1, direction: 'rx', time: 0, lastTime: 10 })
    expect(log[1].id).toBe(2)
  })

  it('never merges TX entries or across directions', () => {
    const log = appendToLog([], [tx('a', 0), tx('b', 1), rx('c', 2), rx('d', 3)], OPTIONS)
    expect(texts(log)).toEqual(['a', 'b', 'cd'])
  })

  it('splits after newlines in line mode', () => {
    const log = appendToLog([], [rx('one\r\ntw', 0), rx('o\nthree', 5)], { ...OPTIONS, splitOnNewline: true })
    expect(texts(log)).toEqual(['one\r\n', 'two\n', 'three'])
  })

  it('keeps a continuous stream when packet splitting is off', () => {
    const log = appendToLog([], [rx('ab', 0), rx('cd', 500), rx('ef', 5000)], { ...OPTIONS, frameGapMs: null })
    expect(texts(log)).toEqual(['abcdef'])
  })

  it('splits lines only by newline when packet splitting is off', () => {
    const log = appendToLog([], [rx('one', 0), rx('\ntwo', 900)], { ...OPTIONS, frameGapMs: null, splitOnNewline: true })
    expect(texts(log)).toEqual(['one\n', 'two'])
  })

  it('splits packets by the configured timeout', () => {
    const chunks = [rx('a', 0), rx('b', 50), rx('c', 160)]
    expect(texts(appendToLog([], chunks, { ...OPTIONS, frameGapMs: 100 }))).toEqual(['ab', 'c'])
    expect(texts(appendToLog([], chunks, { ...OPTIONS, frameGapMs: 20 }))).toEqual(['a', 'b', 'c'])
  })

  it('starts a new entry when the size limit is reached', () => {
    const log = appendToLog([], [rx('abcd', 0), rx('ef', 1)], { ...OPTIONS, maxEntryBytes: 5 })
    expect(texts(log)).toEqual(['abcd', 'ef'])
  })

  it('keeps only the newest entries and does not mutate input', () => {
    const first = appendToLog([], [tx('a', 0), tx('b', 1)], OPTIONS)
    const next = appendToLog(first, [tx('c', 2)], { ...OPTIONS, maxEntries: 2 })
    expect(texts(first)).toEqual(['a', 'b'])
    expect(texts(next)).toEqual(['b', 'c'])
    expect(next[1].id).toBe(3)
  })
})

describe('formatting', () => {
  it('formats local clock time with milliseconds', () => {
    expect(formatClock(new Date(2026, 0, 1, 9, 5, 3, 7).getTime())).toBe('09:05:03.007')
  })

  it('formats entries as hex or visible text', () => {
    expect(formatEntry(bytes(0x0a, 0xff), 'hex', 'utf-8')).toBe('0A FF')
    expect(formatEntry(ascii('ok\r\n'), 'text', 'utf-8')).toBe('ok')
    expect(formatEntry(ascii('a\u0000b\tc\rd\n'), 'text', 'utf-8')).toBe('a␀b\tc␍d')
    // 一包内的多行按原样换行显示
    expect(formatEntry(ascii('a\r\nb\nc\r\n'), 'text', 'utf-8')).toBe('a\nb\nc')
  })

  it('exports a readable log', () => {
    const time = new Date(2026, 0, 1, 12, 0, 0, 0).getTime()
    const log = appendToLog([], [tx('AT\r\n', time), rx('OK\r\n', time + 5)], OPTIONS)
    expect(formatLogForExport(log, 'text', 'utf-8')).toBe('[12:00:00.000] TX AT\n[12:00:00.005] RX OK')
  })

  it('normalizes the packet timeout', () => {
    expect(normalizePacketTimeout(20)).toBe(20)
    expect(normalizePacketTimeout(35.7)).toBe(35)
    expect(normalizePacketTimeout(0)).toBe(1)
    expect(normalizePacketTimeout(999999)).toBe(60000)
    expect(normalizePacketTimeout('')).toBe(20)
    expect(normalizePacketTimeout(Number.NaN)).toBe(20)
  })

  it('describes ports by USB vendor', () => {
    expect(describePort({ usbVendorId: 0x1a86, usbProductId: 0x7523 })).toBe('CH340 / CH343 (1A86:7523)')
    expect(describePort({ usbVendorId: 0x1234, usbProductId: 0x0001 })).toBe('USB 设备 (1234:0001)')
    expect(describePort({})).toBe('串口设备')
  })
})
