<script setup lang="ts">
import CopyRow from '@/components/CopyRow.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { convertBase } from '@/lib/radix'

const MIN_BASE = 2
const MAX_BASE = 36
const BASE_NAMES: Record<number, string> = { 2: '二进制', 8: '八进制', 10: '十进制', 16: '十六进制', 32: '32 进制', 36: '36 进制' }
const TARGET_BASES = [2, 8, 10, 16, 32, 36] as const
const ALL_BASES = Array.from({ length: MAX_BASE - MIN_BASE + 1 }, (_, i) => i + MIN_BASE)

const input = useToolState('radix', 'input', '')
const fromBase = useToolState('radix', 'fromBase', 10)
const customBase = useToolState('radix', 'customBase', 7)
const uppercase = useToolState('radix', 'uppercase', true)

const baseName = (base: number): string => BASE_NAMES[base] ?? `${base} 进制`

const { value: results, error } = useSafeComputed(() => {
  if (input.value.trim() === '') return []
  const bases: number[] = [...TARGET_BASES]
  const custom = Math.floor(customBase.value)
  if (custom >= MIN_BASE && custom <= MAX_BASE && !bases.includes(custom)) bases.push(custom)
  return bases.map((base) => ({ base, value: convertBase(input.value, fromBase.value, base, uppercase.value) }))
}, [])
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="panel flex flex-col gap-3">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex min-w-60 flex-1 flex-col gap-1.5">
          <span class="label">输入数值（支持 0x / 0b / 0o 前缀、下划线分隔、负数与大整数）</span>
          <input v-model="input" class="input font-mono" placeholder="255" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label">输入进制</span>
          <select v-model.number="fromBase" class="input w-36">
            <option v-for="base in ALL_BASES" :key="base" :value="base">{{ baseName(base) }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label">自定义输出进制</span>
          <input v-model.number="customBase" type="number" :min="MIN_BASE" :max="MAX_BASE" class="input w-28" />
        </label>
        <label class="checkbox-label pb-2">
          <input v-model="uppercase" type="checkbox" />
          字母大写
        </label>
      </div>
      <ErrorAlert :message="error" />
    </section>
    <section v-if="results.length" class="panel rows py-1.5">
      <CopyRow v-for="result in results" :key="result.base" :label="baseName(result.base)" :value="result.value" />
    </section>
  </div>
</template>
