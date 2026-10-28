<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <p
    v-if="message"
    role="alert"
    class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-[13px] break-all text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
  >
    {{ message }}
  </p>
</template>
