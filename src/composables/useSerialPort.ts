import { useEventListener } from '@vueuse/core'
import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { applySoftwareFlow, describePort, toSerialOptions, type SerialConfig } from '@/lib/serial'
import { errorMessage } from './useSafeComputed'

export type PortStatus = 'closed' | 'opening' | 'open' | 'closing'

const READ_BUFFER_SIZE = 4096
/** 关闭时等待未完成写入的上限：硬件流控阻塞（CTS 拉低）时写入可能永不返回 */
const WRITE_DRAIN_TIMEOUT_MS = 500
/** 线路错误：浏览器会重建读流，可继续读取 */
const RECOVERABLE_READ_ERRORS = new Set(['BreakError', 'FramingError', 'ParityError', 'BufferOverrunError'])

const isDomError = (caught: unknown, name: string): boolean => caught instanceof DOMException && caught.name === name
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function openErrorMessage(caught: unknown): string {
  if (isDomError(caught, 'InvalidStateError')) return '串口已处于打开状态'
  if (isDomError(caught, 'NetworkError')) return '无法打开串口：可能已被其他程序占用，或设备已断开'
  return `无法打开串口：${errorMessage(caught)}`
}

/**
 * 封装 Web Serial：选择端口、打开 / 关闭、持续读取与串行写入。
 * 读到的数据通过 onData 回调交给调用方；离开作用域时自动关闭串口。
 */
