<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { errorMessage } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import {
  generateRsaKeyPair,
  maxPlaintextBytes,
  publicKeyBits,
  rsaDecrypt,
  rsaEncrypt,
  type RsaCipherEncoding,
  type RsaKeySize,
  type RsaPadding,
} from '@/lib/rsa'

type Action = 'encrypt' | 'decrypt'

const INPUT_DEBOUNCE_MS = 250
const KEY_SIZE_OPTIONS: ReadonlyArray<{ label: string; value: RsaKeySize }> = [
  { label: '1024', value: 1024 },
  { label: '2048', value: 2048 },
  { label: '3072', value: 3072 },
  { label: '4096', value: 4096 },
]
const PADDING_OPTIONS: ReadonlyArray<{ label: string; value: RsaPadding }> = [
  { label: 'PKCS#1 v1.5', value: 'PKCS1' },
  { label: 'OAEP SHA-256', value: 'OAEP-SHA256' },
  { label: 'OAEP SHA-1', value: 'OAEP-SHA1' },
]

const action = useToolState<Action>('rsa', 'action', 'encrypt')
const padding = useToolState<RsaPadding>('rsa', 'padding', 'PKCS1')
const cipherEncoding = useToolState<RsaCipherEncoding>('rsa', 'cipherEncoding', 'base64')
const keySize = useToolState<RsaKeySize>('rsa', 'keySize', 2048)

// 公钥、私钥、明文均只保存在内存中
const publicPem = ref('')
const privatePem = ref('')
const input = ref('')
const output = ref('')
const error = ref('')
const keyError = ref('')
const isGenerating = ref(false)
const keyBits = ref<number | null>(null)

async function generate(): Promise<void> {
  isGenerating.value = true
  keyError.value = ''
  try {
    const pair = await generateRsaKeyPair(keySize.value)
    publicPem.value = pair.publicPem
    privatePem.value = pair.privatePem
  } catch (caught) {
    keyError.value = errorMessage(caught)
  } finally {
    isGenerating.value = false
  }
}

watch(publicPem, async (pem) => {
  if (!pem.trim()) {
    keyBits.value = null
    return
  }
  try {
    keyBits.value = await publicKeyBits(pem)
  } catch {
    keyBits.value = null
  }
})

const inputBytes = computed(() => new TextEncoder().encode(input.value).length)
const limit = computed(() => (keyBits.value ? maxPlaintextBytes(keyBits.value, padding.value) : null))
const publicLabel = computed(() => `公钥（加密用）${keyBits.value ? ` · ${keyBits.value} 位` : ''}`)

const debouncedInput = refDebounced(input, INPUT_DEBOUNCE_MS)
let latestRequest = 0

async function run(): Promise<string> {
  const text = debouncedInput.value
  if (action.value === 'encrypt') {
    if (!publicPem.value.trim()) throw new Error('请先填入公钥，或点击「生成密钥对」')
    return rsaEncrypt(text, publicPem.value, padding.value, cipherEncoding.value)
  }
  if (!privatePem.value.trim()) throw new Error('请先填入私钥，或点击「生成密钥对」')
  return rsaDecrypt(text.trim(), privatePem.value, padding.value, cipherEncoding.value)
}

watch([debouncedInput, publicPem, privatePem, action, padding, cipherEncoding], async () => {
  const request = ++latestRequest
  if (!debouncedInput.value) {
    output.value = ''
    error.value = ''
    return
  }
  try {
    const result = await run()
    if (request !== latestRequest) return
    output.value = result
    error.value = ''
  } catch (caught) {
    if (request !== latestRequest) return
    output.value = ''
    error.value = errorMessage(caught)
  }
})

function swapAction(): void {
  input.value = output.value
  action.value = action.value === 'encrypt' ? 'decrypt' : 'encrypt'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="panel flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2>密钥</h2>
        <span class="hint">只在内存中，刷新即清空</span>
        <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
          <OptionGroup v-model="keySize" aria-label="密钥长度" :options="KEY_SIZE_OPTIONS" />
          <button type="button" class="btn btn-primary" :disabled="isGenerating" @click="generate">
            {{ isGenerating ? '生成中…' : '生成密钥对' }}
          </button>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <TextPanel v-model="publicPem" nowrap :label="publicLabel" :rows="7" placeholder="-----BEGIN PUBLIC KEY-----" />
        <TextPanel v-model="privatePem" nowrap label="私钥（解密用）" :rows="7" placeholder="-----BEGIN PRIVATE KEY-----" />
      </div>
      <ErrorAlert :message="keyError" />
      <p class="hint">
        支持 PKCS#8 / X.509（BEGIN PUBLIC KEY、BEGIN PRIVATE KEY）与 PKCS#1（BEGIN RSA …）格式，也可直接粘贴不带头尾的 Base64。
      </p>
    </section>

    <div class="flex flex-wrap items-center gap-3">
      <OptionGroup
        v-model="action"
        aria-label="操作"
        :options="[
          { label: '公钥加密', value: 'encrypt' },
          { label: '私钥解密', value: 'decrypt' },
        ]"
      />
      <OptionGroup v-model="padding" aria-label="填充方式" :options="PADDING_OPTIONS" />
      <OptionGroup
        v-model="cipherEncoding"
        aria-label="密文编码"
        :options="[
          { label: 'Base64', value: 'base64' },
          { label: 'Hex', value: 'hex' },
        ]"
      />
      <button type="button" class="btn ml-auto" :disabled="!output" @click="swapAction">
        <AppIcon name="swap-vertical" :size="15" />
        结果作为输入
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" :label="action === 'encrypt' ? '明文（UTF-8）' : '密文'" :rows="8" />
      <TextPanel :model-value="output" :label="action === 'encrypt' ? '密文' : '明文'" readonly :rows="8" :invalid="!!error" />
    </div>
    <ErrorAlert :message="error" />
    <p v-if="action === 'encrypt'" class="hint">
      <template v-if="limit !== null">
        当前密钥与填充方式最多加密 <span class="tabular-nums">{{ limit }}</span> 字节，已输入
        <span class="tabular-nums" :class="{ 'text-danger': inputBytes > limit }">{{ inputBytes }}</span> 字节。
      </template>
      RSA 加密带随机填充，同一明文每次的密文都不同，属正常现象。
    </p>
  </div>
</template>
