<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { errorMessage } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import {
  buildCharset,
  estimateEntropy,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  strengthLevel,
  type PasswordOptions,
  type StrengthLevel,
} from '@/lib/password'

const MAX_COUNT = 50
const SLIDER_MAX = 128

const STRENGTH_META: Record<StrengthLevel, { label: string; bar: string; width: string }> = {
  weak: { label: '弱', bar: 'bg-danger', width: '25%' },
  fair: { label: '一般', bar: 'bg-warning', width: '50%' },
  strong: { label: '强', bar: 'bg-success', width: '75%' },
  'very-strong': { label: '非常强', bar: 'bg-success', width: '100%' },
}

const CHARSET_OPTIONS = [
  { key: 'lowercase', label: '小写 a-z' },
  { key: 'uppercase', label: '大写 A-Z' },
  { key: 'digits', label: '数字 0-9' },
  { key: 'symbols', label: '符号 !@#' },
  { key: 'excludeAmbiguous', label: '排除易混淆字符 0O1lI' },
] as const

const length = useToolState('password', 'length', 16)
const count = useToolState('password', 'count', 5)
const flags = {
  lowercase: useToolState('password', 'lowercase', true),
  uppercase: useToolState('password', 'uppercase', true),
  digits: useToolState('password', 'digits', true),
  symbols: useToolState('password', 'symbols', true),
  excludeAmbiguous: useToolState('password', 'excludeAmbiguous', false),
}

const options = computed<PasswordOptions>(() => ({
  length: length.value,
  lowercase: flags.lowercase.value,
  uppercase: flags.uppercase.value,
  digits: flags.digits.value,
  symbols: flags.symbols.value,
  excludeAmbiguous: flags.excludeAmbiguous.value,
}))

// 生成的密码只保存在内存中
const passwords = ref<Array<{ id: number; value: string }>>([])
const error = ref('')

function generate(): void {
  try {
    const total = Math.min(MAX_COUNT, Math.max(1, Math.floor(count.value) || 1))
    passwords.value = Array.from({ length: total }, (_, id) => ({ id, value: generatePassword(options.value) }))
    error.value = ''
  } catch (caught) {
    passwords.value = []
    error.value = errorMessage(caught)
  }
}

watch([options, count], generate, { immediate: true })

const entropy = computed(() => estimateEntropy(length.value, buildCharset(options.value).length))
const strength = computed(() => STRENGTH_META[strengthLevel(entropy.value)])
const allPasswords = computed(() => passwords.value.map((item) => item.value).join('\n'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="panel flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex flex-1 items-center gap-3 text-[14px] text-ink-body">
          长度
          <input
            v-model.number="length"
            type="range"
            :min="MIN_PASSWORD_LENGTH"
            :max="SLIDER_MAX"
            class="flex-1"
            aria-label="密码长度滑块"
          />
          <input
            v-model.number="length"
            type="number"
            :min="MIN_PASSWORD_LENGTH"
            :max="MAX_PASSWORD_LENGTH"
            class="input w-20"
            aria-label="密码长度"
          />
        </label>
        <label class="flex items-center gap-2 text-[14px] text-ink-body">
          数量
          <input v-model.number="count" type="number" min="1" :max="MAX_COUNT" class="input w-20" />
        </label>
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        <label v-for="item in CHARSET_OPTIONS" :key="item.key" class="checkbox-label">
          <input v-model="flags[item.key].value" type="checkbox" />
          {{ item.label }}
        </label>
      </div>
      <div class="flex items-center gap-3">
        <div class="h-1.5 flex-1 overflow-hidden rounded-pill bg-track">
          <div
            class="h-full rounded-pill transition-[width,background-color] duration-300 ease-out-quart"
            :class="strength.bar"
            :style="{ width: strength.width }"
          />
        </div>
        <span class="w-36 text-right text-[13.5px] text-ink-2">
          <span class="font-semibold text-ink">{{ strength.label }}</span> ·
          <span class="tabular-nums">{{ Math.round(entropy) }} bit</span>
        </span>
      </div>
      <ErrorAlert :message="error" />
    </section>

    <section class="panel">
      <div class="mb-1 flex items-center justify-between gap-3">
        <h2 class="font-semibold">生成结果（不会保存）</h2>
        <div class="flex gap-2">
          <CopyButton :text="allPasswords" label="复制全部" />
          <button type="button" class="btn btn-sm btn-primary" @click="generate">重新生成</button>
        </div>
      </div>
      <div class="rows">
        <div v-for="item in passwords" :key="item.id" class="flex min-h-12 items-center gap-3 py-2">
          <code class="mono min-w-0 flex-1 break-all text-ink select-all">{{ item.value }}</code>
          <CopyButton :text="item.value" />
        </div>
      </div>
    </section>
  </div>
</template>
