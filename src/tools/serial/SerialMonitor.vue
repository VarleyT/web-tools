<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { useToolState } from '@/composables/useToolState'
import {
  DEFAULT_PACKET_TIMEOUT_MS,
  formatClock,
  formatEntry,
  formatLogForExport,
  type DataFormat,
  type Direction,
  type LogEntry,
  type TextEncodingName,
} from '@/lib/serial'

const FORMAT_OPTIONS: ReadonlyArray<{ label: string; value: DataFormat }> = [
  { label: '文本', value: 'text' },
  { label: 'Hex', value: 'hex' },
]

interface LogRow {
  id: number
  direction: Direction
  clock: string
  text: string
}

const props = defineProps<{ log: readonly LogEntry[]; encoding: TextEncodingName }>()
const emit = defineEmits<{ clear: [] }>()
const format = defineModel<DataFormat>('format', { required: true })
const packetMode = defineModel<boolean>('packetMode', { required: true })
const packetTimeout = defineModel<number>('packetTimeout', { required: true })

const showTime = useToolState('serial', 'showTime', true)
const showTx = useToolState('serial', 'showTx', true)
const autoScroll = useToolState('serial', 'autoScroll', true)
const viewport = ref<HTMLElement>()

// 条目不可变（合并分片会产生新对象），按对象缓存格式化结果，新数据到达时只格式化新增条目
const textCache = new WeakMap<LogEntry, { key: string; text: string }>()

function entryText(entry: LogEntry, key: string): string {
  const cached = textCache.get(entry)
  if (cached?.key === key) return cached.text
  const text = formatEntry(entry.bytes, format.value, props.encoding)
  textCache.set(entry, { key, text })
  return text
}

const rows = computed<LogRow[]>(() => {
  const key = `${format.value}|${props.encoding}`
  return props.log
    .filter((entry) => showTx.value || entry.direction === 'rx')
    .map((entry) => ({ id: entry.id, direction: entry.direction, clock: formatClock(entry.time), text: entryText(entry, key) }))
})

watch(
  rows,
  () => {
    if (autoScroll.value && viewport.value) viewport.value.scrollTop = viewport.value.scrollHeight
  },
  { flush: 'post' },
)

function exportLog(): void {
  const content = formatLogForExport(props.log, format.value, props.encoding)
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `serial-${new Date().toISOString().replace(/[:.]/g, '-')}.log`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="panel flex min-w-0 flex-col gap-3" aria-labelledby="serial-monitor-heading">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 id="serial-monitor-heading">数据监视</h2>
      <OptionGroup v-model="format" aria-label="显示格式" :options="FORMAT_OPTIONS" />
      <label class="checkbox-label">
        <input v-model="showTime" type="checkbox" />
        时间戳
      </label>
      <div class="flex items-center gap-2" title="两段数据间隔超过超时时间即视为新的一包，每包单独一行；修改后对新收到的数据生效">
        <label class="checkbox-label">
          <input v-model="packetMode" type="checkbox" />
          分包显示
        </label>
        <label class="flex items-center gap-1.5 text-[13.5px] text-ink-body" :class="{ 'opacity-45': !packetMode }">
          超时
          <input
            v-model.number="packetTimeout"
            type="number"
            class="input mono h-[30px] w-[72px] px-2.5"
            min="1"
            max="60000"
            :placeholder="String(DEFAULT_PACKET_TIMEOUT_MS)"
            :disabled="!packetMode"
            aria-label="分包超时（毫秒）"
          />
          ms
        </label>
      </div>
      <label class="checkbox-label">
        <input v-model="showTx" type="checkbox" />
        显示发送
      </label>
      <label class="checkbox-label">
        <input v-model="autoScroll" type="checkbox" />
        自动滚动
      </label>
      <div class="ml-auto flex gap-1.5">
        <button type="button" class="btn btn-sm" :disabled="!log.length" @click="exportLog">导出</button>
        <button type="button" class="btn btn-sm" :disabled="!log.length" @click="emit('clear')">清空</button>
      </div>
    </div>

    <div
      ref="viewport"
      class="h-[clamp(260px,44vh,560px)] overflow-y-auto rounded-card bg-hover px-4 py-3 font-mono text-[12.5px] leading-[1.7] shadow-[inset_0_0_0_1px_var(--field-border)]"
      role="log"
      aria-label="收发数据"
      tabindex="0"
    >
      <div v-for="row in rows" :key="row.id" class="flex gap-2.5">
        <span v-if="showTime" class="shrink-0 text-ink-4 tabular-nums select-none">{{ row.clock }}</span>
        <span
          class="shrink-0 font-semibold select-none"
          :class="row.direction === 'rx' ? 'text-success' : 'text-accent-link'"
        >
          {{ row.direction === 'rx' ? 'RX' : 'TX' }}
        </span>
        <span class="min-w-0 flex-1 break-all whitespace-pre-wrap" :class="row.direction === 'rx' ? 'text-ink' : 'text-ink-2'">{{
          row.text
        }}</span>
      </div>
      <p v-if="rows.length === 0" class="flex h-full items-center justify-center font-sans text-[13px] text-ink-3">
        打开串口后，收发的数据会显示在这里
      </p>
    </div>
  </section>
</template>
