import { describe, expect, it } from 'vitest'
import { base64Encode } from './encoding'
import { decodeJwt } from './jwt'

const part = (value: unknown) => base64Encode(JSON.stringify(value), true)
const token = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: '42', name: '张三', iat: 1700000000, exp: 1700003600 })}.sig`

describe('decodeJwt', () => {
  it('decodes header, payload and time claims', () => {
    const decoded = decodeJwt(token, 1700000000 * 1000)
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(decoded.payload.name).toBe('张三')
    expect(decoded.signature).toBe('sig')
    expect(decoded.issuedAt?.getTime()).toBe(1700000000 * 1000)
    expect(decoded.isExpired).toBe(false)
  })

  it('accepts Bearer prefix and detects expiry', () => {
    expect(decodeJwt(`Bearer ${token}`, 1800000000 * 1000).isExpired).toBe(true)
  })

  it('leaves expiry undefined when exp is absent', () => {
    const noExp = `${part({ alg: 'none' })}.${part({ sub: '1' })}.`
    expect(decodeJwt(noExp).isExpired).toBeUndefined()
  })

  it('ignores time claims outside the representable Date range', () => {
    const huge = `${part({ alg: 'none' })}.${part({ exp: 1e13, iat: 1e13 })}.`
    const decoded = decodeJwt(huge)
    expect(decoded.expiresAt).toBeUndefined()
    expect(decoded.issuedAt).toBeUndefined()
    expect(decoded.isExpired).toBeUndefined()
  })

  it('rejects malformed tokens', () => {
    expect(() => decodeJwt('a.b')).toThrow('3 段')
    expect(() => decodeJwt('$$$.e30.x')).toThrow('Header')
    expect(() => decodeJwt(`${part({})}.${base64Encode('not json', true)}.x`)).toThrow('Payload 不是合法的 JSON')
    expect(() => decodeJwt(`${part({})}.${part([1])}.x`)).toThrow('JSON 对象')
  })
})
