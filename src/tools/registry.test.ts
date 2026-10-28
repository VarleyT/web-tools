import { describe, expect, it } from 'vitest'
import { CATEGORIES, findTool, searchTools, TOOLS, toolsOfCategory } from './registry'

describe('tool registry', () => {
  it('has unique ids and valid categories', () => {
    const ids = TOOLS.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
    const categoryIds = new Set(CATEGORIES.map((category) => category.id))
    expect(TOOLS.every((tool) => categoryIds.has(tool.category))).toBe(true)
    expect(CATEGORIES.every((category) => toolsOfCategory(category.id).length > 0)).toBe(true)
  })

  it('finds tools by id', () => {
    expect(findTool('json')?.name).toBe('JSON 工具')
    expect(findTool('missing')).toBeUndefined()
  })

  it('searches by name, keyword and multiple terms', () => {
    expect(searchTools('')).toHaveLength(TOOLS.length)
    expect(searchTools('sha256')[0].id).toBe('hash')
    expect(searchTools('时间戳')[0].id).toBe('timestamp')
    expect(searchTools('JSON')[0].id).toBe('json')
    expect(searchTools('json yaml').map((tool) => tool.id)).toEqual(['json-yaml'])
    expect(searchTools('rsa')[0].id).toBe('rsa')
    expect(searchTools('公钥')[0].id).toBe('rsa')
    expect(searchTools('ascii')[0].id).toBe('hex')
    expect(searchTools('not-a-tool-xyz')).toEqual([])
  })
})
