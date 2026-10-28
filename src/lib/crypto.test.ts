import { createCipheriv, createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, type CipherOptions } from './cipher'
import { digest } from './hash'

describe('digest', () => {
  it('matches Node.js hashes', () => {
    for (const [algorithm, nodeName] of [
      ['MD5', 'md5'],
      ['SHA1', 'sha1'],
      ['SHA256', 'sha256'],
      ['SHA512', 'sha512'],
    ] as const) {
      expect(digest('你好 hash', algorithm)).toBe(createHash(nodeName).update('你好 hash').digest('hex'))
    }
  })

  it('supports HMAC and output formats', () => {
    const expected = createHmac('sha256', 'secret').update('msg').digest()
    expect(digest('msg', 'SHA256', 'base64', 'secret')).toBe(expected.toString('base64'))
    expect(digest('msg', 'SHA256', 'HEX', 'secret')).toBe(expected.toString('hex').toUpperCase())
  })
})

const aesCbc: CipherOptions = {
  algorithm: 'AES',
  mode: 'CBC',
  padding: 'Pkcs7',
  key: '0123456789abcdef',
  keyEncoding: 'utf8',
  iv: 'fedcba9876543210',
  ivEncoding: 'utf8',
}

describe('cipher', () => {
  it('matches Node.js AES-128-CBC output', () => {
    const node = createCipheriv('aes-128-cbc', aesCbc.key, aesCbc.iv)
    const expected = Buffer.concat([node.update('机密 data', 'utf8'), node.final()]).toString('base64')
    expect(encrypt('机密 data', aesCbc)).toBe(expected)
  })

  it('round-trips AES-256-ECB with hex key and hex output', () => {
    const options: CipherOptions = { ...aesCbc, mode: 'ECB', key: 'ab'.repeat(32), keyEncoding: 'hex' }
    const cipherText = encrypt('hello', options, 'hex')
    expect(cipherText).toMatch(/^[0-9a-f]+$/)
    expect(decrypt(cipherText, options, 'hex')).toBe('hello')
  })

  it('round-trips DES, TripleDES and RC4', () => {
    const des: CipherOptions = { ...aesCbc, algorithm: 'DES', key: '12345678', iv: '87654321' }
    const tripleDes: CipherOptions = { ...des, algorithm: 'TripleDES', key: '0123456789abcdef01234567' }
    const rc4: CipherOptions = { ...aesCbc, algorithm: 'RC4', key: 'any-length-key' }
    for (const options of [des, tripleDes, rc4]) {
      expect(decrypt(encrypt('测试', options), options)).toBe('测试')
    }
  })

  it('validates key and IV sizes', () => {
    expect(() => encrypt('x', { ...aesCbc, key: 'short' })).toThrow('密钥长度')
    expect(() => encrypt('x', { ...aesCbc, iv: 'short' })).toThrow('IV 长度')
    expect(() => encrypt('x', { ...aesCbc, key: 'zz', keyEncoding: 'hex' })).toThrow('Hex')
  })

  it('reports failure for wrong key', () => {
    const cipherText = encrypt('hello world', aesCbc)
    expect(() => decrypt(cipherText, { ...aesCbc, key: 'ffffffffffffffff' })).toThrow('解密失败')
  })

  it('detects wrong keys on single-block ciphertext via padding check', () => {
    // 单块密文用错误密钥解出的垃圾数据常常恰好是合法 UTF-8，必须靠填充校验识别
    const cipherText = encrypt('hi', aesCbc)
    let failures = 0
    for (let i = 0; i < 50; i++) {
      const wrongKey = i.toString(16).padStart(32, '0')
      try {
        decrypt(cipherText, { ...aesCbc, key: wrongKey, keyEncoding: 'hex' })
      } catch {
        failures++
      }
    }
    expect(failures).toBeGreaterThanOrEqual(45)
  })

  it('rejects ciphertext whose length is not a multiple of the block size', () => {
    expect(() => decrypt('00112233', { ...aesCbc }, 'hex')).toThrow('整数倍')
  })

  it('uses no padding in stream modes, matching Node.js AES-128-CTR', () => {
    const ctr: CipherOptions = { ...aesCbc, mode: 'CTR' }
    const node = createCipheriv('aes-128-ctr', ctr.key, ctr.iv)
    const expected = Buffer.concat([node.update('hello', 'utf8'), node.final()]).toString('hex')
    const cipherText = encrypt('hello', ctr, 'hex')
    expect(cipherText).toBe(expected)
    expect(cipherText).toHaveLength(10)
    expect(decrypt(cipherText, ctr, 'hex')).toBe('hello')
  })
})
