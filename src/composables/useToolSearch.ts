import { ref } from 'vue'

const query = ref('')
// 每次请求聚焦搜索框时递增，布局组件监听后执行聚焦
const focusRequest = ref(0)

/** 侧边栏与首页共享的搜索关键词与聚焦请求 */
export function useToolSearch() {
  const requestSearchFocus = (): void => {
    focusRequest.value++
  }
  return { query, focusRequest, requestSearchFocus }
}
