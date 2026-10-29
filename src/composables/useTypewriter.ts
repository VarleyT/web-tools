import { computed, onScopeDispose, shallowRef, watch, type ComputedRef } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { nextTypewriterStep, type TypewriterState, type TypewriterTiming } from '@/lib/typewriter'

const DEFAULT_TIMING: TypewriterTiming = { type: 130, erase: 70, hold: 2200, pause: 600 }

/** 循环逐字输入、删除文本；系统开启“减弱动态效果”时直接显示完整文本 */
export function useTypewriter(text: string, timing: TypewriterTiming = DEFAULT_TIMING): ComputedRef<string> {
  const reducedMotion = usePreferredReducedMotion()
  const state = shallowRef<TypewriterState>({ length: 0, isDeleting: false })
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = (): void => clearTimeout(timer)
  const schedule = (delay: number): void => {
    timer = setTimeout(() => {
      const step = nextTypewriterStep(state.value, text.length, timing)
      state.value = step.state
      schedule(step.delay)
    }, delay)
  }

  watch(
    reducedMotion,
    (preference) => {
      stop()
      if (preference === 'reduce') state.value = { length: text.length, isDeleting: false }
      else schedule(timing.pause)
    },
    { immediate: true },
  )
  onScopeDispose(stop)

  return computed(() => text.slice(0, state.value.length))
}
