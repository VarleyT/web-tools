<script setup lang="ts">
import { onKeyStroke, useMediaQuery, useScrollLock, useWindowScroll } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { useTheme, type ThemeMode } from '@/composables/usePreferences'
import { useToolSearch } from '@/composables/useToolSearch'
import { CATEGORIES, searchTools } from '@/tools/registry'

const SCROLL_EDGE_PX = 8
const THEME_OPTIONS: ReadonlyArray<{ label: string; value: ThemeMode }> = [
  { label: '自动', value: 'auto' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

const route = useRoute()
const router = useRouter()
const { query, focusRequest } = useToolSearch()
const { theme, setTheme } = useTheme()
const themeModel = computed<ThemeMode>({ get: () => theme.value, set: setTheme })

const searchInput = ref<HTMLInputElement>()
const sidebarOpen = ref(false)
// 与 Tailwind 的 lg 断点一致：桌面端侧边栏常驻，移动端关闭时不可聚焦
const isDesktop = useMediaQuery('(min-width: 1024px)')
const isSidebarHidden = computed(() => !isDesktop.value && !sidebarOpen.value)
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

// 吸顶栏只在内容滚到下方时显示分隔线
const { y: scrollY } = useWindowScroll()
const isScrolled = computed(() => scrollY.value > SCROLL_EDGE_PX)

// 移动端抽屉打开时锁定页面滚动
const isBodyLocked = useScrollLock(document.body)
watch([sidebarOpen, isDesktop], ([open, desktop]) => {
  isBodyLocked.value = open && !desktop
})

const results = computed(() => searchTools(query.value))
const groups = computed(() =>
  CATEGORIES.map((category) => ({
    category,
    tools: results.value.filter((tool) => tool.category === category.id),
  })).filter((group) => group.tools.length > 0),
)

async function focusSearch(): Promise<void> {
  if (!isDesktop.value) sidebarOpen.value = true
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

watch(focusRequest, focusSearch)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-dvh lg:flex">
    <header
      class="glass-nav sticky top-0 z-30 transition-shadow duration-300 lg:hidden"
      :class="{ 'shadow-[0_1px_0_var(--hairline),0_1px_12px_rgba(0,0,0,0.04)]': isScrolled }"
    >
      <div class="flex h-[54px] items-center gap-1 px-2">
        <button type="button" class="btn btn-ghost btn-icon" aria-label="打开导航" @click="sidebarOpen = true">
          <AppIcon name="menu" :size="20" />
        </button>
        <RouterLink to="/" class="flex items-center gap-2 px-1 text-[15px] font-[650] tracking-[-0.01em]">
          <BrandMark />
          ByteGrep Tool
        </RouterLink>
        <button type="button" class="btn btn-ghost btn-icon ml-auto" aria-label="搜索工具" @click="focusSearch">
          <AppIcon name="search" :size="20" />
        </button>
      </div>
    </header>

    <Transition
      enter-active-class="transition-opacity duration-250 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-out"
      leave-to-class="opacity-0"
    >
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-[var(--scrim)] lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <!-- 移动端：从左侧边缘滑出的抽屉；桌面端：常驻侧边栏，坐在页面底色上 -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[284px] max-w-[86vw] flex-col rounded-r-panel bg-surface shadow-overlay transition-transform ease-spring motion-reduce:transition-none lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:max-w-none lg:translate-x-0 lg:rounded-none lg:bg-transparent lg:shadow-[inset_-1px_0_0_var(--hairline)]"
      :class="sidebarOpen ? 'translate-x-0 duration-400' : '-translate-x-[calc(100%+96px)] duration-300'"
      :inert="isSidebarHidden || undefined"
      :aria-hidden="isSidebarHidden || undefined"
    >
      <div class="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
        <RouterLink to="/" class="flex items-center gap-2.5 text-[15px] font-[650] tracking-[-0.01em]">
          <BrandMark />
          ByteGrep Tool
        </RouterLink>
        <button type="button" class="btn btn-ghost btn-icon -mr-2 lg:hidden" aria-label="关闭导航" @click="sidebarOpen = false">
          <AppIcon name="x" :size="20" />
        </button>
      </div>

      <div class="px-3 pb-2">
        <div class="relative">
          <AppIcon name="search" :size="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            name="tool-search"
            class="input input-filled h-9 pr-14 pl-9"
            placeholder="搜索工具"
            aria-label="搜索工具"
            @keydown.enter="openFirstResult"
            @keydown.esc="query = ''"
          />
          <kbd
            class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-chip bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3 shadow-[inset_0_0_0_1px_var(--hairline)] pointer-coarse:hidden"
          >
            {{ isMac ? '⌘' : 'Ctrl' }} K
          </kbd>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="工具导航">
        <section v-for="group in groups" :key="group.category.id">
          <h2 class="px-3 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-indigo">{{ group.category.name }}</h2>
          <RouterLink
            v-for="tool in group.tools"
            :key="tool.id"
            :to="{ name: 'tool', params: { id: tool.id } }"
            class="flex h-9 items-center rounded-thumb px-3 text-[14px] text-ink-body transition-colors duration-150 hover:bg-fill pointer-coarse:h-11"
            active-class="!bg-accent/10 font-semibold !text-accent-link"
          >
            {{ tool.name }}
          </RouterLink>
        </section>
        <p v-if="groups.length === 0" class="px-3 pt-4 text-[13px] text-ink-3">没有匹配的工具</p>
      </nav>

      <footer class="flex flex-col gap-2.5 px-4 pt-3 pb-4 shadow-[inset_0_1px_0_var(--hairline)]">
        <OptionGroup v-model="themeModel" aria-label="外观" :options="THEME_OPTIONS" class="self-start" />
        <p class="px-1 text-[12px] text-ink-3">所有数据仅在浏览器本地处理</p>
      </footer>
    </aside>

    <main class="min-w-0 flex-1 px-[22px] pt-[clamp(20px,4vw,44px)] pb-20 lg:px-[clamp(28px,4vw,56px)]">
      <RouterView />
    </main>
  </div>
</template>
