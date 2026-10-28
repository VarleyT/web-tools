<script setup lang="ts">
import { useId } from 'vue'

// 页面上同时有两个标识（移动顶栏 + 侧边栏），渐变 id 需唯一
const gradientId = `brand-${useId()}`
</script>

<template>
  <svg class="size-[26px] shrink-0 drop-shadow-[0_2px_6px_rgba(10,132,255,0.3)]" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0a84ff" />
        <stop offset="1" stop-color="#5e5ce6" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="7" :fill="`url(#${gradientId})`" />
    <path
      d="M10 11.5l-4 4.5 4 4.5M22 11.5l4 4.5-4 4.5M18 8.5l-4 15"
      stroke="#fff"
      stroke-width="2.4"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
