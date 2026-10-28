<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { ref } from 'vue'
import CopyRow from '@/components/CopyRow.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { describeTime, formatDate, parseTimeInput, timestampToDate, type TimeDescription, type TimestampUnit } from '@/lib/timestamp'

type UnitOption = 'auto' | TimestampUnit

const NUMERIC = /^-?\d+(\.\d+)?$/
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const TICK_MS = 1000

const current = ref(Date.now())
const { isActive: isTicking, pause, resume } = useIntervalFn(() => {
  current.value = Date.now()
}, TICK_MS)

function togglePause(): void {
  if (isTicking.value) {
    pause()
    return
  }
  current.value = Date.now()
  resume()
}

const input = useToolState('timestamp', 'input', '')
const unit = useToolState<UnitOption>('timestamp', 'unit', 'auto')

const { value: description, error } = useSafeComputed<TimeDescription | null>(() => {
  const text = input.value.trim()
  if (!text) return null
  const date = unit.value !== 'auto' && NUMERIC.test(text) ? timestampToDate(text, unit.value) : parseTimeInput(text)
  return describeTime(date)
}, null)
</script>

<template>
  <div class="flex flex-col gap-6">
    <section class="panel">
      <div class="mb-1 flex items-center justify-between">
        <h2 class="font-semibold">当前时间</h2>
        <button type="button" class="btn btn-sm" @click="togglePause">{{ isTicking ? '暂停' : '继续' }}</button>
      </div>
      <div class="rows">
        <CopyRow label="秒" :value="String(Math.floor(current / 1000))" />
        <CopyRow label="毫秒" :value="String(current)" />
        <CopyRow label="本地时间" :value="formatDate(new Date(current))" />
      </div>
    </section>

    <section class="panel flex flex-col gap-3">
      <h2 class="font-semibold">时间戳 ⇄ 日期</h2>
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="input"
          class="input max-w-md font-mono"
          placeholder="1700000000 / 2024-01-01 12:00:00 / ISO 8601"
          aria-label="时间戳或日期"
        />
        <button type="button" class="btn" @click="input = String(Date.now())">填入当前</button>
        <OptionGroup
          v-model="unit"
          aria-label="时间戳单位"
          :options="[
            { label: '自动', value: 'auto' },
            { label: '秒', value: 's' },
            { label: '毫秒', value: 'ms' },
            { label: '微秒', value: 'us' },
            { label: '纳秒', value: 'ns' },
          ]"
        />
      </div>
      <p class="hint">不带时区的日期按本地时区（{{ TIME_ZONE }}）解析；纯数字按位数自动识别单位。</p>
      <ErrorAlert :message="error" />
      <div v-if="description" class="rows">
        <CopyRow label="秒级时间戳" :value="description.seconds" />
        <CopyRow label="毫秒时间戳" :value="description.milliseconds" />
        <CopyRow label="本地时间" :value="description.local" />
        <CopyRow label="ISO 8601" :value="description.iso" />
        <CopyRow label="UTC" :value="description.utc" />
        <CopyRow label="相对时间" :value="description.relative" />
      </div>
    </section>
  </div>
</template>
