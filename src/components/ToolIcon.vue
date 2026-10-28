<script setup lang="ts">
/** 工具字母标：列表中用强调色淡底；lg 用于工具页标题，蓝色渐变突出当前页面；sm 用于侧边栏中的大工具 */
withDefaults(defineProps<{ badge: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const SIZES = {
  sm: 'size-7 rounded-chip bg-[image:var(--grad-blue)] text-[9px] text-white',
  md: 'size-9 rounded-thumb bg-accent/10 text-[10.5px] text-accent-link',
  lg: 'size-12 rounded-thumb bg-[image:var(--grad-blue)] text-[13px] text-white shadow-mark',
} as const
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center font-mono font-semibold tracking-tight"
    :class="SIZES[size]"
    aria-hidden="true"
  >
    {{ badge }}
  </span>
</template>
