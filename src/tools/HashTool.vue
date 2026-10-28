<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { computed, ref } from 'vue'
import CopyRow from '@/components/CopyRow.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useToolState } from '@/composables/useToolState'
import { digest, HASH_ALGORITHMS, type DigestFormat, type HashAlgorithm } from '@/lib/hash'

const INPUT_DEBOUNCE_MS = 120
const LABELS: Partial<Record<HashAlgorithm, string>> = { SHA3: 'SHA3-512' }

const format = useToolState<DigestFormat>('hash', 'format', 'hex')
const useHmac = useToolState('hash', 'useHmac', false)
// 哈希输入常是密码，HMAC 密钥也是敏感信息，均不写入本地存储
const input = ref('')
const hmacKey = ref('')

const debouncedInput = refDebounced<string>(input, INPUT_DEBOUNCE_MS)

const results = computed(() =>
  HASH_ALGORITHMS.map((algorithm) => ({
    algorithm,
    label: LABELS[algorithm] ?? algorithm,
    value:
      debouncedInput.value === ''
        ? ''
        : digest(debouncedInput.value, algorithm, format.value, useHmac.value ? hmacKey.value : undefined),
  })),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="format"
        aria-label="输出格式"
        :options="[
          { label: 'hex', value: 'hex' },
          { label: 'HEX', value: 'HEX' },
          { label: 'Base64', value: 'base64' },
        ]"
      />
      <label class="checkbox-label">
        <input v-model="useHmac" type="checkbox" />
        HMAC
      </label>
      <input
        v-if="useHmac"
        v-model="hmacKey"
        class="input max-w-xs font-mono"
        placeholder="HMAC 密钥（不会保存）"
        aria-label="HMAC 密钥"
        autocomplete="off"
      />
    </div>
    <TextPanel v-model="input" label="输入文本（UTF-8，不会保存）" :rows="6" placeholder="输入要计算摘要的文本" />
    <section class="panel rows py-1.5">
      <CopyRow v-for="result in results" :key="result.algorithm" :label="result.label" :value="result.value" />
    </section>
  </div>
</template>
