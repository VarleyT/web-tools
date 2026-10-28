<script setup lang="ts">
import { format, type KeywordCase, type SqlLanguage } from 'sql-formatter'
import ErrorAlert from '@/components/ErrorAlert.vue'
import OptionGroup from '@/components/OptionGroup.vue'
import TextPanel from '@/components/TextPanel.vue'
import { useSafeComputed } from '@/composables/useSafeComputed'
import { useToolState } from '@/composables/useToolState'

const DIALECTS: ReadonlyArray<{ label: string; value: SqlLanguage }> = [
  { label: '标准 SQL', value: 'sql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'MariaDB', value: 'mariadb' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'SQL Server (T-SQL)', value: 'tsql' },
  { label: 'Oracle (PL/SQL)', value: 'plsql' },
  { label: 'ClickHouse', value: 'clickhouse' },
  { label: 'BigQuery', value: 'bigquery' },
  { label: 'Hive', value: 'hive' },
  { label: 'Spark', value: 'spark' },
]

const SAMPLE = "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.created_at > '2024-01-01' group by u.id, u.name having count(o.id) > 3 order by orders desc limit 10;"

const input = useToolState('sql', 'input', '')
const dialect = useToolState<SqlLanguage>('sql', 'dialect', 'mysql')
const keywordCase = useToolState<KeywordCase>('sql', 'keywordCase', 'upper')
const tabWidth = useToolState<2 | 4>('sql', 'tabWidth', 2)

const { value: output, error } = useSafeComputed(() => {
  if (input.value.trim() === '') return ''
  return format(input.value, { language: dialect.value, keywordCase: keywordCase.value, tabWidth: tabWidth.value })
}, '')
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="dialect" class="input w-48" aria-label="SQL 方言">
        <option v-for="item in DIALECTS" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <OptionGroup
        v-model="keywordCase"
        aria-label="关键字大小写"
        :options="[
          { label: '大写', value: 'upper' },
          { label: '小写', value: 'lower' },
          { label: '保持', value: 'preserve' },
        ]"
      />
      <OptionGroup
        v-model="tabWidth"
        aria-label="缩进"
        :options="[
          { label: '2 空格', value: 2 },
          { label: '4 空格', value: 4 },
        ]"
      />
      <button type="button" class="btn ml-auto" @click="input = SAMPLE">示例</button>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <TextPanel v-model="input" label="SQL" :rows="20" placeholder="粘贴 SQL 语句" :invalid="!!error" />
      <TextPanel :model-value="output" label="格式化结果" readonly :rows="20" />
    </div>
    <ErrorAlert :message="error" />
  </div>
</template>
