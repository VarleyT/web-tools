<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ToolIcon from '@/components/ToolIcon.vue'
import ToolList from '@/components/ToolList.vue'
import { useFavorites, useRecent } from '@/composables/usePreferences'
import { useToolSearch } from '@/composables/useToolSearch'
import { APP_CATEGORY, findTool, searchTools, toolsOfCategory, TOOLS, UTILITY_CATEGORIES, type ToolMeta } from '@/tools/registry'

const { query, requestSearchFocus } = useToolSearch()
const { favorites } = useFavorites()
const { recent, clearRecent } = useRecent()
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)
const FEATURES = [`${TOOLS.length} 个工具`, '本地运算不上传', '深色模式'] as const

const resolve = (ids: readonly string[]): ToolMeta[] =>
  ids.map(findTool).filter((tool): tool is ToolMeta => tool !== undefined)

const favoriteTools = computed(() => resolve(favorites.value))
const recentTools = computed(() => resolve(recent.value))
const apps = toolsOfCategory(APP_CATEGORY.id)
const isSearching = computed(() => query.value.trim() !== '')
const searchResults = computed(() => (isSearching.value ? searchTools(query.value) : []))
</script>

<template>
  <div class="mx-auto flex max-w-[1080px] flex-col gap-[clamp(34px,6vw,56px)]">
    <!-- 主视觉：彩色 CTA，渐变 + 模糊光斑，毛玻璃标签放在光斑之上 -->
    <section
      class="relative isolate overflow-hidden rounded-hero bg-[image:var(--grad-cta)] px-[clamp(24px,5vw,52px)] py-[clamp(32px,6vw,60px)] text-white shadow-cta"
    >
      <div class="absolute -top-24 -right-12 -z-10 size-80 rounded-full bg-white/18 blur-[46px]" aria-hidden="true" />
      <div class="absolute -bottom-28 left-[12%] -z-10 size-60 rounded-full bg-[rgba(120,80,255,0.5)] blur-[50px]" aria-hidden="true" />
      <div class="absolute top-1/3 right-[18%] -z-10 size-40 rounded-full bg-[rgba(90,200,250,0.35)] blur-[44px]" aria-hidden="true" />

      <p class="text-[12px] font-semibold tracking-[0.14em] text-white/70">BYTEGREP TOOL</p>
      <h1 class="mt-3.5 text-[clamp(32px,6vw,52px)] leading-[1.06] font-bold tracking-[-0.03em]">开发者工具箱</h1>
      <p class="mt-4 max-w-[560px] text-[clamp(15px,2.5vw,18px)] leading-[1.6] text-white/82">
        编解码、加密、格式化与生成器。所有计算都在浏览器本地完成，数据不离开你的设备。
      </p>
      <div class="mt-7 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          class="btn h-11 bg-white px-5 text-[15px] font-semibold text-accent-link shadow-[0_8px_24px_rgba(0,0,0,0.14)] hover:bg-white/90"
          @click="requestSearchFocus"
        >
          <AppIcon name="search" :size="17" />
          搜索工具
          <kbd class="ml-1 font-sans text-[12px] font-medium opacity-60 pointer-coarse:hidden">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
        </button>
        <span v-for="feature in FEATURES" :key="feature" class="glass-chip inline-flex h-9 items-center rounded-pill px-4 text-[13px] font-[550]">
          {{ feature }}
        </span>
      </div>
    </section>

    <section v-if="isSearching" aria-labelledby="search-heading" class="flex flex-col gap-4">
      <h2 id="search-heading" class="text-[clamp(20px,3.4vw,26px)] leading-tight font-bold tracking-[-0.02em]">
        “{{ query }}”的搜索结果
        <span class="ml-1 text-[15px] font-medium tracking-normal text-ink-3 tabular-nums">{{ searchResults.length }}</span>
      </h2>
      <ToolList v-if="searchResults.length" :tools="searchResults" />
      <p v-else class="text-ink-2">没有匹配的工具，换个关键词试试。</p>
    </section>

    <template v-else>
      <section v-if="favoriteTools.length" aria-labelledby="fav-heading" class="flex flex-col gap-4">
        <h2 id="fav-heading" class="text-[clamp(20px,3.4vw,26px)] leading-tight font-bold tracking-[-0.02em]">收藏</h2>
        <ToolList :tools="favoriteTools" />
      </section>

      <section v-if="recentTools.length" aria-labelledby="recent-heading" class="-mt-[clamp(12px,3vw,24px)] flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <h2 id="recent-heading" class="text-[13px] font-semibold text-ink-3">最近使用</h2>
          <button type="button" class="btn btn-ghost btn-sm text-ink-2" @click="clearRecent">清除</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="tool in recentTools"
            :key="tool.id"
            :to="{ name: 'tool', params: { id: tool.id } }"
            class="btn btn-sm bg-surface font-medium text-ink-body shadow-card hover:bg-surface hover:text-accent-link"
          >
            {{ tool.name }}
          </RouterLink>
        </div>
      </section>

      <!-- 大工具：独立的大卡片，与下方小工具的统一面板区分开 -->
      <section v-if="apps.length" aria-labelledby="cat-app" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="cat-app" class="text-[clamp(20px,3.4vw,26px)] leading-tight font-bold tracking-[-0.02em]">{{ APP_CATEGORY.name }}</h2>
          <p class="text-[14px] text-ink-3">{{ APP_CATEGORY.description }}</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <RouterLink
            v-for="tool in apps"
            :key="tool.id"
            :to="{ name: 'tool', params: { id: tool.id } }"
            class="group flex items-center gap-4 rounded-panel bg-surface p-[clamp(18px,3vw,24px)] shadow-panel transition-[box-shadow,transform] duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
          >
            <ToolIcon :badge="tool.badge" size="lg" />
            <span class="min-w-0 flex-1">
              <span class="block text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink transition-colors duration-150 group-hover:text-accent-link">
                {{ tool.name }}
              </span>
              <span class="mt-1 line-clamp-2 text-[13.5px] leading-snug text-ink-2">{{ tool.description }}</span>
            </span>
            <AppIcon name="chevron-right" :size="18" class="text-ink-4 transition-colors duration-150 group-hover:text-accent-link" />
          </RouterLink>
        </div>
      </section>

      <section v-for="category in UTILITY_CATEGORIES" :key="category.id" :aria-labelledby="`cat-${category.id}`" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 :id="`cat-${category.id}`" class="text-[clamp(20px,3.4vw,26px)] leading-tight font-bold tracking-[-0.02em]">
            {{ category.name }}
          </h2>
          <p class="text-[14px] text-ink-3">{{ category.description }}</p>
        </div>
        <ToolList :tools="toolsOfCategory(category.id)" />
      </section>
    </template>
  </div>
</template>
