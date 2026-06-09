export class TimerManager {
  constructor() {
    this.levelTime = 0
    this.globalTime = 0
    this.levelRunning = false
    this.globalRunning = false
  }

  resetAll() {
    this.levelTime = 0
    this.globalTime = 0
    this.levelRunning = false
    this.globalRunning = false
  }

  startLevel(reset = true) {
    if (reset) {
      this.levelTime = 0
    }
    this.levelRunning = true
  }

  stopLevel() {
    this.levelRunning = false
    return this.levelTime
  }

  startGlobal(reset = true) {
    if (reset) {
      this.globalTime = 0
    }
    this.globalRunning = true
  }

  stopGlobal() {
    this.globalRunning = false
    return this.globalTime
  }

  update(dt) {
    if (this.levelRunning) {
      this.levelTime += dt
    }
    if (this.globalRunning) {
      this.globalTime += dt
    }
  }

  snapshot() {
    return {
      levelTime: this.levelTime,
      globalTime: this.globalTime,
      levelRunning: this.levelRunning,
      globalRunning: this.globalRunning,
    }
  }

  static format(seconds, empty = '--:--') {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return empty
    }

    const minutes = Math.floor(seconds / 60)
    const wholeSeconds = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 1000)
    return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
  }
}
