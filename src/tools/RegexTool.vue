<script setup lang="ts">
import { computed } from 'vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useRegexRunner } from '@/composables/useRegexRunner'
import { useToolState } from '@/composables/useToolState'
import { MAX_MATCHES, REGEX_PRESETS } from '@/lib/regex'

const FLAGS = [
  { flag: 'g', label: '全局' },
  { flag: 'i', label: '忽略大小写' },
  { flag: 'm', label: '多行' },
  { flag: 's', label: '. 匹配换行' },
  { flag: 'u', label: 'Unicode' },
  { flag: 'y', label: '粘连' },
] as const
const MAX_LISTED_MATCHES = 200

const pattern = useToolState('regex', 'pattern', '')
const flags = useToolState('regex', 'flags', 'g')
const text = useToolState('regex', 'text', '')
const replacement = useToolState('regex', 'replacement', '')

function toggleFlag(flag: string): void {
  const enabled = new Set(flags.value)
  if (enabled.has(flag)) enabled.delete(flag)
  else enabled.add(flag)
  flags.value = FLAGS.map((item) => item.flag)
    .filter((item) => enabled.has(item))
    .join('')
}

const { matches, replaced, matchedText, error } = useRegexRunner(() => ({
  pattern: pattern.value,
  flags: flags.value,
  text: text.value,
  replacement: replacement.value,
}))

const emptyMatchCount = computed(() => matches.value.filter((match) => match.value === '').length)
const isTruncated = computed(() => matches.value.length >= MAX_MATCHES)

interface Segment {
  start: number
  value: string
  isMatch: boolean
}

/** 将原文切成普通片段与匹配片段，用于高亮渲染 */
const segments = computed<Segment[]>(() => {
  const source = matchedText.value
  const result: Segment[] = []
  let cursor = 0
  for (const match of matches.value) {
    if (match.value === '' || match.index < cursor) continue
    if (match.index > cursor) result.push({ start: cursor, value: source.slice(cursor, match.index), isMatch: false })
    result.push({ start: match.index, value: match.value, isMatch: true })
    cursor = match.index + match.value.length
  }
  if (cursor < source.length) result.push({ start: cursor, value: source.slice(cursor), isMatch: false })
  return result
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="card flex flex-col gap-3">
      <div class="flex items-center gap-2 font-mono">
        <span class="text-lg text-slate-400">/</span>
        <input v-model="pattern" class="input font-mono" placeholder="正则表达式，如 (\w+)@(\w+)\.com" aria-label="正则表达式" />
        <span class="text-lg text-slate-400">/{{ flags }}</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in FLAGS"
          :key="item.flag"
          type="button"
          class="btn btn-sm"
          :class="{ '!border-indigo-500 !text-indigo-600 dark:!text-indigo-300': flags.includes(item.flag) }"
          :aria-pressed="flags.includes(item.flag)"
          @click="toggleFlag(item.flag)"
        >
          <code>{{ item.flag }}</code> {{ item.label }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="label">常用：</span>
        <button v-for="preset in REGEX_PRESETS" :key="preset.label" type="button" class="btn btn-sm" @click="pattern = preset.pattern">
          {{ preset.label }}
        </button>
      </div>
      <ErrorAlert :message="error" />
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="text" label="测试文本" :rows="12" />
      <div class="flex min-w-0 flex-col gap-1.5">
        <div class="flex min-h-7 items-center">
          <span class="label">
            匹配高亮（{{ isTruncated ? `仅统计前 ${MAX_MATCHES}` : matches.length }} 处<template v-if="emptyMatchCount"
              >，其中 {{ emptyMatchCount }} 处为空匹配，不高亮</template
            >）
          </span>
        </div>
        <div class="textarea min-h-40 flex-1 overflow-auto break-all whitespace-pre-wrap" aria-live="polite">
          <template v-for="segment in segments" :key="segment.start">
            <mark v-if="segment.isMatch" class="rounded-sm bg-amber-200 text-inherit dark:bg-amber-400/30">{{ segment.value }}</mark>
            <span v-else>{{ segment.value }}</span>
          </template>
        </div>
      </div>
    </div>

    <section v-if="matches.length" class="card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="label">
          <tr>
            <th class="py-1 pr-4 font-medium">#</th>
            <th class="py-1 pr-4 font-medium">位置</th>
            <th class="py-1 pr-4 font-medium">匹配</th>
            <th class="py-1 font-medium">分组</th>
          </tr>
        </thead>
        <tbody class="mono">
          <tr
            v-for="(match, order) in matches.slice(0, MAX_LISTED_MATCHES)"
            :key="match.index"
            class="border-t border-slate-100 dark:border-slate-800"
          >
            <td class="py-1 pr-4 text-slate-400">{{ order + 1 }}</td>
            <td class="py-1 pr-4">{{ match.index }}</td>
            <td class="py-1 pr-4 break-all">{{ match.value }}</td>
            <td class="py-1 break-all text-slate-500">{{ match.groups.map((group, i) => `$${i + 1}=${group ?? ''}`).join('  ') }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="matches.length > MAX_LISTED_MATCHES" class="mt-2 text-xs text-slate-400">
        表格仅列出前 {{ MAX_LISTED_MATCHES }} 条匹配
      </p>
    </section>

    <section class="card flex flex-col gap-3">
      <h2 class="font-semibold">替换</h2>
      <input v-model="replacement" class="input font-mono" placeholder="替换为，支持 $1 $<name> $&" aria-label="替换文本" />
      <TextPanel :model-value="replaced" label="替换结果" readonly :rows="6" />
    </section>
  </div>
</template>
