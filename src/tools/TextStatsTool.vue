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
    <!-- 统一面板：指标放在同一面板内，用发丝线网格分隔（做法同 ToolList） -->
    <div class="overflow-hidden rounded-panel bg-surface shadow-panel">
      <dl class="-mt-px -ml-px grid w-[calc(100%+1px)] grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        <div v-for="item in items" :key="item.label" class="px-[clamp(16px,2.4vw,20px)] py-4 shadow-[inset_1px_1px_0_var(--hairline)]">
          <dt class="text-[12.5px] text-ink-3">{{ item.label }}</dt>
          <dd class="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
            {{ item.value.toLocaleString() }}
          </dd>
        </div>
      </dl>
    </div>
    <TextPanel v-model="input" label="文本" :rows="18" placeholder="粘贴或输入文本，实时统计" />
  </div>
</template>