export function useSerialPort(onData: (bytes: Uint8Array) => void) {
  const serial = navigator.serial
  const isSupported = serial !== undefined
  const status = ref<PortStatus>('closed')
  const error = ref('')
  const port = shallowRef<SerialPort | null>(null)
  const portLabel = computed(() => (port.value ? describePort(port.value.getInfo()) : ''))
  /** 软件流控下收到 XOFF：暂停发送，直到收到 XON */
  const isFlowPaused = ref(false)

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  let readLoop: Promise<void> = Promise.resolve()
  let writeQueue: Promise<void> = Promise.resolve()
  let isPicking = false
  /** 打开期间设备被拔出：关闭后需要清掉失效的端口 */
  let isDisconnected = false
  let isDisposed = false
  let useSoftwareFlow = false
  let resumeWriters: Array<() => void> = []

  if (serial) {
    // 只有一个已授权端口时直接选中，免去每次弹窗；失败不影响手动选择
    serial
      .getPorts()
      .then((ports) => {
        if (!port.value && ports.length === 1) port.value = ports[0]
      })
      .catch(() => undefined)
    useEventListener(serial, 'disconnect', (event: Event) => {
      if (event.target !== port.value) return
      if (status.value === 'closed') port.value = null
      else isDisconnected = true
    })
  }

  /** 弹出浏览器的端口选择框；用户取消时返回 null */
  async function pickPort(): Promise<SerialPort | null> {
    if (!serial || isPicking) return null
    isPicking = true
    try {
      return await serial.requestPort()
    } catch (caught) {
      if (!isDomError(caught, 'NotFoundError')) error.value = errorMessage(caught)
      return null
    } finally {
      isPicking = false
    }
  }

  async function choosePort(): Promise<void> {
    if (status.value !== 'closed') return
    error.value = ''
    const picked = await pickPort()
    if (picked && status.value === 'closed') port.value = picked
  }

  function setFlowPaused(paused: boolean): void {
    isFlowPaused.value = paused
    if (paused) return
    const waiting = resumeWriters
    resumeWriters = []
    for (const resume of waiting) resume()
  }

  function receive(bytes: Uint8Array): void {
    if (!useSoftwareFlow) {
      onData(bytes)
      return
    }
    const { data, paused } = applySoftwareFlow(bytes, isFlowPaused.value)
    if (paused !== isFlowPaused.value) setFlowPaused(paused)
    if (data.length) onData(data)
  }

  function markClosed(): void {
    status.value = 'closed'
    if (isDisconnected) port.value = null
    isDisconnected = false
  }

  async function release(target: SerialPort): Promise<void> {
    // 唤醒等待 XON 的写入：此时状态已是 closing，它们会因串口未打开而失败退出
    setFlowPaused(false)
    // 写入被流控卡住时中止它，否则 close() 会因写流仍被锁定而失败
    await Promise.race([writeQueue, delay(WRITE_DRAIN_TIMEOUT_MS)])
    try {
      await writer?.abort()
    } catch {
      // 写流已出错时 abort 会拒绝，随后照常关闭
    }
    await writeQueue
    try {
      await target.close()
    } catch (caught) {
      error.value ||= `关闭串口失败：${errorMessage(caught)}`
    }
  }

  async function readUntilClosed(target: SerialPort): Promise<void> {
    while (status.value === 'open' && target.readable) {
      const current = target.readable.getReader()
      reader = current
      try {
        for (;;) {
          const { value, done } = await current.read()
          if (done) break
          if (value) receive(value)
        }
      } catch (caught) {
        if (status.value === 'open') {
          const name = caught instanceof DOMException ? caught.name : ''
          error.value = RECOVERABLE_READ_ERRORS.has(name) ? `线路错误（${name}），已继续接收` : '设备已断开连接'
        }
      } finally {
        current.releaseLock()
        reader = null
      }
    }
    // 设备被拔出等致命错误：读流不再可用，自动收尾
    if (status.value === 'open') {
      status.value = 'closing'
      await release(target)
      markClosed()
    }
  }

  async function open(config: SerialConfig): Promise<void> {
    if (status.value !== 'closed') return
    error.value = ''
    let options: SerialOptions
    try {
      options = toSerialOptions(config)
    } catch (caught) {
      error.value = errorMessage(caught)
      return
    }
    // 先占住状态，避免选择框打开期间再次点击触发第二次 open
    status.value = 'opening'
    const target = port.value ?? (await pickPort())
    if (!target) {
      status.value = 'closed'
      return
    }
    port.value = target
    useSoftwareFlow = config.flowControl === 'software'
    try {
      await target.open({ ...options, bufferSize: READ_BUFFER_SIZE })
    } catch (caught) {
      status.value = 'closed'
      error.value = openErrorMessage(caught)
      return
    }
    // 打开过程中页面已离开：直接关掉，避免端口一直被占用
    if (isDisposed) {
      await target.close().catch(() => undefined)
      status.value = 'closed'
      return
    }
    status.value = 'open'
    readLoop = readUntilClosed(target)
  }

  async function close(): Promise<void> {
    const target = port.value
    if (status.value !== 'open' || !target) return
    status.value = 'closing'
    try {
      await reader?.cancel()
    } catch {
      // 读流已出错时 cancel 会拒绝，随后照常关闭
    }
    await readLoop
    await release(target)
    markClosed()
  }

  async function writeNow(bytes: Uint8Array, onDispatch?: () => void): Promise<void> {
    if (isFlowPaused.value) await new Promise<void>((resolve) => resumeWriters.push(resolve))
    const writable = port.value?.writable
    if (status.value !== 'open' || !writable) throw new Error('串口未打开')
    const current = writable.getWriter()
    writer = current
    try {
      onDispatch?.()
      await current.write(bytes)
    } finally {
      current.releaseLock()
      writer = null
    }
  }

  /**
   * 写入排队执行：写锁同一时间只能被一个 writer 持有。
   * onDispatch 在数据真正交给写流前调用（排队、等待 XON 之后），用于记录发送日志
   */
  function write(bytes: Uint8Array, onDispatch?: () => void): Promise<void> {
    const task = writeQueue.then(() => writeNow(bytes, onDispatch))
    writeQueue = task.catch(() => undefined)
    return task
  }

  async function setSignals(signals: SerialOutputSignals): Promise<void> {
    if (status.value !== 'open' || !port.value) return
    try {
      await port.value.setSignals(signals)
    } catch (caught) {
      error.value = `设置控制信号失败：${errorMessage(caught)}`
    }
  }

  onScopeDispose(() => {
    isDisposed = true
    void close()
  })

  return { isSupported, status, error, portLabel, isFlowPaused, choosePort, open, close, write, setSignals }
}
