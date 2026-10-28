<script setup lang="ts">
import { computed } from 'vue'
import CopyRow from '@/components/CopyRow.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { hslToRgb, parseColor, rgbToHsl, toHex, toHslString, toRgbString, type Rgba } from '@/lib/color'

const SHADE_LIGHTNESS = [95, 85, 75, 65, 55, 45, 35, 25, 15] as const

const input = useToolState('color', 'input', '#0071e3')

const { value: color, error } = useSafeComputed<Rgba | null>(() => parseColor(input.value), null)

const opaqueHex = computed(() => (color.value ? toHex({ ...color.value, a: 1 }) : '#000000'))
const previewStyle = computed(() =>
  color.value ? { backgroundColor: `rgba(${color.value.r}, ${color.value.g}, ${color.value.b}, ${color.value.a})` } : {},
)

const formats = computed(() => {
  if (!color.value) return []
  const hex = toHex(color.value)
  return [
    { label: 'HEX', value: hex },
    { label: 'HEX 大写', value: hex.toUpperCase() },
    { label: 'RGB', value: toRgbString(color.value) },
    { label: 'HSL', value: toHslString(color.value) },
  ]
})

const shades = computed(() => {
  if (!color.value) return []
  const { h, s } = rgbToHsl(color.value)
  return SHADE_LIGHTNESS.map((l) => toHex(hslToRgb({ h, s, l, a: 1 })))
})

function onPick(event: Event): void {
  input.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="panel flex flex-col gap-4 md:flex-row">
      <div
        class="h-32 shrink-0 overflow-hidden rounded-card bg-[repeating-conic-gradient(var(--track)_0_25%,transparent_0_50%)] bg-[length:16px_16px] md:w-48"
      >
        <div class="size-full rounded-card shadow-[inset_0_0_0_1px_var(--hairline)]" :style="previewStyle" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div class="flex gap-2">
          <input
            v-model="input"
            class="input font-mono"
            placeholder="#0071e3 / rgb(0, 113, 227) / hsl(210, 100%, 45%)"
            aria-label="颜色值"
          />
          <input
            type="color"
            :value="opaqueHex"
            class="h-10 w-14 shrink-0 cursor-pointer rounded-thumb bg-transparent"
            aria-label="取色器"
            @input="onPick"
          />
        </div>
        <ErrorAlert :message="error" />
        <div class="rows">
          <CopyRow v-for="item in formats" :key="item.label" :label="item.label" :value="item.value" />
        </div>
      </div>
    </section>

    <section v-if="shades.length" class="panel">
      <h2 class="mb-3 font-semibold">明度色阶</h2>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-9">
        <button
          v-for="shade in shades"
          :key="shade"
          type="button"
          class="group flex cursor-pointer flex-col items-center gap-1"
          :title="`使用 ${shade}`"
          @click="input = shade"
        >
          <span
            class="h-12 w-full rounded-thumb shadow-[inset_0_0_0_1px_var(--hairline)] transition-transform duration-200 ease-out-quart group-hover:-translate-y-0.5"
            :style="{ backgroundColor: shade }"
          />
          <code class="text-[11px] text-ink-2">{{ shade }}</code>
        </button>
      </div>
    </section>
  </div>
</template>
