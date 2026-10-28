<script setup lang="ts">
import { onKeyStroke, useMediaQuery } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ToolIcon from '@/components/ToolIcon.vue'
import { useTheme, type ThemeMode } from '@/composables/usePreferences'
import { useToolSearch } from '@/composables/useToolSearch'
import { CATEGORIES, searchTools } from '@/tools/registry'

const THEME_LABELS: Record<ThemeMode, string> = { auto: '◐ 跟随系统', light: '☀ 浅色', dark: '☾ 深色' }

const route = useRoute()
const router = useRouter()
const { query } = useToolSearch()
const { theme, cycleTheme } = useTheme()

const searchInput = ref<HTMLInputElement>()
const sidebarOpen = ref(false)
// 与 Tailwind 的 lg 断点一致：桌面端侧边栏常驻，移动端关闭时不可聚焦
const isDesktop = useMediaQuery('(min-width: 1024px)')
const isSidebarHidden = computed(() => !isDesktop.value && !sidebarOpen.value)
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

const results = computed(() => searchTools(query.value))
const groups = computed(() =>
  CATEGORIES.map((category) => ({
    category,
    tools: results.value.filter((tool) => tool.category === category.id),
  })).filter((group) => group.tools.length > 0),
)

async function focusSearch(): Promise<void> {
  sidebarOpen.value = true
  // 等待移动端侧边栏移除 inert 后才能聚焦
  await nextTick()
  searchInput.value?.focus()
  searchInput.value?.select()
}

function openFirstResult(): void {
  const first = results.value[0]
  if (!first) return
  router.push({ name: 'tool', params: { id: first.id } })
  searchInput.value?.blur()
}

onKeyStroke('k', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  focusSearch()
})

onKeyStroke('Escape', () => {
  sidebarOpen.value = false
})

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-screen lg:flex">
    <header
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/85"
    >
      <button type="button" class="btn btn-sm" aria-label="打开导航" @click="sidebarOpen = true">☰</button>
      <RouterLink to="/" class="font-semibold">ByteGrep Tool</RouterLink>
      <button type="button" class="btn btn-sm ml-auto" @click="cycleTheme">{{ THEME_LABELS[theme] }}</button>
    </header>

    <Transition
      enter-active-class="transition-opacity"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity"
      leave-to-class="opacity-0"
    >
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      :inert="isSidebarHidden || undefined"
      :aria-hidden="isSidebarHidden || undefined"
    >
      <RouterLink to="/" class="group flex items-center gap-2.5 px-5 pt-5 pb-4">
        <svg class="size-8 transition-transform group-hover:-rotate-6" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" class="fill-indigo-600" />
          <path
            d="M9 11l-4 5 4 5M23 11l4 5-4 5M18 8l-4 16"
            stroke="#fff"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="text-[15px] tracking-tight"><b class="font-bold">ByteGrep</b> Tool</span>
      </RouterLink>

      <div class="px-4 pb-3">
        <div class="relative">
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            name="tool-search"
            class="input pr-16"
            placeholder="搜索工具…"
            aria-label="搜索工具"
            @keydown.enter="openFirstResult"
            @keydown.esc="query = ''"
          />
          <kbd
            class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800"
          >
            {{ isMac ? '⌘' : 'Ctrl' }} K
          </kbd>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="工具导航">
        <section v-for="group in groups" :key="group.category.id" class="mb-4">
          <h2 class="px-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {{ group.category.name }}
          </h2>
          <RouterLink
            v-for="tool in group.tools"
            :key="tool.id"
            :to="{ name: 'tool', params: { id: tool.id } }"
            class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            active-class="!bg-indigo-50 !text-indigo-700 font-medium dark:!bg-indigo-500/10 dark:!text-indigo-300"
          >
            <ToolIcon :badge="tool.badge" :category="tool.category" size="sm" />
            {{ tool.name }}
          </RouterLink>
        </section>
        <p v-if="groups.length === 0" class="px-2 text-sm text-slate-400">没有匹配的工具</p>
      </nav>

      <footer
        class="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-400 dark:border-slate-800"
      >
        <span>数据仅在浏览器本地处理</span>
        <button type="button" class="btn btn-sm hidden lg:inline-flex" @click="cycleTheme">{{ THEME_LABELS[theme] }}</button>
      </footer>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <RouterView />
    </main>
  </div>
</template>
