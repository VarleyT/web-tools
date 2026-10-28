<script setup lang="ts">
import CodecTool from '@/components/CodecTool.vue'
import { useToolState } from '@/composables/useToolState'
import { unicodeEscape, unicodeUnescape } from '@/lib/encoding'

const escapeAll = useToolState('unicode', 'escapeAll', false)
const encode = (text: string): string => unicodeEscape(text, !escapeAll.value)
</script>

<template>
  <CodecTool tool-id="unicode" :encode="encode" :decode="unicodeUnescape" encode-label="转义" decode-label="还原">
    <template #options="{ mode }">
      <label v-if="mode === 'encode'" class="checkbox-label">
        <input v-model="escapeAll" type="checkbox" />
        ASCII 字符也转义
      </label>
      <span v-else class="text-xs text-slate-400">支持 \uXXXX 与 \u{XXXXX}</span>
    </template>
  </CodecTool>
</template>
