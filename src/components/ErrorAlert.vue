<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ message: string }>()
</script>

<template>
  <!-- 行内反馈：紧贴出错的位置，不用彩色底框 -->
  <p v-if="message" role="alert" class="flex items-start gap-2 px-1 text-[13px] leading-relaxed break-all text-danger">
    <AppIcon name="circle-alert" :size="16" class="mt-[3px]" />
    <span>{{ message }}</span>
  </p>
</template>
