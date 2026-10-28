import CryptoJS from 'crypto-js'

export type CipherAlgorithm = 'AES' | 'DES' | 'TripleDES' | 'RC4'
export type CipherMode = 'CBC' | 'ECB' | 'CFB' | 'OFB' | 'CTR'
export type CipherPadding = 'Pkcs7' | 'ZeroPadding' | 'NoPadding' | 'Iso10126' | 'Iso97971' | 'AnsiX923'
export type TextEncoding = 'utf8' | 'hex' | 'base64'
export type CipherTextEncoding = 'base64' | 'hex'

export interface CipherOptions {
  algorithm: CipherAlgorithm
  mode: CipherMode
  padding: CipherPadding
  key: string
  keyEncoding: TextEncoding
  iv: string
  ivEncoding: TextEncoding
}

const KEY_SIZES: Record<CipherAlgorithm, readonly number[]> = {
  AES: [16, 24, 32],
  DES: [8],
  TripleDES: [16, 24],
  RC4: [],
}

const BLOCK_SIZES: Record<CipherAlgorithm, number> = {
  AES: 16,
  DES: 8,
  TripleDES: 8,
  RC4: 0,
}

const ENCODERS: Record<TextEncoding, typeof CryptoJS.enc.Utf8> = {
  utf8: CryptoJS.enc.Utf8,
  hex: CryptoJS.enc.Hex,
  base64: CryptoJS.enc.Base64,
}

function parseBytes(value: string, encoding: TextEncoding, label: string): CryptoJS.lib.WordArray {
  if (encoding === 'hex' && !/^([0-9a-f]{2})*$/i.test(value)) {
    throw new Error(`${label} 不是合法的 Hex 字符串`)
  }
  if (encoding === 'base64' && !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error(`${label} 不是合法的 Base64 字符串`)
  }
  return ENCODERS[encoding].parse(value)
}

interface CipherConfig {
  mode?: typeof CryptoJS.mode.CBC
  padding?: typeof CryptoJS.pad.Pkcs7
  iv?: CryptoJS.lib.WordArray
}

/** 流式模式不需要填充；CryptoJS 默认仍会填充，导致与 OpenSSL / Java 等实现不兼容 */
const STREAM_MODES: ReadonlySet<CipherMode> = new Set(['CFB', 'OFB', 'CTR'])

export function isStreamMode(mode: CipherMode): boolean {
  return STREAM_MODES.has(mode)
}

interface ResolvedParams {
  key: CryptoJS.lib.WordArray
  config: CipherConfig
  /** 需要整块密文的模式（CBC / ECB）下的分组字节数，否则为 0 */
  blockSize: number
  checksPkcs7: boolean
}

function resolveParams(options: CipherOptions): ResolvedParams {
  const key = parseBytes(options.key, options.keyEncoding, '密钥')
  const keySizes = KEY_SIZES[options.algorithm]
  if (keySizes.length > 0 && !keySizes.includes(key.sigBytes)) {
    throw new Error(`${options.algorithm} 密钥长度须为 ${keySizes.join(' / ')} 字节，当前 ${key.sigBytes} 字节`)
  }
  if (options.algorithm === 'RC4') {
    if (key.sigBytes === 0) throw new Error('密钥不能为空')
    return { key, config: {}, blockSize: 0, checksPkcs7: false }
  }

  const isStream = isStreamMode(options.mode)
  const blockSize = BLOCK_SIZES[options.algorithm]
  const mode = CryptoJS.mode[options.mode]
  const padding = isStream ? CryptoJS.pad.NoPadding : CryptoJS.pad[options.padding]
  const resolved = {
    key,
    blockSize: isStream ? 0 : blockSize,
    checksPkcs7: !isStream && options.padding === 'Pkcs7',
  }
  if (options.mode === 'ECB') return { ...resolved, config: { mode, padding } }

  const iv = parseBytes(options.iv, options.ivEncoding, 'IV')
  if (iv.sigBytes !== blockSize) {
    throw new Error(`${options.algorithm} 的 IV 长度须为 ${blockSize} 字节，当前 ${iv.sigBytes} 字节`)
  }
  return { ...resolved, config: { mode, padding, iv } }
}

const PADDING_ERROR = '解密失败：填充校验不通过，请检查密钥、IV 与模式'

/** CryptoJS 的 Pkcs7 去填充不校验填充字节，这里手动校验以识别错误的密钥 */
function stripPkcs7(data: CryptoJS.lib.WordArray, blockSize: number): CryptoJS.lib.WordArray {
  const length = data.sigBytes
  const byteAt = (index: number): number => (data.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  const padLength = length > 0 ? byteAt(length - 1) : 0
  if (padLength < 1 || padLength > blockSize || padLength > length) throw new Error(PADDING_ERROR)
  for (let i = length - padLength; i < length; i++) {
    if (byteAt(i) !== padLength) throw new Error(PADDING_ERROR)
  }
  const result = data.clone()
  result.sigBytes = length - padLength
  return result
}

export function encrypt(plaintext: string, options: CipherOptions, output: CipherTextEncoding = 'base64'): string {
  const { key, config } = resolveParams(options)
  const encrypted = CryptoJS[options.algorithm].encrypt(CryptoJS.enc.Utf8.parse(plaintext), key, config)
  return encrypted.ciphertext.toString(output === 'hex' ? CryptoJS.enc.Hex : CryptoJS.enc.Base64)
}

export function decrypt(ciphertext: string, options: CipherOptions, input: CipherTextEncoding = 'base64'): string {
  const { key, config, blockSize, checksPkcs7 } = resolveParams(options)
  const source = parseBytes(ciphertext.replace(/\s+/g, ''), input, '密文')
  if (blockSize > 0 && source.sigBytes % blockSize !== 0) {
    throw new Error(`密文长度须为 ${blockSize} 字节的整数倍，当前 ${source.sigBytes} 字节`)
  }
  const params = CryptoJS.lib.CipherParams.create({ ciphertext: source })
  const decryptConfig = checksPkcs7 ? { ...config, padding: CryptoJS.pad.NoPadding } : config
  const raw = CryptoJS[options.algorithm].decrypt(params, key, decryptConfig)
  const decrypted = checksPkcs7 ? stripPkcs7(raw, blockSize) : raw
  if (decrypted.sigBytes < 0) throw new Error('解密失败：密钥、IV 或填充方式不正确')
  try {
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch {
    throw new Error('解密失败：结果不是合法的 UTF-8 文本，请检查密钥、IV 与模式')
  }
}
