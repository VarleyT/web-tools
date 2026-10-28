import { useStorage, type RemovableRef } from '@vueuse/core'

/**
 * 按工具持久化输入与选项，刷新页面后保留。
 * 注意：密钥、令牌、密码等敏感字段不要使用此函数。
 *
 * 不传泛型时按 string / number / boolean 推断；需要字面量联合类型时显式传入泛型。
 */
export function useToolState(toolId: string, field: string, initial: string): RemovableRef<string>
export function useToolState(toolId: string, field: string, initial: number): RemovableRef<number>
export function useToolState(toolId: string, field: string, initial: boolean): RemovableRef<boolean>
export function useToolState<T extends string | number>(toolId: string, field: string, initial: NoInfer<T>): RemovableRef<T>
export function useToolState<T extends string | number | boolean>(toolId: string, field: string, initial: T): RemovableRef<T> {
  return useStorage<T>(`bytegrep:tool:${toolId}:${field}`, initial)
}
