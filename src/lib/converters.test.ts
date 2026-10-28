import { describe, expect, it } from 'vitest'
import { hslToRgb, parseColor, rgbToHsl, toHex, toHslString, toRgbString } from './color'
import { convertBase, parseBigInt } from './radix'
import { CASE_CONVERTERS, convertLines, splitWords } from './textCase'

describe('radix', () => {
  it('converts between bases with big numbers', () => {
    expect(convertBase('255', 10, 16)).toBe('ff')
    expect(convertBase('0xFF', 16, 2)).toBe('11111111')
    expect(convertBase('1_0000_0000', 2, 10)).toBe('256')
    expect(convertBase('123456789012345678901234567890', 10, 16, true)).toBe(
      BigInt('123456789012345678901234567890').toString(16).toUpperCase(),
    )
    expect(convertBase('-ff', 16, 10)).toBe('-255')
  })

  it('rejects invalid digits and bases', () => {
    expect(() => parseBigInt('129', 8)).toThrow('"9"')
    expect(() => parseBigInt('', 10)).toThrow('输入为空')
    expect(() => convertBase('1', 10, 37)).toThrow('2 ~ 36')
  })
})

describe('color', () => {
  it('parses hex variants', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    expect(parseColor('336699')).toEqual({ r: 51, g: 102, b: 153, a: 1 })
    expect(parseColor('#00000080').a).toBeCloseTo(0.502, 3)
    expect(() => parseColor('#12')).toThrow()
  })

  it('parses rgb() and hsl() syntax', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 })
    expect(parseColor('rgba(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 })
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 })
    expect(() => parseColor('rgb(1, 2)')).toThrow()
    expect(() => parseColor('blue')).toThrow()
  })

  it('round-trips RGB and HSL', () => {
    const color = { r: 79, g: 70, b: 229, a: 1 }
    expect(hslToRgb(rgbToHsl(color))).toEqual(color)
    expect(rgbToHsl({ r: 128, g: 128, b: 128, a: 1 })).toEqual({ h: 0, s: 0, l: 50.2, a: 1 })
  })

  it('formats output strings', () => {
    expect(toHex({ r: 79, g: 70, b: 229, a: 1 })).toBe('#4f46e5')
    expect(toHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080')
    expect(toRgbString({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)')
    expect(toHslString({ r: 255, g: 0, b: 0, a: 1 })).toBe('hsl(0, 100%, 50%)')
  })
})

describe('text case', () => {
  const convert = (id: string, text: string) => CASE_CONVERTERS.find((c) => c.id === id)!.convert(text)

  it('splits identifiers in any style', () => {
    expect(splitWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
    expect(splitWords('user_id-list name')).toEqual(['user', 'id', 'list', 'name'])
  })

  it('converts to each case', () => {
    expect(convert('camel', 'hello_world api')).toBe('helloWorldApi')
    expect(convert('pascal', 'hello-world')).toBe('HelloWorld')
    expect(convert('snake', 'helloWorld')).toBe('hello_world')
    expect(convert('constant', 'helloWorld')).toBe('HELLO_WORLD')
    expect(convert('kebab', 'HelloWorld')).toBe('hello-world')
    expect(convert('dot', 'HelloWorld')).toBe('hello.world')
    expect(convert('title', 'hello_world')).toBe('Hello World')
    expect(convert('sentence', 'HELLO_WORLD')).toBe('Hello world')
  })

  it('converts line by line keeping blank lines', () => {
    const snake = CASE_CONVERTERS.find((c) => c.id === 'snake')!
    expect(convertLines('fooBar\n\nbazQux', snake)).toBe('foo_bar\n\nbaz_qux')
  })
})
