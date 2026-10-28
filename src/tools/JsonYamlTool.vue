<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { computed } from 'vue'
import LossyIntegerWarning from '@/components/LossyIntegerWarning.vue'
import { findLossyIntegers, findLossyYamlIntegers, jsonToYaml, yamlToJson } from '@/lib/json'

type Direction = 'json2yaml' | 'yaml2json'

const direction = useToolState<Direction>('json-yaml', 'direction', 'json2yaml')
const indent = useToolState<2 | 4>('json-yaml', 'indent', 2)
const input = useToolState('json-yaml', 'input', '')

const { value: output, error } = useSafeComputed(() => {
  if (input.value.trim() === '') return ''
  return direction.value === 'json2yaml' ? jsonToYaml(input.value, indent.value) : yamlToJson(input.value, indent.value)
}, '')

// 两个方向都会把整数转成 JS number，超出安全范围时提示
const lossyIntegers = computed(() => {
  if (!output.value) return []
  return direction.value === 'json2yaml' ? findLossyIntegers(input.value) : findLossyYamlIntegers(input.value)
})

function swap(): void {
  input.value = output.value
  direction.value = direction.value === 'json2yaml' ? 'yaml2json' : 'json2yaml'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="direction"
        aria-label="转换方向"
        :options="[
          { label: 'JSON → YAML', value: 'json2yaml' },
          { label: 'YAML → JSON', value: 'yaml2json' },
        ]"
      />
      <OptionGroup
        v-model="indent"
        aria-label="缩进"
        :options="[
          { label: '2 空格', value: 2 },
          { label: '4 空格', value: 4 },
        ]"
      />
      <button type="button" class="btn ml-auto" :disabled="!output" @click="swap"><AppIcon name="swap-vertical" :size="15" />
        结果作为输入
      </button>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" :label="direction === 'json2yaml' ? 'JSON' : 'YAML'" :rows="20" :invalid="!!error" />
      <TextPanel :model-value="output" :label="direction === 'json2yaml' ? 'YAML' : 'JSON'" readonly :rows="20" />
    </div>
    <ErrorAlert :message="error" />
    <LossyIntegerWarning :values="lossyIntegers" />
  </div>
</template>
