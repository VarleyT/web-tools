import { base64ToBytes, bytesToBase64 } from './encoding'
import { bytesToHex, hexToBytes } from './hex'

/**
 * RSA 加解密，零第三方依赖：
 * - OAEP 与密钥生成直接使用 Web Crypto；
 * - PKCS#1 v1.5（Web Crypto 不支持）用 BigInt 实现填充与模幂运算，密钥参数经 Web Crypto 导出为 JWK 获取。
 */

export type RsaPadding = 'OAEP-SHA256' | 'OAEP-SHA1' | 'PKCS1'
export type RsaKeySize = 1024 | 2048 | 3072 | 4096
export type RsaCipherEncoding = 'base64' | 'hex'

export interface RsaKeyPair {
  publicPem: string
  privatePem: string
}

type HashName = 'SHA-256' | 'SHA-1'

const OAEP_HASH: Record<Exclude<RsaPadding, 'PKCS1'>, { name: HashName; bytes: number }> = {
  'OAEP-SHA256': { name: 'SHA-256', bytes: 32 },
  'OAEP-SHA1': { name: 'SHA-1', bytes: 20 },
}

/** PKCS#1 v1.5 填充至少 11 字节，其中随机非零填充不少于 8 字节 */
const PKCS1_OVERHEAD = 11
const PKCS1_MIN_PADDING = 8

// ── PEM / DER ────────────────────────────────────────────────────

const RSA_ALGORITHM_ID = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]

function concatBytes(...parts: ArrayLike<number>[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function derLength(length: number): number[] {
  if (length < 0x80) return [length]
  const bytes: number[] = []
  for (let rest = length; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256)
  return [0x80 | bytes.length, ...bytes]
}

function derNode(tag: number, content: ArrayLike<number>): Uint8Array<ArrayBuffer> {
  return concatBytes([tag, ...derLength(content.length)], content)
}

/** PKCS#1 RSAPublicKey → SubjectPublicKeyInfo */
function pkcs1PublicToSpki(der: Uint8Array): Uint8Array<ArrayBuffer> {
  return derNode(0x30, concatBytes(RSA_ALGORITHM_ID, derNode(0x03, concatBytes([0x00], der))))
}

/** PKCS#1 RSAPrivateKey → PKCS#8 PrivateKeyInfo */
function pkcs1PrivateToPkcs8(der: Uint8Array): Uint8Array<ArrayBuffer> {
  return derNode(0x30, concatBytes([0x02, 0x01, 0x00], RSA_ALGORITHM_ID, derNode(0x04, der)))
}

interface PemBlock {
  label: string
  der: Uint8Array<ArrayBuffer>
}

/** 解析 PEM；也接受不带头尾的纯 Base64 DER（Java 常见写法） */
function parsePem(text: string): PemBlock {
  const match = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(text)
  const body = match ? match[2] : text
  const bytes = base64ToBytes(body)
  if (bytes.length === 0) throw new Error('密钥为空')
  return { label: match ? match[1] : '', der: new Uint8Array(bytes) }
}

export function toPem(label: string, der: ArrayBuffer | Uint8Array): string {
  const lines = bytesToBase64(new Uint8Array(der)).match(/.{1,64}/g) ?? []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

// ── 密钥导入 ──────────────────────────────────────────────────────

const subtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) throw new Error('当前环境不支持 Web Crypto（需要 HTTPS 或 localhost）')
  return globalThis.crypto.subtle
}

async function importPublicKey(pem: string, hash: HashName): Promise<CryptoKey> {
  const { label, der } = parsePem(pem)
  if (label.includes('PRIVATE')) throw new Error('这里需要公钥，当前填入的是私钥')
  const spki = label === 'RSA PUBLIC KEY' ? pkcs1PublicToSpki(der) : der
  try {
    return await subtle().importKey('spki', spki, { name: 'RSA-OAEP', hash }, true, ['encrypt'])
  } catch {
    throw new Error('公钥格式不正确，支持 PEM（PUBLIC KEY / RSA PUBLIC KEY）或 Base64 DER')
  }
}

async function importPrivateKey(pem: string, hash: HashName): Promise<CryptoKey> {
  const { label, der } = parsePem(pem)
  if (label === 'ENCRYPTED PRIVATE KEY') throw new Error('不支持带密码的私钥，请先用 openssl 解除密码')
  if (label.includes('PUBLIC')) throw new Error('这里需要私钥，当前填入的是公钥')
  const pkcs8 = label === 'RSA PRIVATE KEY' ? pkcs1PrivateToPkcs8(der) : der
  try {
    return await subtle().importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash }, true, ['decrypt'])
  } catch {
    throw new Error('私钥格式不正确，支持 PEM（PRIVATE KEY / RSA PRIVATE KEY）或 Base64 DER')
  }
}

// ── BigInt 工具 ───────────────────────────────────────────────────

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.length === 0 ? 0n : BigInt('0x' + bytesToHex(bytes))
}

function bigIntToBytes(value: bigint, length: number): Uint8Array<ArrayBuffer> {
  return hexToBytes(value.toString(16).padStart(length * 2, '0'))
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  for (let e = exponent; e > 0n; e >>= 1n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
  }
  return result
}

