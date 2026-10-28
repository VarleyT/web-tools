import { describe, expect, it } from 'vitest'
import {
  escapeJsonString,
  findLossyIntegers,
  findLossyYamlIntegers,
  formatJson,
  jsonToYaml,
  JsonParseError,
  minifyJson,
  parseJson,
  sortKeysDeep,
  unescapeJsonString,
  yamlToJson,
} from './json'

describe('json', () => {
  it('formats with indent and sorted keys', () => {
    expect(formatJson('{"b":1,"a":[1,2]}', 2)).toBe('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}')
    expect(formatJson('{"b":{"d":1,"c":2},"a":0}', 2, true)).toBe('{\n  "a": 0,\n  "b": {\n    "c": 2,\n    "d": 1\n  }\n}')
  })

  it('finds integers that lose precision, ignoring strings', () => {
    expect(findLossyIntegers('{"id":12345678901234567890,"n":-9007199254740993,"ok":9007199254740991}')).toEqual([
      '12345678901234567890',
      '-9007199254740993',
    ])
    expect(findLossyIntegers('{"s":"12345678901234567890","e":1e30,"f":1.5,"q":"a\\"99999999999999999"}')).toEqual([])
  })

  it('finds lossy integers in YAML', () => {
    expect(findLossyYamlIntegers('id: 12345678901234567890\nlist:\n  - 1\n  - -9007199254740993\nname: "99999999999999999999"')).toEqual([
      '12345678901234567890',
      '-9007199254740993',
    ])
    expect(findLossyYamlIntegers('a: [1, 2')).toEqual([])
  })

  it('minifies', () => {
    expect(minifyJson('{ "a" : [ 1 , 2 ] }')).toBe('{"a":[1,2]}')
  })

  it('reports line and column on parse error', () => {
    let caught: unknown
    try {
      parseJson('{\n  "a": 1,\n}')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(JsonParseError)
    expect((caught as JsonParseError).line).toBe(3)
    expect(() => parseJson('  ')).toThrow('输入为空')
  })

  it('sorts keys without mutating input', () => {
    const input = { b: 1, a: { d: 1, c: 2 } }
    const sorted = sortKeysDeep(input) as Record<string, unknown>
    expect(Object.keys(sorted)).toEqual(['a', 'b'])
    expect(Object.keys(input)).toEqual(['b', 'a'])
  })

  it('escapes and unescapes strings', () => {
    expect(escapeJsonString('a"b\n')).toBe('a\\"b\\n')
    expect(unescapeJsonString('a\\"b\\n')).toBe('a"b\n')
    expect(unescapeJsonString('"x\\ty"')).toBe('x\ty')
    expect(() => unescapeJsonString('bad\\x')).toThrow()
  })

  it('converts between JSON and YAML', () => {
    const yaml = jsonToYaml('{"name":"tool","tags":["a","b"]}')
    expect(yaml).toBe('name: tool\ntags:\n  - a\n  - b\n')
    expect(JSON.parse(yamlToJson(yaml))).toEqual({ name: 'tool', tags: ['a', 'b'] })
    expect(() => yamlToJson('a: [1, 2')).toThrow()
    expect(() => yamlToJson('')).toThrow('输入为空')
  })
})
