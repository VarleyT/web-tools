<script setup lang="ts">
import { useIntervalFn, useStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { errorMessage, useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { buildPayload, type DataFormat, type LineEnding, type TextEncodingName } from '@/lib/serial'

const MIN_LOOP_INTERVAL_MS = 10
const QUICK_LABEL_LENGTH = 24
const FORMAT_OPTIONS: ReadonlyArray<{ label: string; value: DataFormat }> = [
  { label: '文本', value: 'text' },
  { label: 'Hex', value: 'hex' },
]
const LINE_ENDING_OPTIONS: ReadonlyArray<{ label: string; value: LineEnding }> = [
  { label: '无', value: 'none' },
  { label: '\\r\\n', value: 'crlf' },
  { label: '\\n', value: 'lf' },
  { label: '\\r', value: 'cr' },
]

interface QuickCommand {
  id: string
  label: string
  input: string
  format: DataFormat
}

const props = defineProps<{
  encoding: TextEncodingName
  /** 串口未打开时禁用发送 */
  disabled: boolean
  send: (bytes: Uint8Array) => Promise<void>
}>()

const format = useToolState<DataFormat>('serial', 'sendFormat', 'text')
const lineEnding = useToolState<LineEnding>('serial', 'lineEnding', 'none')
const escapes = useToolState('serial', 'escapes', false)
const loopInterval = useToolState('serial', 'loopInterval', 1000)
// 快捷指令由用户主动保存；发送框本身可能含设备口令，不写入本地存储
const quickCommands = useStorage<QuickCommand[]>('bytegrep:tool:serial:quickCommands', [])

const input = ref('')
const isLooping = ref(false)
const isSending = ref(false)
const sendError = ref('')

const { value: payload, error: payloadError } = useSafeComputed(
  () =>
    buildPayload(input.value, {
      format: format.value,
      encoding: props.encoding,
      lineEnding: lineEnding.value,
      escapes: escapes.value,
    }),
  new Uint8Array(),
)

const canSend = computed(() => !props.disabled && payload.value.length > 0)
const intervalMs = computed(() => Math.max(MIN_LOOP_INTERVAL_MS, Math.floor(Number(loopInterval.value) || 0)))

async function sendOnce(): Promise<void> {
  // 上一次写入未完成时跳过，避免定时发送堆积
  if (!canSend.value || isSending.value) return
  isSending.value = true
  sendError.value = ''
  try {
    await props.send(payload.value)
  } catch (caught) {
    sendError.value = errorMessage(caught)
    isLooping.value = false
  } finally {
    isSending.value = false
  }
}

const loop = useIntervalFn(sendOnce, intervalMs, { immediate: false })

watch(isLooping, (looping) => (looping ? loop.resume() : loop.pause()))
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) isLooping.value = false
  },
)

function saveQuickCommand(): void {
  const text = input.value
  if (!text.trim() || quickCommands.value.some((item) => item.input === text && item.format === format.value)) return
  const label = text.trim().replace(/\s+/g, ' ').slice(0, QUICK_LABEL_LENGTH)
  quickCommands.value = [...quickCommands.value, { id: crypto.randomUUID(), label, input: text, format: format.value }]
}

function removeQuickCommand(id: string): void {
  quickCommands.value = quickCommands.value.filter((item) => item.id !== id)
}

function runQuickCommand(command: QuickCommand): void {
  input.value = command.input
  format.value = command.format
  void sendOnce()
}
</script>

<template>
  <section class="panel flex min-w-0 flex-col gap-3" aria-labelledby="serial-sender-heading">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 id="serial-sender-heading">发送</h2>
      <OptionGroup v-model="format" aria-label="发送格式" :options="FORMAT_OPTIONS" />
      <template v-if="format === 'text'">
        <OptionGroup v-model="lineEnding" aria-label="追加换行" :options="LINE_ENDING_OPTIONS" />
        <label class="checkbox-label" title="解析 \r \n \t \0 \\ \xHH">
          <input v-model="escapes" type="checkbox" />
          转义字符
        </label>
      </template>
    </div>

    <textarea
      v-model="input"
      class="textarea"
      :class="{ 'field-invalid': payloadError }"
      rows="3"
      :placeholder="format === 'hex' ? '十六进制，如 AA 55 01 FF' : '要发送的文本，Ctrl + Enter 发送'"
      aria-label="发送内容"
      :aria-invalid="!!payloadError || undefined"
      spellcheck="false"
      autocomplete="off"
      @keydown.ctrl.enter.prevent="sendOnce"
      @keydown.meta.enter.prevent="sendOnce"
    />
    <ErrorAlert :message="payloadError || sendError" />

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label class="checkbox-label">
        <input v-model="isLooping" type="checkbox" :disabled="disabled" />
        定时发送
      </label>
      <label class="flex items-center gap-2 text-[13.5px] text-ink-body">
        每
        <input
          v-model.number="loopInterval"
          type="number"
          class="input mono h-[30px] w-24 px-2.5"
          :min="MIN_LOOP_INTERVAL_MS"
          step="10"
          aria-label="发送间隔（毫秒）"
        />
        毫秒
      </label>
      <div class="ml-auto flex items-center gap-2">
        <span class="hint tabular-nums">{{ payload.length }} 字节</span>
        <button type="button" class="btn btn-sm" :disabled="!input.trim()" @click="saveQuickCommand">存为快捷指令</button>
        <button type="button" class="btn btn-primary min-w-20" :disabled="!canSend || isSending" @click="sendOnce">发送</button>
      </div>
    </div>

    <div v-if="quickCommands.length" class="flex flex-col gap-2 pt-1">
      <span class="label px-1">快捷指令{{ disabled ? '（打开串口后点击即发送）' : '' }}</span>
      <div class="flex flex-wrap gap-2">
        <span v-for="command in quickCommands" :key="command.id" class="inline-flex items-center rounded-pill bg-fill">
          <button
            type="button"
            class="h-[30px] cursor-pointer rounded-l-pill pr-1.5 pl-3 font-mono text-[12.5px] text-ink-body hover:text-accent-link"
            :title="command.input"
            @click="runQuickCommand(command)"
          >
            <span v-if="command.format === 'hex'" class="mr-1 text-ink-3">HEX</span>{{ command.label }}
          </button>
          <button
            type="button"
            class="flex size-[30px] cursor-pointer items-center justify-center rounded-r-pill text-ink-3 hover:text-danger"
            :aria-label="`删除快捷指令 ${command.label}`"
            @click="removeQuickCommand(command.id)"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </span>
      </div>
    </div>
  </section>
</template>
