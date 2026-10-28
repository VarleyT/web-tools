<script setup lang="ts">
import { computed } from 'vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import LossyIntegerWarning from '@/components/LossyIntegerWarning.vue'
import {
  escapeJsonString,
  findLossyIntegers,
  formatJson,
  minifyJson,
  unescapeJsonString,
  type JsonIndent,
} from '@/lib/json'

type JsonAction = 'format' | 'minify' | 'escape' | 'unescape'
type IndentOption = '2' | '4' | 'tab'

const SAMPLE = '{"name":"ByteGrep Tool","version":1,"tags":["json","dev"],"author":{"name":"you","site":null}}'

const input = useToolState('json', 'input', '')
const action = useToolState<JsonAction>('json', 'action', 'format')
const indent = useToolState<IndentOption>('json', 'indent', '2')
const sortKeys = useToolState('json', 'sortKeys', false)

const indentValue = computed<JsonIndent>(() => (indent.value === 'tab' ? '\t' : indent.value === '4' ? 4 : 2))

const { value: output, error } = useSafeComputed(() => {
  if (input.value.trim() === '') return ''
  switch (action.value) {
    case 'minify':
      return minifyJson(input.value)
    case 'escape':
      return escapeJsonString(input.value)
    case 'unescape':
      return unescapeJsonString(input.value)
    default:
      return formatJson(input.value, indentValue.value, sortKeys.value)
  }
}, '')

const isReformatting = computed(() => action.value === 'format' || action.value === 'minify')
const lossyIntegers = computed(() => (isReformatting.value && output.value ? findLossyIntegers(input.value) : []))

const isValidJson = computed(() => input.value.trim() !== '' && !error.value && (action.value === 'format' || action.value === 'minify'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="action"
        aria-label="操作"
        :options="[
          { label: '格式化', value: 'format' },
          { label: '压缩', value: 'minify' },
          { label: '转义', value: 'escape' },
          { label: '去转义', value: 'unescape' },
        ]"
      />
      <template v-if="action === 'format'">
        <OptionGroup
          v-model="indent"
          aria-label="缩进"
          :options="[
            { label: '2 空格', value: '2' },
            { label: '4 空格', value: '4' },
            { label: 'Tab', value: 'tab' },
          ]"
        />
        <label class="checkbox-label">
          <input v-model="sortKeys" type="checkbox" />
          键名排序
        </label>
      </template>
      <span v-if="isValidJson" class="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ 合法 JSON</span>
      <div class="ml-auto flex gap-2">
        <button type="button" class="btn" @click="input = SAMPLE">示例</button>
        <button type="button" class="btn" :disabled="!output" @click="input = output">结果写回输入</button>
      </div>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" label="输入" :rows="20" placeholder="粘贴 JSON 文本" :invalid="!!error" />
      <TextPanel :model-value="output" label="输出" readonly :rows="20" />
    </div>
    <ErrorAlert :message="error" />
    <LossyIntegerWarning :values="lossyIntegers" />
  </div>
</template>
