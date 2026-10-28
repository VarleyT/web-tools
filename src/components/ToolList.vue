<script setup lang="ts">
import type { ToolMeta } from '@/tools/registry'
import ToolRow from './ToolRow.vue'

defineProps<{ tools: readonly ToolMeta[] }>()
</script>

<template>
  <!--
    统一面板：同类工具放在一个白色面板中，用发丝线分隔，而不是一张张独立卡片。
    每个格子只画上、左两条线，网格整体向左上偏移 1px，由面板裁掉最外圈。
  -->
  <div class="overflow-hidden rounded-panel bg-surface shadow-panel">
    <div class="-mt-px -ml-px grid w-[calc(100%+1px)] sm:grid-cols-2 xl:grid-cols-3">
      <ToolRow v-for="tool in tools" :key="tool.id" :tool="tool" class="shadow-[inset_1px_1px_0_var(--hairline)]" />
    </div>
  </div>
</template>
