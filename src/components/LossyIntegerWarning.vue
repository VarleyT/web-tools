<script setup lang="ts">
defineProps<{ values: readonly string[] }>()
</script>

<template>
  <p
    v-if="values.length"
    role="status"
    class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
  >
    注意：<code class="mono break-all">{{ values.join('、') }}</code>
    超出 JavaScript 安全整数范围（±2<sup>53</sup>），输出中的这些值会丢失精度。如需保留，请在源数据中改用字符串。
  </p>
</template>
