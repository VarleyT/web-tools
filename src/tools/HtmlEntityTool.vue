<script setup lang="ts">
import CodecTool from '@/components/CodecTool.vue'
import { useToolState } from '@/composables/useToolState'
import { htmlDecode, htmlEncode } from '@/lib/encoding'

const encodeNonAscii = useToolState('html-entity', 'encodeNonAscii', false)
const encode = (text: string): string => htmlEncode(text, encodeNonAscii.value)
</script>

<template>
  <CodecTool tool-id="html-entity" :encode="encode" :decode="htmlDecode" encode-label="转义" decode-label="反转义">
    <template #options="{ mode }">
      <label v-if="mode === 'encode'" class="checkbox-label">
        <input v-model="encodeNonAscii" type="checkbox" />
        非 ASCII 字符也转为 &amp;#x..;
      </label>
    </template>
  </CodecTool>
</template>
