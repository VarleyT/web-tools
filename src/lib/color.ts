export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface Hsla {
  h: number
  s: number
  l: number
  a: number
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 0): number => Math.round(value * 10 ** digits) / 10 ** digits

function parseHex(hex: string): Rgba {
  const body = hex.slice(1)
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(body)) throw new Error('非法的十六进制颜色')
  const full = body.length <= 4 ? [...body].map((char) => char + char).join('') : body
  const channel = (index: number) => parseInt(full.slice(index * 2, index * 2 + 2), 16)
  return { r: channel(0), g: channel(1), b: channel(2), a: full.length === 8 ? round(channel(3) / 255, 3) : 1 }
}

function parseAlpha(value: string | undefined): number {
  if (value === undefined) return 1
  return clamp(value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value), 0, 1)
}

function parseFunctional(input: string): Rgba {
  const match = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i.exec(input)
  if (!match) throw new Error('无法识别的颜色格式，支持 #hex、rgb()、hsl()')
  const parts = match[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3 || parts.length > 4) throw new Error('颜色参数个数不正确')
  if (parts.some((part) => !/^-?\d*\.?\d+(%|deg)?$/.test(part))) throw new Error('颜色参数包含非法值')
  const alpha = parseAlpha(parts[3])

  if (match[1].toLowerCase().startsWith('rgb')) {
    const toChannel = (part: string) =>
      Math.round(clamp(part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part), 0, 255))
    return { r: toChannel(parts[0]), g: toChannel(parts[1]), b: toChannel(parts[2]), a: alpha }
  }
  return hslToRgb({ h: parseFloat(parts[0]), s: parseFloat(parts[1]), l: parseFloat(parts[2]), a: alpha })
}

export function parseColor(input: string): Rgba {
  const trimmed = input.trim()
  if (trimmed.startsWith('#')) return parseHex(trimmed)
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return parseHex('#' + trimmed)
  return parseFunctional(trimmed)
}

export function rgbToHsl({ r, g, b, a }: Rgba): Hsla {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: round(l * 100, 1), a }

  const s = delta / (1 - Math.abs(2 * l - 1))
  const sector = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4
  return { h: round((sector * 60 + 360) % 360, 1), s: round(s * 100, 1), l: round(l * 100, 1), a }
}

export function hslToRgb({ h, s, l, a }: Hsla): Rgba {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const hue = ((h % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * ln - 1)) * sn
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = ln - chroma / 2
  const sectors: ReadonlyArray<readonly [number, number, number]> = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ]
  const [r1, g1, b1] = sectors[Math.floor(hue / 60)]
  const toChannel = (value: number) => Math.round((value + m) * 255)
  return { r: toChannel(r1), g: toChannel(g1), b: toChannel(b1), a }
}

export function toHex({ r, g, b, a }: Rgba): string {
  const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a * 255) : ''}`
}

export function toRgbString({ r, g, b, a }: Rgba): string {
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
}

export function toHslString(color: Rgba): string {
  const { h, s, l, a } = rgbToHsl(color)
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`
}
