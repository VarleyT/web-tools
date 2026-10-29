import { describe, expect, it } from 'vitest'
import { nextTypewriterStep, type TypewriterState, type TypewriterTiming } from './typewriter'

const TIMING: TypewriterTiming = { type: 10, erase: 5, hold: 100, pause: 50 }

/** 从初始状态连续执行 n 步，返回每一步的长度与延迟 */
const run = (total: number, steps: number): Array<[number, number]> => {
  let state: TypewriterState = { length: 0, isDeleting: false }
  return Array.from({ length: steps }, () => {
    const step = nextTypewriterStep(state, total, TIMING)
    state = step.state
    return [step.state.length, step.delay]
  })
}

describe('nextTypewriterStep', () => {
  it('types one character at a time and holds when complete', () => {
    expect(run(3, 3)).toEqual([
      [1, 10],
      [2, 10],
      [3, 100],
    ])
  })

  it('erases after holding and pauses when empty', () => {
    expect(run(3, 6).slice(3)).toEqual([
      [2, 5],
      [1, 5],
      [0, 50],
    ])
  })

  it('loops back to typing after erasing', () => {
    expect(run(2, 6)).toEqual([
      [1, 10],
      [2, 100],
      [1, 5],
      [0, 50],
      [1, 10],
      [2, 100],
    ])
  })

  it('does not mutate the given state', () => {
    const state: TypewriterState = Object.freeze({ length: 1, isDeleting: false })
    expect(nextTypewriterStep(state, 3, TIMING).state).toEqual({ length: 2, isDeleting: false })
    expect(state).toEqual({ length: 1, isDeleting: false })
  })

  it('stays within bounds for empty text', () => {
    expect(run(0, 4).map(([length]) => length)).toEqual([0, 0, 0, 0])
  })
})
