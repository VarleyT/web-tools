import { computed, type ComputedRef } from 'vue'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface SafeState<T> {
  value: T
  error: string
}

/** 包装可能抛错的计算：失败时返回 fallback，并把异常信息放进 error */
export function useSafeComputed<T>(compute: () => T, fallback: T): { value: ComputedRef<T>; error: ComputedRef<string> } {
  const state = computed<SafeState<T>>(() => {
    try {
      return { value: compute(), error: '' }
    } catch (error) {
      return { value: fallback, error: errorMessage(error) }
    }
  })
  return {
    value: computed(() => state.value.value),
    error: computed(() => state.value.error),
  }
}
