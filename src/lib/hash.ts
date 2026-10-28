import CryptoJS from 'crypto-js'

export const HASH_ALGORITHMS = ['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'] as const
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number]
export type DigestFormat = 'hex' | 'HEX' | 'base64'

type Hasher = (message: string) => CryptoJS.lib.WordArray
type HmacHasher = (message: string, key: string) => CryptoJS.lib.WordArray

const HASHERS: Record<HashAlgorithm, Hasher> = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA224: CryptoJS.SHA224,
  SHA256: CryptoJS.SHA256,
  SHA384: CryptoJS.SHA384,
  SHA512: CryptoJS.SHA512,
  SHA3: CryptoJS.SHA3,
  RIPEMD160: CryptoJS.RIPEMD160,
}

const HMAC_HASHERS: Record<HashAlgorithm, HmacHasher> = {
  MD5: CryptoJS.HmacMD5,
  SHA1: CryptoJS.HmacSHA1,
  SHA224: CryptoJS.HmacSHA224,
  SHA256: CryptoJS.HmacSHA256,
  SHA384: CryptoJS.HmacSHA384,
  SHA512: CryptoJS.HmacSHA512,
  SHA3: CryptoJS.HmacSHA3,
  RIPEMD160: CryptoJS.HmacRIPEMD160,
}

export function formatDigest(digest: CryptoJS.lib.WordArray, format: DigestFormat): string {
  if (format === 'base64') return digest.toString(CryptoJS.enc.Base64)
  const hex = digest.toString(CryptoJS.enc.Hex)
  return format === 'HEX' ? hex.toUpperCase() : hex
}

/** 计算文本摘要；传入 hmacKey 时计算 HMAC */
export function digest(text: string, algorithm: HashAlgorithm, format: DigestFormat = 'hex', hmacKey?: string): string {
  const result = hmacKey === undefined ? HASHERS[algorithm](text) : HMAC_HASHERS[algorithm](text, hmacKey)
  return formatDigest(result, format)
}
