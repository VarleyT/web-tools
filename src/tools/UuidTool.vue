<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useToolState } from '@/composables/useToolState'
import { generateUuids, MAX_UUID_COUNT, type UuidVersion } from '@/lib/uuid'

const version = useToolState<UuidVersion>('uuid', 'version', 'v4')
const count = useToolState('uuid', 'count', 5)
const uppercase = useToolState('uuid', 'uppercase', false)
const hyphens = useToolState('uuid', 'hyphens', true)
const braces = useToolState('uuid', 'braces', false)

const uuids = ref<string[]>([])
const output = computed(() => uuids.value.join('\n'))

function generate(): void {
  uuids.value = generateUuids(version.value, count.value, {
    uppercase: uppercase.value,
    hyphens: hyphens.value,
    braces: braces.value,
  })
}

watch([version, count, uppercase, hyphens, braces], generate, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-4">
      <OptionGroup
        v-model="version"
        aria-label="UUID 版本"
        :options="[
          { label: 'v4 随机', value: 'v4' },
          { label: 'v7 时间有序', value: 'v7' },
        ]"
      />
      <label class="flex items-center gap-2 text-sm">
        数量
        <input v-model.number="count" type="number" min="1" :max="MAX_UUID_COUNT" class="input w-24" />
      </label>
      <label class="checkbox-label"><input v-model="uppercase" type="checkbox" /> 大写</label>
      <label class="checkbox-label"><input v-model="hyphens" type="checkbox" /> 连字符</label>
      <label class="checkbox-label"><input v-model="braces" type="checkbox" /> 花括号</label>
      <button type="button" class="btn btn-primary ml-auto" @click="generate">重新生成</button>
    </div>
    <TextPanel :model-value="output" :label="`结果（${uuids.length} 个）`" readonly :rows="16" />
  </div>
</template>
