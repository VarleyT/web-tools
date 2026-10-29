/** 打字机各阶段的等待时长（毫秒） */
export interface TypewriterTiming {
  /** 逐字输入的间隔 */
  type: number
  /** 逐字删除的间隔 */
  erase: number
  /** 输入完整后停留多久再开始删除 */
  hold: number
  /** 删空后停留多久再重新输入 */
  pause: number
}

export interface TypewriterState {
  /** 当前显示的字符数 */
  length: number
  isDeleting: boolean
}

export interface TypewriterStep {
  state: TypewriterState
  /** 距离下一步的等待时长 */
  delay: number
}

/** 推进一步：输入满则转为删除，删空则转为输入，循环往复 */
export function nextTypewriterStep({ length, isDeleting }: TypewriterState, total: number, timing: TypewriterTiming): TypewriterStep {
  const deleting = isDeleting ? length > 0 : length >= total
  const next = Math.min(total, Math.max(0, length + (deleting ? -1 : 1)))
  const delay = deleting ? (next === 0 ? timing.pause : timing.erase) : next === total ? timing.hold : timing.type
  return { state: { length: next, isDeleting: deleting }, delay }
}
