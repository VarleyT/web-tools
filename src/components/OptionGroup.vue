<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T>({ required: true })

defineProps<{
  /** disabled 的选项置灰不可选，title 作为悬停说明 */
  options: ReadonlyArray<{ label: string; value: T; disabled?: boolean; title?: string }>
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
    <!-- 不可选项用 aria-disabled 而非 disabled：原生禁用按钮在部分浏览器中不显示 title 提示 -->
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :aria-disabled="option.disabled || undefined"
      :title="option.title"
      class="h-[30px] shrink-0 cursor-pointer rounded-pill px-3.5 text-[13px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-out-quart active:scale-[0.97] pointer-coarse:h-[38px]"
      :class="
        model === option.value
          ? 'bg-seg-thumb font-semibold text-ink shadow-thumb'
          : option.disabled
            ? 'cursor-not-allowed font-medium text-ink-4 line-through decoration-ink-4/60 active:scale-100'
            : 'font-medium text-ink-2 hover:text-ink'
      "
      @click="option.disabled || (model = option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
