<script setup lang="ts">
import QRCode from 'qrcode'
import { ref, watch } from 'vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { errorMessage } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'

type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

const MIN_SIZE = 128
const MAX_SIZE = 1024
const MAX_MARGIN = 10

// 二维码内容可能是 Wi-Fi 密码或 OTP 密钥，不写入本地存储
const text = ref('https://github.com/')
const level = useToolState<ErrorLevel>('qrcode', 'level', 'M')
const size = useToolState('qrcode', 'size', 320)
const margin = useToolState('qrcode', 'margin', 2)
const foreground = useToolState('qrcode', 'foreground', '#0f172a')
const background = useToolState('qrcode', 'background', '#ffffff')

const dataUrl = ref('')
const error = ref('')
let latestRequest = 0

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.floor(value) || min))

watch(
  [text, level, size, margin, foreground, background],
  async () => {
    const request = ++latestRequest
    if (!text.value) {
      dataUrl.value = ''
      error.value = ''
      return
    }
    try {
      const url = await QRCode.toDataURL(text.value, {
        errorCorrectionLevel: level.value,
        width: clamp(size.value, MIN_SIZE, MAX_SIZE),
        margin: clamp(margin.value, 0, MAX_MARGIN),
        color: { dark: foreground.value, light: background.value },
      })
      // 只采用最后一次请求的结果，避免快速输入时旧结果覆盖新结果
      if (request !== latestRequest) return
      dataUrl.value = url
      error.value = ''
    } catch (caught) {
      if (request !== latestRequest) return
      dataUrl.value = ''
      error.value = errorMessage(caught)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[1fr_auto]">
    <div class="flex flex-col gap-4">
      <TextPanel v-model="text" label="内容（不会保存）" :rows="6" placeholder="文本或链接" />
      <section class="panel grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <span class="label">容错等级</span>
          <OptionGroup
            v-model="level"
            aria-label="容错等级"
            :options="[
              { label: 'L 7%', value: 'L' },
              { label: 'M 15%', value: 'M' },
              { label: 'Q 25%', value: 'Q' },
              { label: 'H 30%', value: 'H' },
            ]"
          />
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="label">尺寸 {{ size }}px</span>
          <input v-model.number="size" type="range" :min="MIN_SIZE" :max="MAX_SIZE" step="32" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label">边距 {{ margin }}</span>
          <input v-model.number="margin" type="range" min="0" :max="MAX_MARGIN" />
        </label>
        <div class="flex gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="label">前景色</span>
            <input v-model="foreground" type="color" class="h-10 w-14 cursor-pointer rounded-thumb" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="label">背景色</span>
            <input v-model="background" type="color" class="h-10 w-14 cursor-pointer rounded-thumb" />
          </label>
        </div>
      </section>
      <ErrorAlert :message="error" />
    </div>

    <section class="panel flex flex-col items-center gap-3 self-start">
      <img
        v-if="dataUrl"
        :src="dataUrl"
        alt="生成的二维码"
        class="size-64 rounded-thumb [image-rendering:pixelated]"
        width="256"
        height="256"
      />
      <div v-else class="flex size-64 items-center justify-center rounded-thumb bg-fill text-[13.5px] text-ink-3">
        输入内容后生成
      </div>
      <a v-if="dataUrl" :href="dataUrl" download="qrcode.png" class="btn btn-primary w-full">下载 PNG</a>
    </section>
  </div>
</template>
