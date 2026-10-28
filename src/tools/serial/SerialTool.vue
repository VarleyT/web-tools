<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { ref, shallowRef } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useSerialPort } from '@/composables/useSerialPort'
import { useToolState } from '@/composables/useToolState'
import {
  appendToLog,
  DEFAULT_PACKET_TIMEOUT_MS,
  normalizePacketTimeout,
  type DataFormat,
  type LogChunk,
  type LogEntry,
  type TextEncodingName,
} from '@/lib/serial'
import SerialConfigPanel from './SerialConfigPanel.vue'
import SerialMonitor from './SerialMonitor.vue'
import SerialSender from './SerialSender.vue'

/** 收到的分片先缓冲，按固定节奏批量写入记录，避免高波特率下逐片触发渲染 */
const FLUSH_INTERVAL_MS = 50
const MAX_LOG_ENTRIES = 2000
const MAX_ENTRY_BYTES = 4096

const encoding = useToolState<TextEncodingName>('serial', 'encoding', 'utf-8')
const displayFormat = useToolState<DataFormat>('serial', 'displayFormat', 'text')
const packetMode = useToolState('serial', 'packetMode', true)
const packetTimeout = useToolState('serial', 'packetTimeout', DEFAULT_PACKET_TIMEOUT_MS)

const log = shallowRef<readonly LogEntry[]>([])
const rxBytes = ref(0)
const txBytes = ref(0)
let pending: LogChunk[] = []

const { isSupported, status, error, portLabel, isFlowPaused, choosePort, open, close, write, setSignals } = useSerialPort((bytes) => {
  pending.push({ direction: 'rx', bytes, time: Date.now() })
})

function flush(): void {
  if (pending.length === 0) return
  const chunks = pending
  pending = []
  for (const chunk of chunks) {
    if (chunk.direction === 'rx') rxBytes.value += chunk.bytes.length
    else txBytes.value += chunk.bytes.length
  }
  log.value = appendToLog(log.value, chunks, {
    // 分包：间隔超过超时时间即为新的一包；不分包：文本按换行分行，Hex 连续拼接
    frameGapMs: packetMode.value ? normalizePacketTimeout(packetTimeout.value) : null,
    splitOnNewline: !packetMode.value && displayFormat.value === 'text',
    maxEntries: MAX_LOG_ENTRIES,
    maxEntryBytes: MAX_ENTRY_BYTES,
  })
}

useIntervalFn(flush, FLUSH_INTERVAL_MS)

function send(bytes: Uint8Array): Promise<void> {
  // 在数据交给写流的瞬间记录：排在设备回复之前，且排队或等待 XON 期间失败的发送不会出现在记录里
  return write(bytes, () => {
    pending.push({ direction: 'tx', bytes, time: Date.now() })
  })
}

function clearLog(): void {
  pending = []
  log.value = []
}

function resetCounters(): void {
  rxBytes.value = 0
  txBytes.value = 0
}
</script>

<template>
  <div v-if="!isSupported" class="panel flex items-start gap-3">
    <AppIcon name="triangle-alert" :size="20" class="mt-0.5 text-warning" />
    <div class="flex flex-col gap-1.5">
      <h2>当前浏览器不支持 Web Serial</h2>
      <p class="text-[14px] leading-relaxed text-ink-2">
        串口助手通过浏览器的 Web Serial API 直接访问本机串口，数据不经过任何服务器。请使用桌面版 Chrome 或 Edge 89+
        打开本页面，并确保通过 HTTPS 或 localhost 访问。
      </p>
    </div>
  </div>

  <div v-else class="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
    <SerialConfigPanel
      v-model:encoding="encoding"
      class="lg:sticky lg:top-6"
      :status="status"
      :port-label="portLabel"
      :error="error"
      :rx-bytes="rxBytes"
      :tx-bytes="txBytes"
      :flow-paused="isFlowPaused"
      @choose="choosePort"
      @open="open"
      @close="close"
      @signals="setSignals"
      @reset-counters="resetCounters"
    />
    <div class="flex min-w-0 flex-col gap-4">
      <SerialMonitor
        v-model:format="displayFormat"
        v-model:packet-mode="packetMode"
        v-model:packet-timeout="packetTimeout"
        :log="log"
        :encoding="encoding"
        @clear="clearLog"
      />
      <SerialSender :encoding="encoding" :disabled="status !== 'open'" :send="send" />
    </div>
  </div>
</template>
