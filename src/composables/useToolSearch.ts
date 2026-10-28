import { ref } from 'vue'

const query = ref('')

/** 侧边栏与首页共享的搜索关键词 */
export function useToolSearch() {
  return { query }
}
