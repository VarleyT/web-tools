<script setup lang="ts">
import { computed } from 'vue'
import TextPanel from '@/components/TextPanel.vue'
import { useToolState } from '@/composables/useToolState'
import { textStats } from '@/lib/textStats'

const input = useToolState('text-stats', 'input', '')
const stats = computed(() => textStats(input.value))

const items = computed(() => [
  { label: '字符', value: stats.value.characters },
  { label: '字符（不含空白）', value: stats.value.charactersNoSpaces },
  { label: '字数 / 词数', value: stats.value.words },
  { label: '中日韩文字', value: stats.value.cjk },
  { label: '行数', value: stats.value.lines },
  { label: '段落', value: stats.value.paragraphs },
  { label: 'UTF-8 字节', value: stats.value.bytes },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      <div v-for="item in items" :key="item.label" class="card px-4 py-3">
        <dt class="label">{{ item.label }}</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold tabular-nums">{{ item.value.toLocaleString() }}</dd>
      </div>
    </dl>
    <TextPanel v-model="input" label="文本" :rows="18" placeholder="粘贴或输入文本，实时统计" />
  </div>
</template>
