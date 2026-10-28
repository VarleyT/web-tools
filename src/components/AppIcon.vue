<script lang="ts">
type IconElement = ['path', { d: string }] | ['circle', { cx: number; cy: number; r: number }] | ['rect', Record<string, number>]

const path = (d: string): IconElement => ['path', { d }]

/** 线性图标（Lucide，ISC License）：24 栅格、1.75 描边、继承 currentColor */
const ICONS = {
  search: [['circle', { cx: 11, cy: 11, r: 7 }], path('M21 21l-4.35-4.35')],
  menu: [path('M4 7h16'), path('M4 12h16'), path('M4 17h16')],
  x: [path('M18 6 6 18'), path('M6 6l12 12')],
  check: [path('M5 12l5 5L20 6')],
  'chevron-right': [path('M9 6l6 6-6 6')],
  star: [
    path(
      'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
    ),
  ],
  'circle-alert': [['circle', { cx: 12, cy: 12, r: 9 }], path('M12 8v4.5'), path('M12 16h.01')],
  'triangle-alert': [path('M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0'), path('M12 9v4'), path('M12 17h.01')],
  'swap-vertical': [path('M7 4v16'), path('M3 8l4-4 4 4'), path('M17 20V4'), path('M21 16l-4 4-4-4')],
} satisfies Record<string, IconElement[]>

export type IconName = keyof typeof ICONS
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: IconName; size?: number; filled?: boolean }>(), { size: 18, filled: false })

const elements = computed(() => ICONS[props.name] as IconElement[])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0"
    aria-hidden="true"
  >
    <component :is="tag" v-for="([tag, attrs], index) in elements" :key="index" v-bind="attrs" />
  </svg>
</template>
