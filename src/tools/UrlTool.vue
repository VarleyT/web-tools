<script setup lang="ts">
import { ref } from 'vue'
import CodecTool from '@/components/CodecTool.vue'
import CopyRow from '@/components/CopyRow.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'
import { urlDecode, urlEncode, type UrlEncodeMode } from '@/lib/encoding'

const encodeMode = useToolState<UrlEncodeMode>('url', 'encodeMode', 'component')
const plusAsSpace = useToolState('url', 'plusAsSpace', false)
// URL 常在查询参数中携带 token，不写入本地存储
const parseInput = ref('')

const encode = (text: string): string => urlEncode(text, encodeMode.value)
const decode = (text: string): string => urlDecode(text, plusAsSpace.value)

interface ParsedUrl {
  fields: Array<{ label: string; value: string }>
  params: Array<{ key: string; value: string; id: number }>
}

const { value: parsed, error: parseError } = useSafeComputed<ParsedUrl | null>(() => {
  const text = parseInput.value.trim()
  if (!text) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new Error('不是合法的绝对 URL（需包含协议，如 https://）')
  }
  return {
    fields: [
      { label: 'origin', value: url.origin },
      { label: 'protocol', value: url.protocol },
      { label: 'host', value: url.host },
      { label: 'port', value: url.port },
      { label: 'pathname', value: url.pathname },
      { label: 'search', value: url.search },
      { label: 'hash', value: url.hash },
    ],
    params: [...url.searchParams].map(([key, value], id) => ({ key, value, id })),
  }
}, null)
</script>

<template>
  <div class="flex flex-col gap-6">
    <CodecTool tool-id="url" :encode="encode" :decode="decode" :remember-input="false">
      <template #options="{ mode }">
        <OptionGroup
          v-if="mode === 'encode'"
          v-model="encodeMode"
          aria-label="编码方式"
          :options="[
            { label: 'Component', value: 'component' },
            { label: 'URI', value: 'uri' },
            { label: '全部字符', value: 'all' },
          ]"
        />
        <label v-else class="checkbox-label">
          <input v-model="plusAsSpace" type="checkbox" />
          “+” 视为空格
        </label>
      </template>
    </CodecTool>

    <section class="card flex flex-col gap-3">
      <h2 class="font-semibold">URL 解析</h2>
      <input
        v-model="parseInput"
        class="input font-mono"
        placeholder="https://example.com:8080/path?a=1&b=中文#top"
        aria-label="待解析的 URL"
      />
      <ErrorAlert :message="parseError" />
      <div v-if="parsed" class="grid gap-6 lg:grid-cols-2">
        <div>
          <CopyRow v-for="field in parsed.fields" :key="field.label" :label="field.label" :value="field.value" />
        </div>
        <div>
          <p class="label mb-1">查询参数（{{ parsed.params.length }}）</p>
          <CopyRow v-for="param in parsed.params" :key="param.id" :label="param.key" :value="param.value" />
        </div>
      </div>
    </section>
  </div>
</template>
