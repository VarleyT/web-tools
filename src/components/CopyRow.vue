<script setup lang="ts">
import CopyButton from './CopyButton.vue'

defineProps<{ label: string; value: string }>()
</script>

<template>
  <!-- 放在 .rows 容器中，由容器负责行间发丝线 -->
  <div class="flex min-h-12 items-center gap-3 py-2">
    <span class="w-20 shrink-0 text-[13px] text-ink-3 sm:w-28">{{ label }}</span>
    <code class="mono min-w-0 flex-1 break-all whitespace-pre-wrap text-ink select-all">{{ value || '—' }}</code>
    <CopyButton :text="value" />
  </div>
</template>
