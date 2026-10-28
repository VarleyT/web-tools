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
    /** 不自动换行（如 PEM 密钥，按原始行显示） */
    nowrap?: boolean
  }>(),
  { rows: 12, placeholder: '' },
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <div class="flex min-h-[30px] items-center justify-between gap-2 px-1">
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
      :class="{ 'field-invalid': invalid }"
      :rows="rows"
      :readonly="readonly"
      :placeholder="placeholder"
      :aria-label="label"
      :aria-invalid="invalid || undefined"
      :wrap="nowrap ? 'off' : 'soft'"
      spellcheck="false"
      autocomplete="off"
    />
  </div>
</template>
