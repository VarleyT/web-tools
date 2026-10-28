<script setup lang="ts">
import CopyButton from './CopyButton.vue'

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    label: string
    readonly?: boolean
    placeholder?: string
    rows?: number
    invalid?: boolean
  }>(),
  { rows: 12, placeholder: '' },
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <div class="flex min-h-7 items-center justify-between gap-2">
      <span class="label">{{ label }}</span>
      <div class="flex items-center gap-1.5">
        <slot name="actions" />
        <button v-if="!readonly && model" type="button" class="btn btn-sm" @click="model = ''">清空</button>
        <CopyButton :text="model" />
      </div>
    </div>
    <textarea
      v-model="model"
      class="textarea"
      :class="{
        'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60': invalid,
        'bg-slate-50 dark:bg-slate-950': readonly,
      }"
      :rows="rows"
      :readonly="readonly"
      :placeholder="placeholder"
      :aria-label="label"
      spellcheck="false"
      autocomplete="off"
    />
  </div>
</template>
