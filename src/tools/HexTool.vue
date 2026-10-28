<script setup lang="ts">
import CodecTool from '@/components/CodecTool.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { useToolState } from '@/composables/useToolState'
import { hexToText, textToHex, type HexPrefix, type HexSeparator } from '@/lib/hex'

const SEPARATOR_OPTIONS: ReadonlyArray<{ label: string; value: HexSeparator }> = [
  { label: '空格', value: ' ' },
  { label: '无分隔', value: '' },
  { label: '冒号', value: ':' },
]
const PREFIX_OPTIONS: ReadonlyArray<{ label: string; value: HexPrefix }> = [
  { label: '无前缀', value: '' },
  { label: '0x', value: '0x' },
  { label: '\\x', value: '\\x' },
]

const separator = useToolState<HexSeparator>('hex', 'separator', ' ')
const prefix = useToolState<HexPrefix>('hex', 'prefix', '')
const uppercase = useToolState('hex', 'uppercase', true)

const encode = (text: string): string =>
  textToHex(text, { separator: separator.value, prefix: prefix.value, uppercase: uppercase.value })
</script>

<template>
  <!-- 十六进制内容常是密钥或协议报文，不写入本地存储 -->
  <CodecTool
    tool-id="hex"
    :encode="encode"
    :decode="hexToText"
    encode-label="文本 → Hex"
    decode-label="Hex → 文本"
    placeholder="输入 ASCII / UTF-8 文本，或十六进制如 48 65 6C 6C 6F"
    :remember-input="false"
  >
    <template #options="{ mode }">
      <template v-if="mode === 'encode'">
        <OptionGroup v-model="separator" aria-label="分隔符" :options="SEPARATOR_OPTIONS" />
        <OptionGroup v-model="prefix" aria-label="前缀" :options="PREFIX_OPTIONS" />
        <label class="checkbox-label">
          <input v-model="uppercase" type="checkbox" />
          大写
        </label>
      </template>
      <span v-else class="hint">自动识别空格、冒号、逗号、换行分隔，以及 0x、\x 前缀</span>
    </template>
  </CodecTool>
</template>
