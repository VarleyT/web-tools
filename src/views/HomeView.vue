<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ToolCard from '@/components/ToolCard.vue'
import { useFavorites, useRecent } from '@/composables/usePreferences'
import { useToolSearch } from '@/composables/useToolSearch'
import { CATEGORIES, findTool, searchTools, toolsOfCategory, TOOLS, type ToolMeta } from '@/tools/registry'

const { query } = useToolSearch()
const { favorites } = useFavorites()
const { recent, clearRecent } = useRecent()

const resolve = (ids: readonly string[]): ToolMeta[] =>
  ids.map(findTool).filter((tool): tool is ToolMeta => tool !== undefined)

const favoriteTools = computed(() => resolve(favorites.value))
const recentTools = computed(() => resolve(recent.value))
const isSearching = computed(() => query.value.trim() !== '')
const searchResults = computed(() => (isSearching.value ? searchTools(query.value) : []))
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <section
      class="relative mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-8 dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(99_102_241/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.07)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
        aria-hidden="true"
      />
      <p class="font-mono text-xs tracking-widest text-indigo-500 uppercase">$ grep --tools</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">ByteGrep Tool</h1>
      <p class="mt-2 max-w-xl text-slate-500 dark:text-slate-400">
        开发者日常工具箱：编解码、加密、格式化、生成器。所有计算都在浏览器本地完成，数据不会上传。
      </p>
      <dl class="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm">
        <div>
          <dt class="text-slate-400">tools</dt>
          <dd class="text-xl font-semibold">{{ TOOLS.length }}</dd>
        </div>
        <div>
          <dt class="text-slate-400">categories</dt>
          <dd class="text-xl font-semibold">{{ CATEGORIES.length }}</dd>
        </div>
        <div>
          <dt class="text-slate-400">server</dt>
          <dd class="text-xl font-semibold">0</dd>
        </div>
      </dl>
    </section>

    <section v-if="isSearching" aria-labelledby="search-heading">
      <h2 id="search-heading" class="mb-3 text-sm font-semibold text-slate-500">
        搜索 “{{ query }}” · {{ searchResults.length }} 个结果
      </h2>
      <div v-if="searchResults.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ToolCard v-for="tool in searchResults" :key="tool.id" :tool="tool" />
      </div>
      <p v-else class="text-slate-400">没有匹配的工具，换个关键词试试。</p>
    </section>

    <template v-else>
      <section v-if="favoriteTools.length" class="mb-8" aria-labelledby="fav-heading">
        <h2 id="fav-heading" class="mb-3 text-sm font-semibold text-slate-500">★ 收藏</h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ToolCard v-for="tool in favoriteTools" :key="tool.id" :tool="tool" />
        </div>
      </section>

      <section v-if="recentTools.length" class="mb-8" aria-labelledby="recent-heading">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" class="text-sm font-semibold text-slate-500">最近使用</h2>
          <button type="button" class="btn btn-sm" @click="clearRecent">清除</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="tool in recentTools"
            :key="tool.id"
            :to="{ name: 'tool', params: { id: tool.id } }"
            class="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-indigo-300"
          >
            {{ tool.name }}
          </RouterLink>
        </div>
      </section>

      <section v-for="category in CATEGORIES" :key="category.id" class="mb-8" :aria-labelledby="`cat-${category.id}`">
        <div class="mb-3 flex flex-wrap items-baseline gap-x-3">
          <h2 :id="`cat-${category.id}`" class="text-lg font-semibold">{{ category.name }}</h2>
          <span class="text-sm text-slate-400">{{ category.description }}</span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ToolCard v-for="tool in toolsOfCategory(category.id)" :key="tool.id" :tool="tool" />
        </div>
      </section>
    </template>
  </div>
</template>
