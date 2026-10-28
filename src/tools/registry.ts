import type { Component } from 'vue'

export type CategoryId = 'encode' | 'data' | 'dev' | 'generator'

export interface Category {
  id: CategoryId
  name: string
  description: string
}

export interface ToolMeta {
  id: string
  name: string
  description: string
  category: CategoryId
  /** 卡片图标上显示的短文本 */
  badge: string
  keywords: readonly string[]
  component: () => Promise<Component>
}

export const CATEGORIES: readonly Category[] = [
  { id: 'encode', name: '编解码 / 加密', description: 'Base64、URL、哈希、对称加密、JWT' },
  { id: 'data', name: '数据格式', description: 'JSON、YAML、SQL 格式化与互转' },
  { id: 'dev', name: '开发辅助', description: '时间戳、进制、UUID、正则、对比、颜色' },
  { id: 'generator', name: '生成器 / 文本', description: '密码、二维码、字数统计、命名转换' },
]

export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'base64',
    name: 'Base64 编解码',
    description: 'UTF-8 文本与 Base64 互转，支持 URL-safe 与文件转 Data URL',
    category: 'encode',
    badge: 'B64',
    keywords: ['base64', 'encode', 'decode', 'dataurl', '编码', '解码', '图片'],
    component: () => import('./Base64Tool.vue'),
  },
  {
    id: 'url',
    name: 'URL 编解码',
    description: 'encodeURIComponent / encodeURI / 全字符编码，并解析查询参数',
    category: 'encode',
    badge: '%',
    keywords: ['url', 'uri', 'encode', 'decode', 'query', 'percent', '编码', '参数'],
    component: () => import('./UrlTool.vue'),
  },
  {
    id: 'html-entity',
    name: 'HTML 实体',
    description: 'HTML 特殊字符与实体（&lt; &#x4E2D;）互转',
    category: 'encode',
    badge: '&;',
    keywords: ['html', 'entity', 'escape', 'unescape', '转义', '实体'],
    component: () => import('./HtmlEntityTool.vue'),
  },
  {
    id: 'unicode',
    name: 'Unicode 转义',
    description: '文本与 \\uXXXX 转义序列互转',
    category: 'encode',
    badge: '\\u',
    keywords: ['unicode', 'escape', 'utf16', '转义', '中文'],
    component: () => import('./UnicodeTool.vue'),
  },
  {
    id: 'hash',
    name: '哈希 / HMAC',
    description: 'MD5、SHA1、SHA2、SHA3、RIPEMD160 摘要与 HMAC',
    category: 'encode',
    badge: '#',
    keywords: ['hash', 'md5', 'sha', 'sha1', 'sha256', 'sha512', 'sha3', 'hmac', '摘要', '散列'],
    component: () => import('./HashTool.vue'),
  },
  {
    id: 'cipher',
    name: '对称加解密',
    description: 'AES / DES / 3DES / RC4，支持多种模式、填充与密钥编码',
    category: 'encode',
    badge: 'AES',
    keywords: ['aes', 'des', '3des', 'tripledes', 'rc4', 'encrypt', 'decrypt', 'cbc', 'ecb', '加密', '解密'],
    component: () => import('./CipherTool.vue'),
  },
  {
    id: 'jwt',
    name: 'JWT 解析',
    description: '解码 JWT 的 Header / Payload，查看签发与过期时间',
    category: 'encode',
    badge: 'JWT',
    keywords: ['jwt', 'token', 'jws', 'bearer', '令牌'],
    component: () => import('./JwtTool.vue'),
  },
  {
    id: 'json',
    name: 'JSON 工具',
    description: '格式化、压缩、校验、键排序、转义与去转义',
    category: 'data',
    badge: '{ }',
    keywords: ['json', 'format', 'minify', 'validate', 'beautify', '格式化', '压缩', '校验'],
    component: () => import('./JsonTool.vue'),
  },
  {
    id: 'json-yaml',
    name: 'JSON ⇄ YAML',
    description: 'JSON 与 YAML 双向转换',
    category: 'data',
    badge: 'YML',
    keywords: ['json', 'yaml', 'yml', 'convert', '转换'],
    component: () => import('./JsonYamlTool.vue'),
  },
  {
    id: 'sql',
    name: 'SQL 格式化',
    description: '支持 MySQL、PostgreSQL、SQLite、T-SQL 等多种方言',
    category: 'data',
    badge: 'SQL',
    keywords: ['sql', 'format', 'mysql', 'postgresql', 'sqlite', '格式化'],
    component: () => import('./SqlTool.vue'),
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: '秒 / 毫秒 / 微秒 / 纳秒时间戳与日期互转',
    category: 'dev',
    badge: 'TS',
    keywords: ['timestamp', 'unix', 'date', 'time', '时间戳', '日期', '时间'],
    component: () => import('./TimestampTool.vue'),
  },
  {
    id: 'radix',
    name: '进制转换',
    description: '2 ~ 36 任意进制互转，支持大整数',
    category: 'dev',
    badge: '0x',
    keywords: ['radix', 'base', 'hex', 'binary', 'octal', '进制', '十六进制', '二进制'],
    component: () => import('./RadixTool.vue'),
  },
  {
    id: 'uuid',
    name: 'UUID 生成',
    description: '批量生成 UUID v4 / v7',
    category: 'dev',
    badge: 'ID',
    keywords: ['uuid', 'guid', 'v4', 'v7', '生成'],
    component: () => import('./UuidTool.vue'),
  },
  {
    id: 'regex',
    name: '正则测试',
    description: '实时高亮匹配、分组查看与替换，内置常用正则',
    category: 'dev',
    badge: '.*',
    keywords: ['regex', 'regexp', 'match', 'replace', '正则', '匹配', '替换'],
    component: () => import('./RegexTool.vue'),
  },
  {
    id: 'diff',
    name: '文本对比',
    description: '按行 / 单词 / 字符对比两段文本差异',
    category: 'dev',
    badge: '±',
    keywords: ['diff', 'compare', '对比', '比较', '差异'],
    component: () => import('./DiffTool.vue'),
  },
  {
    id: 'color',
    name: '颜色转换',
    description: 'HEX、RGB、HSL 互转与取色',
    category: 'dev',
    badge: 'RGB',
    keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '取色'],
    component: () => import('./ColorTool.vue'),
  },
  {
    id: 'password',
    name: '密码生成',
    description: '基于安全随机数批量生成强密码，并估算强度',
    category: 'generator',
    badge: '***',
    keywords: ['password', 'random', 'generator', '密码', '随机'],
    component: () => import('./PasswordTool.vue'),
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    description: '文本 / 链接生成二维码，可调容错、尺寸与颜色',
    category: 'generator',
    badge: 'QR',
    keywords: ['qrcode', 'qr', '二维码'],
    component: () => import('./QrcodeTool.vue'),
  },
  {
    id: 'text-stats',
    name: '字数统计',
    description: '统计字符、中文字、单词、行数与字节数',
    category: 'generator',
    badge: 'Aa',
    keywords: ['count', 'word', 'stats', 'length', '字数', '统计', '字符'],
    component: () => import('./TextStatsTool.vue'),
  },
  {
    id: 'text-case',
    name: '命名转换',
    description: 'camelCase、snake_case、kebab-case 等命名风格互转',
    category: 'generator',
    badge: 'aB',
    keywords: ['case', 'camel', 'snake', 'kebab', 'pascal', 'upper', 'lower', '大小写', '驼峰', '命名'],
    component: () => import('./TextCaseTool.vue'),
  },
]

const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.id, tool]))

export function findTool(id: string): ToolMeta | undefined {
  return TOOL_MAP.get(id)
}

export function toolsOfCategory(category: CategoryId): ToolMeta[] {
  return TOOLS.filter((tool) => tool.category === category)
}

/** 按名称、id、关键词、描述模糊搜索；名称与 id 命中排在前面 */
export function searchTools(query: string): ToolMeta[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...TOOLS]

  const score = (tool: ToolMeta): number => {
    const primary = `${tool.name} ${tool.id}`.toLowerCase()
    const secondary = `${tool.keywords.join(' ')} ${tool.description}`.toLowerCase()
    let total = 0
    for (const term of terms) {
      if (primary.includes(term)) total += 2
      else if (secondary.includes(term)) total += 1
      else return 0
    }
    return total
  }

  return TOOLS.map((tool) => ({ tool, score: score(tool) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.tool)
}
