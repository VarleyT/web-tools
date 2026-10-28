<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useFavorites } from '@/composables/usePreferences'
import type { ToolMeta } from '@/tools/registry'
import AppIcon from './AppIcon.vue'
import ToolIcon from './ToolIcon.vue'

defineProps<{ tool: ToolMeta }>()

const { isFavorite, toggleFavorite } = useFavorites()
</script>

<template>
  <div class="group relative flex items-center transition-colors duration-150 hover:bg-hover">
    <RouterLink
      :to="{ name: 'tool', params: { id: tool.id } }"
      class="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pr-12 pl-[clamp(17px,3vw,22px)] outline-offset-[-2px]"
    >
      <ToolIcon :badge="tool.badge" />
      <span class="min-w-0 flex-1">
        <span
          class="block text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink transition-colors duration-150 group-hover:text-accent-link"
        >
          {{ tool.name }}
        </span>
        <span class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-2">{{ tool.description }}</span>
      </span>
    </RouterLink>
    <!-- 收藏：未收藏时仅在悬停时出现；触屏设备无悬停，始终显示 -->
    <button
      type="button"
      class="absolute right-1 flex size-11 cursor-pointer items-center justify-center rounded-pill transition-[opacity,color] duration-150 active:scale-90"
      :class="
        isFavorite(tool.id)
          ? 'text-accent'
          : 'text-ink-4 hover:text-ink-2 focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100'
      "
      :aria-label="isFavorite(tool.id) ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`"
      :aria-pressed="isFavorite(tool.id)"
      @click="toggleFavorite(tool.id)"
    >
      <AppIcon name="star" :size="17" :filled="isFavorite(tool.id)" />
    </button>
  </div>
</template>
