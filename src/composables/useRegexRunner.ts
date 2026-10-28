import { watchDebounced } from '@vueuse/core'
import { onScopeDispose, ref, shallowRef } from 'vue'
import type { RegexMatch } from '@/lib/regex'
import type { RegexRequest, RegexResponse } from '@/workers/regex.worker'

export const REGEX_TIMEOUT_MS = 1500
const INPUT_DEBOUNCE_MS = 200

export interface RegexInput {
  pattern: string
  flags: string
  text: string
  replacement: string
}

/**
 * 在 Web Worker 中执行正则匹配与替换。
 * 超时即终止 Worker，避免 (a+)+$ 这类灾难性回溯冻结页面（输入会被持久化，刷新后同样安全）。
 */
export function useRegexRunner(source: () => RegexInput) {
  const matches = shallowRef<RegexMatch[]>([])
  const replaced = ref('')
  /** 与 matches 对应的原文；输入变化后到结果返回前，高亮仍基于这份文本 */
  const matchedText = ref('')
  const error = ref('')

  let worker: Worker | null = null
  let latestId = 0
  let latestText = ''
  let isBusy = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  function stopWorker(): void {
    worker?.terminate()
    worker = null
    isBusy = false
  }

  function applyResult(result: Omit<RegexResponse, 'id'>, text: string): void {
    matches.value = result.matches
    replaced.value = result.replaced
    error.value = result.error
    matchedText.value = text
  }

  function createWorker(): Worker {
    const instance = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), { type: 'module' })
    instance.onmessage = (event: MessageEvent<RegexResponse>) => {
      if (event.data.id !== latestId) return
      clearTimeout(timeoutId)
      isBusy = false
      applyResult(event.data, latestText)
    }
    instance.onerror = () => {
      clearTimeout(timeoutId)
      stopWorker()
      applyResult({ matches: [], replaced: '', error: '正则执行线程异常，请重试' }, latestText)
    }
    return instance
  }

  function run(input: RegexInput): void {
    clearTimeout(timeoutId)
    // 上一个请求仍未返回（可能正卡在回溯中），直接丢弃该 Worker
    if (isBusy) stopWorker()
    const id = ++latestId
    latestText = input.text
    if (input.pattern === '') {
      applyResult({ matches: [], replaced: input.text, error: '' }, input.text)
      return
    }

    worker ??= createWorker()
    isBusy = true
    const request: RegexRequest = { id, ...input }
    worker.postMessage(request)
    timeoutId = setTimeout(() => {
      if (id !== latestId) return
      stopWorker()
      applyResult(
        { matches: [], replaced: '', error: `执行超过 ${REGEX_TIMEOUT_MS / 1000} 秒已中止，表达式可能存在灾难性回溯` },
        input.text,
      )
    }, REGEX_TIMEOUT_MS)
  }

  watchDebounced(source, run, { debounce: INPUT_DEBOUNCE_MS, immediate: true })

  onScopeDispose(() => {
    clearTimeout(timeoutId)
    stopWorker()
  })

  return { matches, replaced, matchedText, error }
}
