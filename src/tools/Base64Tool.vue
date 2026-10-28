<script setup lang="ts">
import { computed, ref } from 'vue'
import CodecTool from '@/components/CodecTool.vue'
import CopyButton from '@/components/CopyButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { useToolState } from '@/composables/useToolState'
import { base64Decode, base64Encode } from '@/lib/encoding'

const MAX_FILE_MB = 5
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

const urlSafe = useToolState('base64', 'urlSafe', false)
const encode = (text: string): string => base64Encode(text, urlSafe.value)

const fileName = ref('')
const dataUrl = ref('')
const fileError = ref('')
const isImage = computed(() => dataUrl.value.startsWith('data:image/'))

let activeReader: FileReader | null = null

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // 连续选择文件时丢弃上一次未完成的读取，避免旧结果覆盖新文件
  activeReader?.abort()
  activeReader = null
  fileError.value = ''
  dataUrl.value = ''
  fileName.value = file.name
  if (file.size > MAX_FILE_BYTES) {
    fileError.value = `文件超过 ${MAX_FILE_MB} MB 限制`
    return
  }
  const reader = new FileReader()
  activeReader = reader
  reader.onload = () => {
    if (activeReader !== reader) return
    dataUrl.value = String(reader.result)
    activeReader = null
  }
  reader.onerror = () => {
    if (activeReader !== reader) return
    fileError.value = '读取文件失败'
    activeReader = null
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <CodecTool tool-id="base64" :encode="encode" :decode="base64Decode" :remember-input="false">
      <template #options="{ mode }">
        <label v-if="mode === 'encode'" class="checkbox-label">
          <input v-model="urlSafe" type="checkbox" />
          URL-safe（- _ 无填充）
        </label>
        <span v-else class="hint">自动兼容 URL-safe、缺省填充与换行</span>
      </template>
    </CodecTool>

    <section class="panel flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="font-semibold">文件转 Base64</h2>
        <label class="btn btn-sm focus-within:outline-2 focus-within:outline-accent">
          选择文件
          <input type="file" class="sr-only" @change="onFileChange" />
        </label>
        <span class="hint">{{ fileName || `本地读取不上传，最大 ${MAX_FILE_MB} MB` }}</span>
        <CopyButton v-if="dataUrl" class="ml-auto" :text="dataUrl" label="复制 Data URL" />
      </div>
      <ErrorAlert :message="fileError" />
      <img
        v-if="isImage"
        :src="dataUrl"
        alt="图片预览"
        class="max-h-48 self-start rounded-thumb shadow-card"
      />
      <textarea v-if="dataUrl" class="textarea" rows="4" readonly :value="dataUrl" aria-label="Data URL" />
    </section>
  </div>
</template>
