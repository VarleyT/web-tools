/**
 * Web Serial API 最小类型声明（WICG 草案，TypeScript lib.dom 尚未收录）。
 * 仅声明本项目用到的成员，见 https://wicg.github.io/serial/
 */

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: 'none' | 'even' | 'odd'
  bufferSize?: number
  flowControl?: 'none' | 'hardware'
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean
  requestToSend?: boolean
  break?: boolean
}

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
  setSignals(signals: SerialOutputSignals): Promise<void>
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>
  requestPort(options?: { filters?: SerialPortInfo[] }): Promise<SerialPort>
}

interface Navigator {
  /** 仅 Chromium 内核的桌面浏览器提供，且要求安全上下文 */
  readonly serial?: Serial
}
