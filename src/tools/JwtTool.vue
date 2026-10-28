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
    return { text: '未设置 exp', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }
  }
  return decoded.value.isExpired
    ? { text: '已过期', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' }
    : { text: '未过期', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <TextPanel v-model="token" label="JWT（可带 Bearer 前缀，不会保存）" :rows="4" placeholder="eyJhbGciOi..." />
    <ErrorAlert :message="error" />
    <p class="text-xs text-slate-400">仅解码查看内容，不校验签名。</p>

    <template v-if="decoded">
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="status" class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="status.tone">
          {{ status.text }}
        </span>
        <span class="font-mono text-xs text-slate-400">alg: {{ String(decoded.header.alg ?? '—') }}</span>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <TextPanel :model-value="pretty(decoded.header)" label="Header" readonly :rows="8" />
        <TextPanel :model-value="pretty(decoded.payload)" label="Payload" readonly :rows="8" />
      </div>
      <section class="card py-2">
        <CopyRow label="签发 iat" :value="describe(decoded.issuedAt)" />
        <CopyRow label="生效 nbf" :value="describe(decoded.notBefore)" />
        <CopyRow label="过期 exp" :value="describe(decoded.expiresAt)" />
        <CopyRow label="签名" :value="decoded.signature" />
      </section>
    </template>
  </div>
</template>
