<script setup lang="ts">
import CopyButton from './CopyButton.vue'

defineProps<{ label: string; value: string }>()
</script>

<template>
  <div class="flex items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-slate-800">
    <span class="label w-20 shrink-0 sm:w-28">{{ label }}</span>
    <code class="mono min-w-0 flex-1 break-all whitespace-pre-wrap select-all">{{ value || '—' }}</code>
    <CopyButton :text="value" />
  </div>
</template>
