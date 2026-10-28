<script setup lang="ts">
import { computed } from 'vue'
import CopyRow from '@/components/CopyRow.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useToolState } from '@/composables/useToolState'
import { CASE_CONVERTERS, convertLines } from '@/lib/textCase'

const input = useToolState('text-case', 'input', 'getUserName')

const results = computed(() =>
  CASE_CONVERTERS.map((converter) => ({
    id: converter.id,
    label: converter.label,
    value: input.value ? convertLines(input.value, converter) : '',
  })),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <TextPanel v-model="input" label="输入（多行时逐行转换）" :rows="5" placeholder="user_name / UserName / user-name" />
    <section class="panel rows py-1.5">
      <CopyRow v-for="result in results" :key="result.id" :label="result.label" :value="result.value" />
    </section>
  </div>
</template>
