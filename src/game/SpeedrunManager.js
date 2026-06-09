import { LEVELS } from './levels.js'

export class SpeedrunManager {
  constructor() {
    this.active = false
    this.completed = false
    this.currentLevelIndex = 0
    this.lastLevelResult = null
    this.finalResult = null
  }

  start() {
    this.active = true
    this.completed = false
    this.currentLevelIndex = 0
    this.lastLevelResult = null
    this.finalResult = null
  }

  cancel() {
    this.active = false
    this.completed = false
    this.lastLevelResult = null
    this.finalResult = null
  }

  recordLevelResult(result) {
    this.lastLevelResult = result
  }

  advance() {
    this.currentLevelIndex += 1
    return this.currentLevelIndex
  }

  isFinalLevel(index = this.currentLevelIndex) {
    return index >= LEVELS.length - 1
  }

  finish(finalResult) {
    this.active = false
    this.completed = true
    this.finalResult = finalResult
  }

  snapshot() {
    return {
      active: this.active,
      completed: this.completed,
      currentLevelIndex: this.currentLevelIndex,
      lastLevelResult: this.lastLevelResult,
      finalResult: this.finalResult,
    }
  }
}
