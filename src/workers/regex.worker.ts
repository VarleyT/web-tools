import { findMatches, replaceMatches, type RegexMatch } from '@/lib/regex'

export interface RegexRequest {
  id: number
  pattern: string
  flags: string
  text: string
  replacement: string
}

export interface RegexResponse {
  id: number
  matches: RegexMatch[]
  replaced: string
  error: string
}

// 在独立线程执行正则，灾难性回溯时主线程可直接 terminate 本 Worker
self.onmessage = (event: MessageEvent<RegexRequest>) => {
  const { id, pattern, flags, text, replacement } = event.data
  let response: RegexResponse
  try {
    response = {
      id,
      matches: findMatches(pattern, flags, text),
      replaced: replaceMatches(pattern, flags, text, replacement),
      error: '',
    }
  } catch (error) {
    response = { id, matches: [], replaced: '', error: error instanceof Error ? error.message : String(error) }
  }
  self.postMessage(response)
}
