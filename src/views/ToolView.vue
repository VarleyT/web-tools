<script lang="ts">
import { defineAsyncComponent, h, type Component } from 'vue'

const LOADING_DELAY_MS = 150

const LoadError = () => h('p', { class: 'px-1 text-[14px] text-danger' }, '工具加载失败，请检查网络后刷新页面重试。')
const Loading = () => h('p', { class: 'px-1 text-[14px] text-ink-3' }, '加载中…')

// 模块级缓存：每个工具只创建一次异步组件包装，再次访问时直接复用
const asyncComponents = new Map<string, Component>()

function asyncToolComponent(id: string, loader: () => Promise<Component>): Component {
  const cached = asyncComponents.get(id)
  if (cached) return cached
  const component = defineAsyncComponent({
    loader,
    loadingComponent: Loading,
    errorComponent: LoadError,
    delay: LOADING_DELAY_MS,
  })
  asyncComponents.set(id, component)
  return component
}
</script>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ToolIcon from '@/components/ToolIcon.vue'
import { useFavorites, useRecent } from '@/composables/usePreferences'
import { CATEGORIES, findTool } from '@/tools/registry'

const props = defineProps<{ id: string }>()

const { isFavorite, toggleFavorite } = useFavorites()
const { recordRecent } = useRecent()

const tool = computed(() => findTool(props.id))
const categoryName = computed(() => CATEGORIES.find((category) => category.id === tool.value?.category)?.name ?? '')

const toolComponent = computed(() => (tool.value ? asyncToolComponent(tool.value.id, tool.value.component) : null))

watch(
  () => props.id,
  (id) => {
    if (findTool(id)) recordRecent(id)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="tool" class="mx-auto max-w-[1080px]">
    <header class="mb-[clamp(22px,4vw,34px)] flex items-start gap-4 pt-[clamp(0px,1vw,8px)]">
      <ToolIcon :badge="tool.badge" size="lg" class="mt-1 hidden sm:inline-flex" />
      <div class="min-w-0 flex-1">
        <p class="text-[12px] font-semibold tracking-[0.06em] text-accent-link">{{ categoryName }}</p>
        <h1 class="mt-1 text-[clamp(27px,4.4vw,38px)] leading-[1.15] font-bold tracking-[-0.03em]">{{ tool.name }}</h1>
        <p class="mt-2 text-[15px] leading-[1.6] text-ink-2">{{ tool.description }}</p>
      </div>
      <button
        type="button"
        class="btn mt-1 bg-surface shadow-card hover:bg-surface"
        :class="isFavorite(tool.id) ? 'text-accent' : 'text-ink-body'"
        :aria-pressed="isFavorite(tool.id)"
        @click="toggleFavorite(tool.id)"
      >
        <AppIcon name="star" :size="16" :filled="isFavorite(tool.id)" />
        <span class="hidden sm:inline">{{ isFavorite(tool.id) ? '已收藏' : '收藏' }}</span>
        <span class="sr-only sm:hidden">{{ isFavorite(tool.id) ? '取消收藏' : '收藏' }}</span>
      </button>
    </header>
    <component :is="toolComponent" :key="tool.id" />
  </div>

  <div v-else class="mx-auto flex max-w-md flex-col items-center py-24 text-center">
    <p class="text-[clamp(48px,10vw,72px)] leading-none font-bold tracking-[-0.04em] text-faint tabular-nums">404</p>
    <p class="mt-4 text-ink-2">找不到工具“{{ id }}”</p>
    <RouterLink to="/" class="btn btn-primary mt-6 h-11 px-5">返回首页</RouterLink>
  </div>
</template>
