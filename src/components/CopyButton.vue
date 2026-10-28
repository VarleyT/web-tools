<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const COPIED_DURATION_MS = 1500

withDefaults(defineProps<{ text: string; label?: string }>(), { label: '复制' })

const { copy, copied } = useClipboard({ legacy: true, copiedDuring: COPIED_DURATION_MS })
</script>

<template>
  <button
    type="button"
    class="btn btn-sm"
    :class="{ 'border-emerald-500 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400': copied }"
    :disabled="!text"
    @click="copy(text)"
  >
    {{ copied ? '已复制' : label }}
  </button>
</template>
