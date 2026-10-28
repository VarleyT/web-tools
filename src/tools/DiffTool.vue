<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { computed } from 'vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useToolState } from '@/composables/useToolState'
import { computeDiff, type DiffMode, type DiffType } from '@/lib/textDiff'

const DIFF_DEBOUNCE_MS = 250
const PART_CLASSES: Record<DiffType, string> = {
  added: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  removed: 'bg-red-100 text-red-900 line-through decoration-red-400/60 dark:bg-red-500/20 dark:text-red-200',
  same: '',
}

const original = useToolState('diff', 'original', '')
const modified = useToolState('diff', 'modified', '')
const mode = useToolState<DiffMode>('diff', 'mode', 'line')

const debouncedOriginal = refDebounced<string>(original, DIFF_DEBOUNCE_MS)
const debouncedModified = refDebounced<string>(modified, DIFF_DEBOUNCE_MS)

const result = computed(() => {
  const summary = computeDiff(debouncedOriginal.value, debouncedModified.value, mode.value)
  let offset = 0
  const parts = summary.parts.map((part) => {
    const keyed = { ...part, key: `${offset}-${part.type}` }
    offset += part.value.length
    return keyed
  })
  return { ...summary, parts }
})

const isIdentical = computed(() => result.value.parts.every((part) => part.type === 'same'))
const hasInput = computed(() => debouncedOriginal.value !== '' || debouncedModified.value !== '')
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="mode"
        aria-label="对比粒度"
        :options="[
          { label: '按行', value: 'line' },
          { label: '按单词', value: 'word' },
          { label: '按字符', value: 'char' },
        ]"
      />
      <span v-if="hasInput" class="font-mono text-sm">
        <span class="text-emerald-600 dark:text-emerald-400">+{{ result.added }}</span>
        /
        <span class="text-red-600 dark:text-red-400">-{{ result.removed }}</span>
      </span>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="original" label="原文本" :rows="12" />
      <TextPanel v-model="modified" label="新文本" :rows="12" />
    </div>
    <section v-if="hasInput" class="card">
      <p v-if="isIdentical" class="text-sm text-emerald-600 dark:text-emerald-400">两段文本完全相同</p>
      <pre v-else class="mono overflow-x-auto break-all whitespace-pre-wrap"><span
          v-for="part in result.parts"
          :key="part.key"
          :class="PART_CLASSES[part.type]"
        >{{ part.value }}</span></pre>
    </section>
  </div>
</template>
