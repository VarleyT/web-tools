<script setup lang="ts">
import type { CategoryId } from '@/tools/registry'

withDefaults(defineProps<{ badge: string; category: CategoryId; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const CATEGORY_COLORS: Record<CategoryId, string> = {
  encode: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
  data: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  dev: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  generator: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
}

const SIZES = {
  sm: 'size-6 rounded-md text-[9px]',
  md: 'size-10 rounded-lg text-[11px]',
  lg: 'size-12 rounded-xl text-sm',
} as const
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center font-mono font-bold tracking-tight ring-1 ring-inset"
    :class="[CATEGORY_COLORS[category], SIZES[size]]"
    aria-hidden="true"
  >
    {{ badge }}
  </span>
</template>
