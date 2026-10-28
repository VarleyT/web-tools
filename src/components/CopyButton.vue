<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import AppIcon from './AppIcon.vue'

const COPIED_DURATION_MS = 1500

withDefaults(defineProps<{ text: string; label?: string }>(), { label: '复制' })

const { copy, copied } = useClipboard({ legacy: true, copiedDuring: COPIED_DURATION_MS })
</script>

<template>
  <button type="button" class="btn btn-sm" :class="{ 'text-accent': copied }" :disabled="!text" @click="copy(text)">
    <AppIcon v-if="copied" name="check" :size="14" />
    {{ copied ? '已复制' : label }}
  </button>
</template>
