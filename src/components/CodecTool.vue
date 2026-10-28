<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import ErrorAlert from './ErrorAlert.vue'
import AppIcon from './AppIcon.vue'
import OptionGroup from './OptionGroup.vue'
import TextPanel from './TextPanel.vue'

type CodecMode = 'encode' | 'decode'

const props = withDefaults(
  defineProps<{
    toolId: string
    encode: (text: string) => string
    decode: (text: string) => string
    encodeLabel?: string
    decodeLabel?: string
    placeholder?: string
    /** 是否把输入写入 localStorage；输入可能含凭据（如 Basic Auth、带 token 的 URL）时应关闭 */
    rememberInput?: boolean
  }>(),
  { encodeLabel: '编码', decodeLabel: '解码', placeholder: '在此输入内容，结果实时生成', rememberInput: true },
)

const mode = useToolState<CodecMode>(props.toolId, 'mode', 'encode')
const input: Ref<string> = props.rememberInput ? useToolState(props.toolId, 'input', '') : ref('')

const { value: output, error } = useSafeComputed(() => {
  if (input.value === '') return ''
  return mode.value === 'decode' ? props.decode(input.value) : props.encode(input.value)
}, '')

function applyOutputAsInput(): void {
  input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="mode"
        aria-label="模式"
        :options="[
          { label: encodeLabel, value: 'encode' },
          { label: decodeLabel, value: 'decode' },
        ]"
      />
      <slot name="options" :mode="mode" />
      <button type="button" class="btn ml-auto" :disabled="!output" @click="applyOutputAsInput"><AppIcon name="swap-vertical" :size="15" />
        结果作为输入
      </button>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" :label="rememberInput ? '输入' : '输入（不会保存）'" :placeholder="placeholder" />
      <TextPanel :model-value="output" label="输出" readonly :invalid="!!error" />
    </div>
    <ErrorAlert :message="error" />
    <slot />
  </div>
</template>
