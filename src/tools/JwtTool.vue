<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyRow from '@/components/CopyRow.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { decodeJwt, type DecodedJwt } from '@/lib/jwt'
import { formatDate, relativeTime } from '@/lib/timestamp'

// 令牌属于凭据，不写入本地存储
const token = ref('')

const { value: decoded, error } = useSafeComputed<DecodedJwt | null>(
  () => (token.value.trim() ? decodeJwt(token.value) : null),
  null,
)

const pretty = (value: unknown): string => JSON.stringify(value, null, 2)
const describe = (date?: Date): string => (date ? `${formatDate(date)}（${relativeTime(date)}）` : '')

const status = computed(() => {
  if (!decoded.value) return null
  if (decoded.value.isExpired === undefined) {
    return { text: '未设置 exp', tone: 'chip' }
  }
  return decoded.value.isExpired
    ? { text: '已过期', tone: 'chip chip-danger' }
    : { text: '未过期', tone: 'chip chip-success' }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <TextPanel v-model="token" label="JWT（可带 Bearer 前缀，不会保存）" :rows="4" placeholder="eyJhbGciOi..." />
    <ErrorAlert :message="error" />
    <p class="hint">仅解码查看内容，不校验签名。</p>

    <template v-if="decoded">
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="status" :class="status.tone">
          {{ status.text }}
        </span>
        <span class="font-mono hint">alg: {{ String(decoded.header.alg ?? '—') }}</span>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <TextPanel :model-value="pretty(decoded.header)" label="Header" readonly :rows="8" />
        <TextPanel :model-value="pretty(decoded.payload)" label="Payload" readonly :rows="8" />
      </div>
      <section class="panel rows py-1.5">
        <CopyRow label="签发 iat" :value="describe(decoded.issuedAt)" />
        <CopyRow label="生效 nbf" :value="describe(decoded.notBefore)" />
        <CopyRow label="过期 exp" :value="describe(decoded.expiresAt)" />
        <CopyRow label="签名" :value="decoded.signature" />
      </section>
    </template>
  </div>
</template>
