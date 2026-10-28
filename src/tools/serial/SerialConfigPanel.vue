<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { errorMessage } from '@/composables/useSafeComputed'
import type { PortStatus } from '@/composables/useSerialPort'
import { useToolState } from '@/composables/useToolState'
import {
  BAUD_RATES,
  isSupportedSetting,
  parseBaudRate,
  type SerialConfig,
  type SerialDataBits,
  type SerialFlowControl,
  type SerialParity,
  type SerialStopBits,
  type TextEncodingName,
} from '@/lib/serial'

interface SettingOption<T> {
  label: string
  value: T
  disabled?: boolean
  title?: string
}

const UNSUPPORTED_TITLE = '浏览器 Web Serial 规范不支持此设置，无法打开'
const CUSTOM_BAUD = 'custom'

/** 浏览器无法配置的取值保留在列表中但置灰，悬停可见原因 */
function settingOptions<K extends 'dataBits' | 'stopBits' | 'parity'>(
  field: K,
  items: ReadonlyArray<{ label: string; value: SerialConfig[K] }>,
): SettingOption<SerialConfig[K]>[] {
  return items.map((item) =>
    isSupportedSetting(field, item.value) ? item : { ...item, disabled: true, title: UNSUPPORTED_TITLE },
  )
}

const DATA_BITS_OPTIONS = settingOptions('dataBits', [
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
])
const STOP_BITS_OPTIONS = settingOptions('stopBits', [
  { label: '1', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 },
])
const PARITY_OPTIONS = settingOptions('parity', [
  { label: '无', value: 'none' },
  { label: '奇', value: 'odd' },
  { label: '偶', value: 'even' },
  { label: 'Mark', value: 'mark' },
  { label: 'Space', value: 'space' },
])
const FLOW_OPTIONS: ReadonlyArray<SettingOption<SerialFlowControl>> = [
  { label: '无', value: 'none' },
  { label: '硬件', value: 'hardware', title: 'RTS / CTS 硬件流控' },
  { label: '软件', value: 'software', title: 'XON / XOFF：收到 0x13 暂停发送，收到 0x11 恢复；这两个字节不会显示在接收区' },
]
const ENCODING_OPTIONS: ReadonlyArray<{ label: string; value: TextEncodingName }> = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
]
const STATUS_TEXT: Record<PortStatus, string> = { closed: '未连接', opening: '正在打开', open: '已连接', closing: '正在关闭' }

const props = defineProps<{
  status: PortStatus
  portLabel: string
  error: string
  rxBytes: number
  txBytes: number
  /** 软件流控收到 XOFF，发送已暂停 */
  flowPaused: boolean
}>()

const emit = defineEmits<{
  choose: []
  open: [config: SerialConfig]
  close: []
  signals: [signals: SerialOutputSignals]
  resetCounters: []
}>()

const encoding = defineModel<TextEncodingName>('encoding', { required: true })

const baudRate = useToolState('serial', 'baudRate', '115200')
const dataBits = useToolState<SerialDataBits>('serial', 'dataBits', 8)
const stopBits = useToolState<SerialStopBits>('serial', 'stopBits', 1)
const parity = useToolState<SerialParity>('serial', 'parity', 'none')
const flowControl = useToolState<SerialFlowControl>('serial', 'flowControl', 'none')

const configError = ref('')
const isCustomBaud = ref(!BAUD_RATES.some((rate) => String(rate) === baudRate.value.trim()))
const baudChoice = computed({
  get: () => (isCustomBaud.value ? CUSTOM_BAUD : baudRate.value.trim()),
  set: (value: string) => {
    isCustomBaud.value = value === CUSTOM_BAUD
    if (!isCustomBaud.value) baudRate.value = value
  },
})
// 打开串口时浏览器默认拉高 DTR / RTS
const dtr = ref(true)
const rts = ref(true)

const isClosed = computed(() => props.status === 'closed')
const isOpen = computed(() => props.status === 'open')

watch(isOpen, (open) => {
  if (!open) return
  dtr.value = true
  rts.value = true
})

function toggleConnection(): void {
  if (isOpen.value) {
    emit('close')
    return
  }
  configError.value = ''
  try {
    const config: SerialConfig = {
      baudRate: parseBaudRate(baudRate.value),
      dataBits: dataBits.value,
      stopBits: stopBits.value,
      parity: parity.value,
      flowControl: flowControl.value,
    }
    emit('open', config)
  } catch (caught) {
    configError.value = errorMessage(caught)
  }
}

function updateSignals(): void {
  emit('signals', { dataTerminalReady: dtr.value, requestToSend: rts.value })
}
</script>

