import { LEVELS } from './levels.js'
import { clamp } from './utils.js'
import { defaultAudioSettings } from './AudioManager.js'

const PROGRESS_KEY = 'ascend-unlocked'
const SETTINGS_KEY = 'ascend-settings'
const RECORDS_KEY = 'ascend-speedrun-records'

export class SaveManager {
  static readProgress() {
    const value = Number(window.localStorage.getItem(PROGRESS_KEY))
    return Number.isFinite(value) ? clamp(value, 0, LEVELS.length - 1) : 0
  }

  static writeProgress(maxUnlocked) {
    window.localStorage.setItem(PROGRESS_KEY, String(clamp(maxUnlocked, 0, LEVELS.length - 1)))
  }

  static readSettings() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}')
      return {
        audio: {
          ...defaultAudioSettings(),
          ...(parsed.audio || {}),
        },
      }
    } catch {
      return { audio: defaultAudioSettings() }
    }
  }

  static writeSettings(settings) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  static readRecords() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECORDS_KEY) || '{}')
      return {
        levels: parsed.levels || {},
        global: Number(parsed.global) > 0 ? Number(parsed.global) : 0,
      }
    } catch {
      return { levels: {}, global: 0 }
    }
  }

  static writeRecords(records) {
    window.localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify({
        levels: records.levels || {},
        global: records.global || 0,
      }),
    )
  }

  static saveLevelRecord(levelId, time) {
    const records = SaveManager.readRecords()
    const previous = Number(records.levels[levelId]) || 0
    const isNewRecord = time > 0 && (previous === 0 || time < previous)

    if (isNewRecord) {
      records.levels[levelId] = time
      SaveManager.writeRecords(records)
    }

    return {
      isNewRecord,
      bestTime: records.levels[levelId] || previous || 0,
      previousBest: previous,
    }
  }

  static saveGlobalRecord(time) {
    const records = SaveManager.readRecords()
    const previous = Number(records.global) || 0
    const isNewRecord = time > 0 && (previous === 0 || time < previous)

    if (isNewRecord) {
      records.global = time
      SaveManager.writeRecords(records)
    }

    return {
      isNewRecord,
      bestTime: records.global || previous || 0,
      previousBest: previous,
    }
  }
}
