import { KEYS } from './constants.js'

export class Input {
  constructor() {
    this.down = new Set()
    this.pressed = new Set()
    this.gamepadDown = new Set()
    this.gamepadPressed = new Set()
    this.gamepadAxisX = 0
    this.gamepadAxisY = 0
    this.handlers = {
      keydown: (event) => this.onKeyDown(event),
      keyup: (event) => this.onKeyUp(event),
      blur: () => this.clear(),
    }

    window.addEventListener('keydown', this.handlers.keydown)
    window.addEventListener('keyup', this.handlers.keyup)
    window.addEventListener('blur', this.handlers.blur)
  }

  destroy() {
    window.removeEventListener('keydown', this.handlers.keydown)
    window.removeEventListener('keyup', this.handlers.keyup)
    window.removeEventListener('blur', this.handlers.blur)
  }

  clearFrame() {
    this.pressed.clear()
    this.gamepadPressed.clear()
  }

  clear() {
    this.down.clear()
    this.pressed.clear()
    this.gamepadDown.clear()
    this.gamepadPressed.clear()
    this.gamepadAxisX = 0
    this.gamepadAxisY = 0
  }

  onKeyDown(event) {
    const code = event.code
    if (Object.values(KEYS).some((codes) => codes.includes(code))) {
      event.preventDefault()
    }

    if (!this.down.has(code)) {
      this.pressed.add(code)
    }
    this.down.add(code)
  }

  onKeyUp(event) {
    this.down.delete(event.code)
  }

  isDown(action) {
    return KEYS[action].some((code) => this.down.has(code)) || this.gamepadDown.has(action)
  }

  isPressed(action) {
    return KEYS[action].some((code) => this.pressed.has(code)) || this.gamepadPressed.has(action)
  }

  axisX() {
    const left = this.isDown('left') ? -1 : 0
    const right = this.isDown('right') ? 1 : 0
    return Math.abs(this.gamepadAxisX) > 0.1 ? this.gamepadAxisX : left + right
  }

  axisY() {
    const up = this.isDown('up') ? -1 : 0
    const down = this.isDown('down') ? 1 : 0
    return Math.abs(this.gamepadAxisY) > 0.1 ? this.gamepadAxisY : up + down
  }

  updateGamepad() {
    const previous = new Set(this.gamepadDown)
    this.gamepadDown.clear()
    this.gamepadAxisX = 0
    this.gamepadAxisY = 0

    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const pad = Array.from(pads).find(Boolean)
    if (!pad) return

    const axisX = this.applyDeadzone(pad.axes[0] ?? 0)
    const axisY = this.applyDeadzone(pad.axes[1] ?? 0)
    this.gamepadAxisX = axisX
    this.gamepadAxisY = axisY

    this.setGamepadAction('left', axisX < -0.35 || this.buttonPressed(pad, 14), previous)
    this.setGamepadAction('right', axisX > 0.35 || this.buttonPressed(pad, 15), previous)
    this.setGamepadAction('up', axisY < -0.45 || this.buttonPressed(pad, 12) || this.buttonPressed(pad, 0), previous)
    this.setGamepadAction('down', axisY > 0.45 || this.buttonPressed(pad, 13), previous)
    this.setGamepadAction('dash', this.buttonPressed(pad, 1) || this.buttonPressed(pad, 5), previous)
    this.setGamepadAction('attack', this.buttonPressed(pad, 2) || this.buttonPressed(pad, 3), previous)
    this.setGamepadAction('parry', this.buttonPressed(pad, 4) || this.buttonPressed(pad, 6), previous)
    this.setGamepadAction('pause', this.buttonPressed(pad, 9), previous)
  }

  setGamepadAction(action, active, previous) {
    if (!active) return
    this.gamepadDown.add(action)
    if (!previous.has(action)) {
      this.gamepadPressed.add(action)
    }
  }

  buttonPressed(pad, index) {
    return Boolean(pad.buttons[index]?.pressed)
  }

  applyDeadzone(value) {
    return Math.abs(value) < 0.18 ? 0 : value
  }
}
