import { useColorMode, useStorage } from '@vueuse/core'
import { computed } from 'vue'

const STORAGE_PREFIX = 'bytegrep:'
const MAX_RECENT = 8

const favorites = useStorage<string[]>(`${STORAGE_PREFIX}favorites`, [])
const recent = useStorage<string[]>(`${STORAGE_PREFIX}recent`, [])

export function useFavorites() {
  const isFavorite = (id: string): boolean => favorites.value.includes(id)
  const toggleFavorite = (id: string): void => {
    favorites.value = isFavorite(id) ? favorites.value.filter((item) => item !== id) : [...favorites.value, id]
  }
  return { favorites: computed(() => favorites.value), isFavorite, toggleFavorite }
}

export function useRecent() {
  const recordRecent = (id: string): void => {
    recent.value = [id, ...recent.value.filter((item) => item !== id)].slice(0, MAX_RECENT)
  }
  const clearRecent = (): void => {
    recent.value = []
  }
  return { recent: computed(() => recent.value), recordRecent, clearRecent }
}

export type ThemeMode = 'auto' | 'light' | 'dark'

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }

export function useTheme() {
  // 与 index.html 中的首屏脚本共用同一存储键
  const mode = useColorMode({ storageKey: `${STORAGE_PREFIX}theme`, emitAuto: true })
  const theme = computed(() => mode.store.value as ThemeMode)
  const cycleTheme = (): void => {
    mode.store.value = THEME_CYCLE[theme.value] ?? 'auto'
  }
  return { theme, cycleTheme }
}
