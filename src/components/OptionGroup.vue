<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T>({ required: true })

defineProps<{
  options: ReadonlyArray<{ label: string; value: T }>
  ariaLabel?: string
}>()
</script>

<template>
  <div
    class="inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      class="cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
      :class="
        model === option.value
          ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-600 dark:text-white'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
      "
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
