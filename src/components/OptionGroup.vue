<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T>({ required: true })

defineProps<{
  options: ReadonlyArray<{ label: string; value: T }>
  ariaLabel?: string
}>()
</script>

<template>
  <!-- 分段控件：灰色轨道 + 白色滑块 -->
  <div
    class="inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-pill bg-fill p-[3px]"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      class="h-[30px] shrink-0 cursor-pointer rounded-pill px-3.5 text-[13px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-out-quart active:scale-[0.97] pointer-coarse:h-[38px]"
      :class="
        model === option.value
          ? 'bg-seg-thumb font-semibold text-ink shadow-thumb'
          : 'font-medium text-ink-2 hover:text-ink'
      "
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
