export interface TextStats {
  characters: number
  charactersNoSpaces: number
  cjk: number
  words: number
  lines: number
  paragraphs: number
  bytes: number
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
const LATIN_WORD = /[\p{L}\p{N}]+(['’-][\p{L}\p{N}]+)*/gu

/** 字数统计：中日韩字符每字计 1 词，其余按单词计 */
export function textStats(text: string): TextStats {
  const cjk = text.match(CJK)?.length ?? 0
  const latinWords = text.replace(CJK, ' ').match(LATIN_WORD)?.length ?? 0
  return {
    characters: [...text].length,
    charactersNoSpaces: [...text.replace(/\s/g, '')].length,
    cjk,
    words: cjk + latinWords,
    lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
    paragraphs: text.split(/(?:\r?\n\s*){2,}/).filter((part) => part.trim() !== '').length,
    bytes: new TextEncoder().encode(text).length,
  }
}
