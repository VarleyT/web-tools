export type UuidVersion = 'v4' | 'v7'

export interface UuidFormat {
  uppercase: boolean
  hyphens: boolean
  braces: boolean
}

export const MAX_UUID_COUNT = 1000

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function randomBytesWithVersion(version: number): Uint8Array {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | (version << 4)
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

export function uuidV4(): string {
  return bytesToUuid(randomBytesWithVersion(4))
}

const V7_COUNTER_MAX = 0xfff
const V7_COUNTER_SEED_MASK = 0x7ff

let lastV7Timestamp = -1
let v7Counter = 0

/** 同一毫秒内递增计数；计数溢出或系统时钟回拨时沿用并推进上次的时间戳 */
function nextV7Timestamp(now: number): number {
  let timestamp = Math.max(now, lastV7Timestamp)
  if (timestamp === lastV7Timestamp) {
    v7Counter++
    if (v7Counter > V7_COUNTER_MAX) {
      timestamp++
      v7Counter = crypto.getRandomValues(new Uint16Array(1))[0] & V7_COUNTER_SEED_MASK
    }
  } else {
    // 起始值取低半区随机数，给同毫秒内的递增留出空间
    v7Counter = crypto.getRandomValues(new Uint16Array(1))[0] & V7_COUNTER_SEED_MASK
  }
  lastV7Timestamp = timestamp
  return timestamp
}

/** RFC 9562 UUIDv7：48 位毫秒时间戳 + 12 位单调计数（rand_a）+ 62 位随机数，同一毫秒内也保持有序 */
export function uuidV7(now: number = Date.now()): string {
  const timestamp = nextV7Timestamp(now)
  const bytes = randomBytesWithVersion(7)
  for (let i = 0; i < 6; i++) {
    bytes[i] = Math.floor(timestamp / 2 ** (8 * (5 - i))) % 256
  }
  bytes[6] = 0x70 | (v7Counter >> 8)
  bytes[7] = v7Counter & 0xff
  return bytesToUuid(bytes)
}

export function formatUuid(uuid: string, format: UuidFormat): string {
  const body = format.hyphens ? uuid : uuid.replace(/-/g, '')
  const cased = format.uppercase ? body.toUpperCase() : body
  return format.braces ? `{${cased}}` : cased
}

export function generateUuids(version: UuidVersion, count: number, format: UuidFormat): string[] {
  const safeCount = Math.min(MAX_UUID_COUNT, Math.max(1, Math.floor(count) || 1))
  const generate = version === 'v7' ? () => uuidV7() : uuidV4
  return Array.from({ length: safeCount }, () => formatUuid(generate(), format))
}
