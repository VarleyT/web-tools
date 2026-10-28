<script setup lang="ts">
import { computed, ref } from 'vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import {
  decrypt,
  encrypt,
  isStreamMode,
  type CipherAlgorithm,
  type CipherMode,
  type CipherOptions,
  type CipherPadding,
  type CipherTextEncoding,
  type TextEncoding,
} from '@/lib/cipher'

type Action = 'encrypt' | 'decrypt'

const ALGORITHMS: ReadonlyArray<{ label: string; value: CipherAlgorithm }> = [
  { label: 'AES', value: 'AES' },
  { label: 'DES', value: 'DES' },
  { label: '3DES', value: 'TripleDES' },
  { label: 'RC4', value: 'RC4' },
]
const MODES: readonly CipherMode[] = ['CBC', 'ECB', 'CFB', 'OFB', 'CTR']
const PADDINGS: readonly CipherPadding[] = ['Pkcs7', 'ZeroPadding', 'NoPadding', 'Iso10126', 'Iso97971', 'AnsiX923']
const ENCODINGS: ReadonlyArray<{ label: string; value: TextEncoding }> = [
  { label: 'UTF-8', value: 'utf8' },
  { label: 'Hex', value: 'hex' },
  { label: 'Base64', value: 'base64' },
]
const RANDOM_KEY_BYTES: Record<CipherAlgorithm, number> = { AES: 32, DES: 8, TripleDES: 24, RC4: 16 }
const IV_BYTES: Record<CipherAlgorithm, number> = { AES: 16, DES: 8, TripleDES: 8, RC4: 0 }

const action = useToolState<Action>('cipher', 'action', 'encrypt')
const algorithm = useToolState<CipherAlgorithm>('cipher', 'algorithm', 'AES')
const mode = useToolState<CipherMode>('cipher', 'mode', 'CBC')
const padding = useToolState<CipherPadding>('cipher', 'padding', 'Pkcs7')
const keyEncoding = useToolState<TextEncoding>('cipher', 'keyEncoding', 'utf8')
const ivEncoding = useToolState<TextEncoding>('cipher', 'ivEncoding', 'utf8')
const cipherEncoding = useToolState<CipherTextEncoding>('cipher', 'cipherEncoding', 'base64')

// 明文、密钥与 IV 均为敏感数据，仅保存在内存中
const input = ref('')
const key = ref('')
const iv = ref('')

const isBlockCipher = computed(() => algorithm.value !== 'RC4')
const needsIv = computed(() => isBlockCipher.value && mode.value !== 'ECB')

const options = computed<CipherOptions>(() => ({
  algorithm: algorithm.value,
  mode: mode.value,
  padding: padding.value,
  key: key.value,
  keyEncoding: keyEncoding.value,
  iv: iv.value,
  ivEncoding: ivEncoding.value,
}))

const { value: output, error } = useSafeComputed(() => {
  if (input.value === '') return ''
  return action.value === 'encrypt'
    ? encrypt(input.value, options.value, cipherEncoding.value)
    : decrypt(input.value, options.value, cipherEncoding.value)
}, '')

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomizeKey(): void {
  key.value = randomHex(RANDOM_KEY_BYTES[algorithm.value])
  keyEncoding.value = 'hex'
}

function randomizeIv(): void {
  iv.value = randomHex(IV_BYTES[algorithm.value])
  ivEncoding.value = 'hex'
}

function swapAction(): void {
  input.value = output.value
  action.value = action.value === 'encrypt' ? 'decrypt' : 'encrypt'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="card grid gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <span class="label">算法</span>
        <OptionGroup v-model="algorithm" aria-label="算法" :options="ALGORITHMS" />
      </div>
      <div v-if="isBlockCipher" class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="label">模式</span>
          <select v-model="mode" class="input">
            <option v-for="item in MODES" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label">{{ isStreamMode(mode) ? '填充（流模式不填充）' : '填充' }}</span>
          <select v-model="padding" class="input disabled:opacity-50" :disabled="isStreamMode(mode)">
            <option v-for="item in PADDINGS" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="label">密钥（不会保存）</span>
        <div class="flex gap-2">
          <input v-model="key" class="input font-mono" autocomplete="off" aria-label="密钥" />
          <select v-model="keyEncoding" class="input w-28 shrink-0" aria-label="密钥编码">
            <option v-for="item in ENCODINGS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <button type="button" class="btn" @click="randomizeKey">随机</button>
        </div>
      </div>
      <div v-if="needsIv" class="flex flex-col gap-1.5">
        <span class="label">IV（{{ IV_BYTES[algorithm] }} 字节，不会保存）</span>
        <div class="flex gap-2">
          <input v-model="iv" class="input font-mono" autocomplete="off" aria-label="IV" />
          <select v-model="ivEncoding" class="input w-28 shrink-0" aria-label="IV 编码">
            <option v-for="item in ENCODINGS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <button type="button" class="btn" @click="randomizeIv">随机</button>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="action"
        aria-label="操作"
        :options="[
          { label: '加密', value: 'encrypt' },
          { label: '解密', value: 'decrypt' },
        ]"
      />
      <span class="label">密文编码</span>
      <OptionGroup
        v-model="cipherEncoding"
        aria-label="密文编码"
        :options="[
          { label: 'Base64', value: 'base64' },
          { label: 'Hex', value: 'hex' },
        ]"
      />
      <button type="button" class="btn ml-auto" :disabled="!output" @click="swapAction">⇅ 结果作为输入</button>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" :label="action === 'encrypt' ? '明文（UTF-8）' : '密文'" :rows="8" />
      <TextPanel
        :model-value="output"
        :label="action === 'encrypt' ? '密文' : '明文'"
        readonly
        :rows="8"
        :invalid="!!error"
      />
    </div>
    <ErrorAlert :message="error" />
  </div>
</template>
