/** 拆分标识符为单词：兼容 camelCase、PascalCase、snake_case、kebab-case、空格与缩写（XMLHttp） */
export function splitWords(text: string): string[] {
  return text
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
const lower = (word: string): string => word.toLowerCase()
const upper = (word: string): string => word.toUpperCase()

export interface CaseConverter {
  id: string
  label: string
  convert: (text: string) => string
}

const byWords =
  (join: (words: string[]) => string) =>
  (text: string): string =>
    join(splitWords(text))

export const CASE_CONVERTERS: readonly CaseConverter[] = [
  { id: 'camel', label: 'camelCase', convert: byWords((w) => w.map((x, i) => (i === 0 ? lower(x) : capitalize(x))).join('')) },
  { id: 'pascal', label: 'PascalCase', convert: byWords((w) => w.map(capitalize).join('')) },
  { id: 'snake', label: 'snake_case', convert: byWords((w) => w.map(lower).join('_')) },
  { id: 'constant', label: 'CONSTANT_CASE', convert: byWords((w) => w.map(upper).join('_')) },
  { id: 'kebab', label: 'kebab-case', convert: byWords((w) => w.map(lower).join('-')) },
  { id: 'dot', label: 'dot.case', convert: byWords((w) => w.map(lower).join('.')) },
  { id: 'title', label: 'Title Case', convert: byWords((w) => w.map(capitalize).join(' ')) },
  { id: 'sentence', label: 'Sentence case', convert: byWords((w) => capitalize(w.join(' '))) },
  { id: 'upper', label: 'UPPER CASE', convert: upper },
  { id: 'lower', label: 'lower case', convert: lower },
]

/** 逐行转换，保留空行 */
export function convertLines(text: string, converter: CaseConverter): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.trim() === '' ? line : converter.convert(line)))
    .join('\n')
}