const jwkInt = (value: string | undefined): bigint => bytesToBigInt(base64ToBytes(value ?? ''))

async function exportJwk(key: CryptoKey): Promise<JsonWebKey> {
  return subtle().exportKey('jwk', key)
}

// ── PKCS#1 v1.5 ──────────────────────────────────────────────────

function randomNonZeroBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  for (let i = 0; i < length; i++) {
    while (bytes[i] === 0) bytes[i] = crypto.getRandomValues(new Uint8Array(1))[0]
  }
  return bytes
}

async function pkcs1Encrypt(message: Uint8Array, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const jwk = await exportJwk(key)
  const modulus = base64ToBytes(jwk.n ?? '')
  const k = modulus.length
  const encoded = concatBytes([0x00, 0x02], randomNonZeroBytes(k - message.length - 3), [0x00], message)
  return bigIntToBytes(modPow(bytesToBigInt(encoded), jwkInt(jwk.e), bytesToBigInt(modulus)), k)
}

async function pkcs1Decrypt(cipher: Uint8Array, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const jwk = await exportJwk(key)
  const k = base64ToBytes(jwk.n ?? '').length
  if (cipher.length !== k) throw new Error(`密文长度应为 ${k} 字节，当前 ${cipher.length} 字节`)
  // 中国剩余定理：比直接用 d 做模幂快约 3 倍
  const [p, q, dp, dq, qi] = [jwk.p, jwk.q, jwk.dp, jwk.dq, jwk.qi].map(jwkInt)
  const c = bytesToBigInt(cipher)
  const m1 = modPow(c % p, dp, p)
  const m2 = modPow(c % q, dq, q)
  const h = (((qi * (m1 - m2)) % p) + p) % p
  const encoded = bigIntToBytes(m2 + h * q, k)
  const separator = encoded.indexOf(0x00, 2)
  if (encoded[0] !== 0x00 || encoded[1] !== 0x02 || separator < 2 + PKCS1_MIN_PADDING) {
    throw new Error('解密失败：填充校验不通过，请检查私钥与填充方式')
  }
  return encoded.slice(separator + 1)
}

// ── 公共接口 ──────────────────────────────────────────────────────

export function maxPlaintextBytes(keyBits: number, padding: RsaPadding): number {
  const k = Math.ceil(keyBits / 8)
  return padding === 'PKCS1' ? k - PKCS1_OVERHEAD : k - 2 * OAEP_HASH[padding].bytes - 2
}

const hashOf = (padding: RsaPadding): HashName => (padding === 'PKCS1' ? 'SHA-256' : OAEP_HASH[padding].name)

/** 读取公钥位数 */
export async function publicKeyBits(publicPem: string): Promise<number> {
  const key = await importPublicKey(publicPem, 'SHA-256')
  return (key.algorithm as RsaHashedKeyAlgorithm).modulusLength
}

export async function generateRsaKeyPair(bits: RsaKeySize): Promise<RsaKeyPair> {
  const pair = await subtle().generateKey(
    { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  )
  const [spki, pkcs8] = await Promise.all([subtle().exportKey('spki', pair.publicKey), subtle().exportKey('pkcs8', pair.privateKey)])
  return { publicPem: toPem('PUBLIC KEY', spki), privatePem: toPem('PRIVATE KEY', pkcs8) }
}

export async function rsaEncrypt(
  plaintext: string,
  publicPem: string,
  padding: RsaPadding,
  output: RsaCipherEncoding = 'base64',
): Promise<string> {
  const key = await importPublicKey(publicPem, hashOf(padding))
  const message = new TextEncoder().encode(plaintext)
  const limit = maxPlaintextBytes((key.algorithm as RsaHashedKeyAlgorithm).modulusLength, padding)
  if (message.length > limit) {
    throw new Error(`明文过长：当前密钥与填充方式最多 ${limit} 字节，当前 ${message.length} 字节`)
  }
  const cipher =
    padding === 'PKCS1'
      ? await pkcs1Encrypt(message, key)
      : new Uint8Array(await subtle().encrypt({ name: 'RSA-OAEP' }, key, message))
  return output === 'hex' ? bytesToHex(cipher) : bytesToBase64(cipher)
}

export async function rsaDecrypt(
  ciphertext: string,
  privatePem: string,
  padding: RsaPadding,
  input: RsaCipherEncoding = 'base64',
): Promise<string> {
  const key = await importPrivateKey(privatePem, hashOf(padding))
  const cipher = input === 'hex' ? hexToBytes(ciphertext) : new Uint8Array(base64ToBytes(ciphertext))
  let plain: Uint8Array
  if (padding === 'PKCS1') {
    plain = await pkcs1Decrypt(cipher, key)
  } else {
    try {
      plain = new Uint8Array(await subtle().decrypt({ name: 'RSA-OAEP' }, key, cipher))
    } catch {
      throw new Error('解密失败：私钥、填充方式或密文不匹配')
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(plain)
  } catch {
    throw new Error('解密结果不是合法的 UTF-8 文本')
  }
}
