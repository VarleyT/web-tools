<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useFavorites } from '@/composables/usePreferences'
import type { ToolMeta } from '@/tools/registry'
import ToolIcon from './ToolIcon.vue'

defineProps<{ tool: ToolMeta }>()

const { isFavorite, toggleFavorite } = useFavorites()
</script>

<template>
  <div class="group relative">
    <RouterLink
      :to="{ name: 'tool', params: { id: tool.id } }"
      class="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50"
    >
      <ToolIcon :badge="tool.badge" :category="tool.category" />
      <span class="min-w-0 flex-1 pr-6">
        <span class="block font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300">
          {{ tool.name }}
        </span>
        <span class="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          {{ tool.description }}
        </span>
      </span>
    </RouterLink>
    <button
      type="button"
      class="absolute top-3 right-3 cursor-pointer rounded p-0.5 text-base leading-none transition-opacity"
      :class="
        isFavorite(tool.id)
          ? 'text-amber-400'
          : 'text-slate-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-amber-400 dark:text-slate-600'
      "
      :aria-label="isFavorite(tool.id) ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`"
      :aria-pressed="isFavorite(tool.id)"
      @click="toggleFavorite(tool.id)"
    >
      {{ isFavorite(tool.id) ? '★' : '☆' }}
    </button>
  </div>
</template>