<template>
  <section class="panel flex flex-col gap-4" aria-labelledby="serial-config-heading">
    <div class="flex items-center justify-between gap-2">
      <h2 id="serial-config-heading">串口设置</h2>
      <span class="chip" :class="{ 'chip-success': isOpen }" role="status">
        <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
        {{ STATUS_TEXT[status] }}
      </span>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="label px-1">端口</span>
      <div class="flex gap-2">
        <span
          class="input flex min-w-0 items-center truncate bg-hover text-[13px]"
          :class="portLabel ? 'text-ink-body' : 'text-ink-4'"
          :title="portLabel || undefined"
        >
          {{ portLabel || '未选择' }}
        </span>
        <button type="button" class="btn h-10 shrink-0" :disabled="!isClosed" @click="emit('choose')">选择</button>
      </div>
    </div>

    <fieldset :disabled="!isClosed" class="flex flex-col gap-3.5 transition-opacity duration-150 disabled:opacity-55">
      <legend class="sr-only">串口参数（打开后不可修改）</legend>
      <div class="flex flex-col gap-1.5">
        <label class="label px-1" for="serial-baud-rate">波特率</label>
        <select id="serial-baud-rate" v-model="baudChoice" class="input mono">
          <option v-for="rate in BAUD_RATES" :key="rate" :value="String(rate)">{{ rate }}</option>
          <option :value="CUSTOM_BAUD">自定义…</option>
        </select>
        <input
          v-if="isCustomBaud"
          v-model="baudRate"
          class="input mono"
          :class="{ 'field-invalid': configError }"
          inputmode="numeric"
          autocomplete="off"
          placeholder="输入波特率，如 74880"
          aria-label="自定义波特率"
          :aria-invalid="!!configError || undefined"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="label px-1">数据位</span>
        <OptionGroup v-model="dataBits" aria-label="数据位" :options="DATA_BITS_OPTIONS" />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="label px-1">停止位</span>
        <OptionGroup v-model="stopBits" aria-label="停止位" :options="STOP_BITS_OPTIONS" />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="label px-1">校验位</span>
        <OptionGroup v-model="parity" aria-label="校验位" :options="PARITY_OPTIONS" />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="label px-1">流控</span>
        <OptionGroup v-model="flowControl" aria-label="流控" :options="FLOW_OPTIONS" />
      </div>
      <p class="hint px-1 leading-relaxed">划线选项为浏览器 Web Serial 不支持的设置，无法选择。</p>
    </fieldset>
    <p v-if="isOpen && flowPaused" class="chip self-start text-warning" role="status">已收到 XOFF，发送暂停中</p>

    <div class="flex flex-col gap-1.5">
      <span class="label px-1">字符编码</span>
      <OptionGroup v-model="encoding" aria-label="字符编码" :options="ENCODING_OPTIONS" />
    </div>

    <button
      type="button"
      class="btn h-11 w-full text-[15px]"
      :class="{ 'btn-primary': !isOpen }"
      :disabled="status === 'opening' || status === 'closing'"
      @click="toggleConnection"
    >
      {{ isOpen ? '关闭串口' : status === 'opening' ? '正在打开…' : status === 'closing' ? '正在关闭…' : '打开串口' }}
    </button>
    <ErrorAlert :message="configError || error" />

    <div v-if="isOpen" class="flex items-center gap-4 px-1">
      <span class="label">控制信号</span>
      <label class="checkbox-label">
        <input v-model="dtr" type="checkbox" @change="updateSignals" />
        DTR
      </label>
      <label class="checkbox-label">
        <input v-model="rts" type="checkbox" @change="updateSignals" />
        RTS
      </label>
    </div>

    <div class="rows rounded-card bg-hover px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--hairline)]">
      <div class="flex h-10 items-center justify-between">
        <span class="text-ink-2">接收 RX</span>
        <span class="mono text-ink tabular-nums">{{ rxBytes.toLocaleString() }} 字节</span>
      </div>
      <div class="flex h-10 items-center justify-between">
        <span class="text-ink-2">发送 TX</span>
        <span class="mono text-ink tabular-nums">{{ txBytes.toLocaleString() }} 字节</span>
      </div>
    </div>
    <button type="button" class="btn btn-sm self-start" :disabled="!rxBytes && !txBytes" @click="emit('resetCounters')">计数清零</button>

    <p class="hint px-1 leading-relaxed">
      浏览器无法读取 COM 口名称，端口按 USB 芯片显示。若打开失败，请先关闭占用该串口的其他程序。
    </p>
  </section>
</template>
