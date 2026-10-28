<script lang="ts">
import { defineAsyncComponent, h, type Component } from 'vue'

const LOADING_DELAY_MS = 150

const LoadError = () => h('p', { class: 'text-red-500' }, '工具加载失败，请检查网络后刷新页面重试。')
const Loading = () => h('p', { class: 'text-slate-400' }, '加载中…')

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
  <div v-if="tool" class="mx-auto max-w-6xl">
    <header class="mb-6 flex items-start gap-4">
      <ToolIcon :badge="tool.badge" :category="tool.category" size="lg" />
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-slate-400">{{ categoryName }}</p>
        <h1 class="text-2xl font-bold tracking-tight">{{ tool.name }}</h1>
        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ tool.description }}</p>
      </div>
      <button
        type="button"
        class="btn"
        :class="{ 'border-amber-300 text-amber-600 dark:border-amber-500/50 dark:text-amber-400': isFavorite(tool.id) }"
        :aria-pressed="isFavorite(tool.id)"
        @click="toggleFavorite(tool.id)"
      >
        {{ isFavorite(tool.id) ? '★ 已收藏' : '☆ 收藏' }}
      </button>
    </header>
    <component :is="toolComponent" :key="tool.id" />
  </div>

  <div v-else class="mx-auto max-w-md py-24 text-center">
    <p class="font-mono text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
    <p class="mt-3 text-slate-500">找不到工具 “{{ id }}”</p>
    <RouterLink to="/" class="btn btn-primary mt-6">返回首页</RouterLink>
  </div>
</template>
