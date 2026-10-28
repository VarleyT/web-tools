import { base64Decode } from './encoding'
import { isValidDate } from './timestamp'

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  issuedAt?: Date
  expiresAt?: Date
  notBefore?: Date
  isExpired?: boolean
}

function decodePart(part: string, label: string): Record<string, unknown> {
  let json: string
  try {
    json = base64Decode(part)
  } catch {
    throw new Error(`${label} 不是合法的 Base64URL`)
  }
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error(`${label} 不是合法的 JSON`)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须是 JSON 对象`)
  }
  return value as Record<string, unknown>
}

/** 把秒级时间声明转为 Date；超出 Date 可表示范围时视为缺失 */
function claimDate(value: unknown): Date | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const date = new Date(value * 1000)
  return isValidDate(date) ? date : undefined
}

export function decodeJwt(token: string, now: number = Date.now()): DecodedJwt {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.')
  if (parts.length !== 3) throw new Error('JWT 必须由 3 段组成（header.payload.signature）')
  const [headerPart, payloadPart, signature] = parts
  const header = decodePart(headerPart, 'Header')
  const payload = decodePart(payloadPart, 'Payload')
  const expiresAt = claimDate(payload.exp)
  return {
    header,
    payload,
    signature,
    issuedAt: claimDate(payload.iat),
    expiresAt,
    notBefore: claimDate(payload.nbf),
    isExpired: expiresAt ? expiresAt.getTime() <= now : undefined,
  }
}
