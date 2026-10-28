<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ values: readonly string[] }>()
</script>

<template>
  <p v-if="values.length" role="status" class="flex items-start gap-2 px-1 text-[13px] leading-relaxed text-ink-body">
    <AppIcon name="triangle-alert" :size="16" class="mt-[3px] text-warning" />
    <span>
      <code class="mono break-all text-warning">{{ values.join('、') }}</code>
      超出 JavaScript 安全整数范围（±2<sup>53</sup>），输出中的这些值会丢失精度。如需保留，请在源数据中改用字符串。
    </span>
  </p>
</template>
