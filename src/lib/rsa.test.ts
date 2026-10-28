// @vitest-environment node
import { constants, createPrivateKey, createPublicKey, generateKeyPairSync, privateDecrypt, publicEncrypt } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generateRsaKeyPair, maxPlaintextBytes, publicKeyBits, rsaDecrypt, rsaEncrypt } from './rsa'

const MESSAGE = 'RSA 测试 message'

const { publicKey: spkiPem, privateKey: pkcs8Pem } = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
const pkcs1PublicPem = createPublicKey(spkiPem).export({ type: 'pkcs1', format: 'pem' }).toString()
const pkcs1PrivatePem = createPrivateKey(pkcs8Pem).export({ type: 'pkcs1', format: 'pem' }).toString()

describe('rsa OAEP', () => {
  it('encrypts with SHA-256 so Node.js can decrypt', async () => {
    const cipher = await rsaEncrypt(MESSAGE, spkiPem, 'OAEP-SHA256')
    const plain = privateDecrypt(
      { key: pkcs8Pem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(cipher, 'base64'),
    )
    expect(plain.toString()).toBe(MESSAGE)
  })

  it('decrypts SHA-1 ciphertext produced by Node.js (hex input)', async () => {
    const cipher = publicEncrypt(
      { key: spkiPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
      Buffer.from(MESSAGE),
    )
    expect(await rsaDecrypt(cipher.toString('hex'), pkcs8Pem, 'OAEP-SHA1', 'hex')).toBe(MESSAGE)
  })
})

describe('rsa PKCS#1 v1.5', () => {
  it('decrypts ciphertext produced by Node.js', async () => {
    const cipher = publicEncrypt({ key: spkiPem, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(MESSAGE))
    expect(await rsaDecrypt(cipher.toString('base64'), pkcs8Pem, 'PKCS1')).toBe(MESSAGE)
  })

  it('produces correctly padded ciphertext', async () => {
    const cipher = await rsaEncrypt(MESSAGE, spkiPem, 'PKCS1')
    // 用无填充模式解出原始编码块，检查 00 02 PS 00 M 结构
    const encoded = privateDecrypt({ key: pkcs8Pem, padding: constants.RSA_NO_PADDING }, Buffer.from(cipher, 'base64'))
    expect(encoded[0]).toBe(0x00)
    expect(encoded[1]).toBe(0x02)
    const separator = encoded.indexOf(0x00, 2)
    expect(separator).toBeGreaterThanOrEqual(10)
    expect(encoded.subarray(separator + 1).toString()).toBe(MESSAGE)
    expect(await rsaDecrypt(cipher, pkcs8Pem, 'PKCS1')).toBe(MESSAGE)
  })

  it('rejects ciphertext of the wrong length or wrong key', async () => {
    await expect(rsaDecrypt('AAAA', pkcs8Pem, 'PKCS1')).rejects.toThrow('密文长度')
    const other = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const cipher = await rsaEncrypt(MESSAGE, spkiPem, 'PKCS1')
    await expect(rsaDecrypt(cipher, other, 'PKCS1')).rejects.toThrow('解密失败')
  })
})

describe('rsa keys', () => {
  it('accepts PKCS#1 PEM and bare Base64 DER keys', async () => {
    const cipher = await rsaEncrypt(MESSAGE, pkcs1PublicPem, 'OAEP-SHA256')
    expect(await rsaDecrypt(cipher, pkcs1PrivatePem, 'OAEP-SHA256')).toBe(MESSAGE)
    const bareSpki = spkiPem.replace(/-----[A-Z ]+-----|\s/g, '')
    expect(await publicKeyBits(bareSpki)).toBe(1024)
  })

  it('generates key pairs usable by Node.js', async () => {
    const { publicPem, privatePem } = await generateRsaKeyPair(1024)
    expect(publicPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n/)
    expect(privatePem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/)
    expect(createPublicKey(publicPem).asymmetricKeyDetails?.modulusLength).toBe(1024)
    const cipher = await rsaEncrypt(MESSAGE, publicPem, 'PKCS1')
    expect(await rsaDecrypt(cipher, privatePem, 'PKCS1')).toBe(MESSAGE)
  })

  it('reports helpful errors', async () => {
    await expect(rsaEncrypt('x'.repeat(200), spkiPem, 'PKCS1')).rejects.toThrow('明文过长')
    await expect(rsaEncrypt(MESSAGE, pkcs8Pem, 'PKCS1')).rejects.toThrow('当前填入的是私钥')
    await expect(rsaDecrypt('AA==', spkiPem, 'PKCS1')).rejects.toThrow('当前填入的是公钥')
    await expect(rsaDecrypt('AA==', '-----BEGIN ENCRYPTED PRIVATE KEY-----\nAAAA\n-----END ENCRYPTED PRIVATE KEY-----', 'PKCS1')).rejects.toThrow('带密码')
    await expect(rsaEncrypt(MESSAGE, 'bm90IGEga2V5', 'PKCS1')).rejects.toThrow('公钥格式不正确')
  })

  it('computes plaintext limits', () => {
    expect(maxPlaintextBytes(2048, 'PKCS1')).toBe(245)
    expect(maxPlaintextBytes(2048, 'OAEP-SHA256')).toBe(190)
    expect(maxPlaintextBytes(2048, 'OAEP-SHA1')).toBe(214)
  })
})
