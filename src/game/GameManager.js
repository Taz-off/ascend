import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants.js'
import { Input } from './input.js'
import { LevelManager } from './LevelManager.js'
import { Particle } from './entities/Particle.js'
import { Player } from './entities/Player.js'
import { UIManager } from './UIManager.js'
import { LEVELS } from './levels.js'
import { clamp, drawPolygon, rectsOverlap, signOr } from './utils.js'
import { AudioManager, defaultAudioSettings } from './AudioManager.js'
import { SaveManager } from './SaveManager.js'
import { TimerManager } from './TimerManager.js'
import { SpeedrunManager } from './SpeedrunManager.js'

export class GameManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.onStateChange = options.onStateChange || (() => {})
    this.input = new Input()
    this.levelManager = new LevelManager()
    this.uiManager = new UIManager()
    this.player = null
    this.projectiles = []
    this.particles = []
    this.time = 0
    this.lastFrame = performance.now()
    this.raf = null
    this.screen = 'menu'
    this.maxUnlocked = SaveManager.readProgress()
    this.settings = SaveManager.readSettings()
    this.records = SaveManager.readRecords()
    this.audio = new AudioManager(this.settings.audio)
    this.timer = new TimerManager()
    this.speedrun = new SpeedrunManager()
    this.lastLevelResult = null
    this.speedrunAutoAdvance = 0
    this.pendingExitTarget = 'menu'
    this.previousScreenBeforeConfirm = 'paused'
    this.camera = { x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT }

    this.levelManager.load(0)
    this.player = new Player(this.levelManager.level.spawn)
    this.audio.playMenu()
    this.publishState()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.input.destroy()
    this.audio.destroy()
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.time += dt
    this.input.updateGamepad()

    if (this.input.isPressed('pause')) {
      if (this.screen === 'playing' || this.screen === 'gameOver') this.pause()
      else if (this.screen === 'paused') this.resume()
    }

    if (this.screen === 'playing' || this.screen === 'gameOver' || this.screen === 'speedrunLevelComplete') {
      this.timer.update(dt)
    }

    if (this.screen === 'playing') {
      this.update(dt)
    } else {
      this.updateAmbient(dt)
    }

    this.draw()
    this.input.clearFrame()
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    this.levelManager.preUpdate(this, dt)
    this.player.update(this, dt)
    this.levelManager.update(this, dt)
    this.updateMusicState()
    this.updateProjectiles(dt)
    this.applyPlayerAttack()
    this.updateParticles(dt)
    this.updateCamera(dt)

    if (this.player.health <= 0 && this.player.deathTimer > 0.75) {
      this.gameOver()
    }
  }

  updateAmbient(dt) {
    if (this.screen === 'speedrunLevelComplete') {
      this.speedrunAutoAdvance -= dt
      if (this.speedrunAutoAdvance <= 0) {
        this.continueSpeedrun()
      }
    }

    this.updateParticles(dt)
    if (this.player) {
      this.updateCamera(dt)
    }
  }

  updateCamera(dt) {
    const level = this.levelManager.level
    const targetX = this.player.x + this.player.w * 0.5 - CANVAS_WIDTH * 0.5
    const targetY = this.player.y + this.player.h * 0.5 - CANVAS_HEIGHT * 0.56
    const maxX = Math.max(0, level.width - CANVAS_WIDTH)
    const maxY = Math.max(0, level.height - CANVAS_HEIGHT)

    this.camera.x += (clamp(targetX, 0, maxX) - this.camera.x) * Math.min(1, dt * 5.5)
    this.camera.y += (clamp(targetY, 0, maxY) - this.camera.y) * Math.min(1, dt * 5.5)
  }

  damagePlayer(amount, sourceX, kind = 'enemy') {
    if (kind === 'enemy' && this.player.tryParryHit(sourceX)) {
      this.audio.playSfx('block')
      this.emitBurst(this.player.center().x + this.player.facing * 42, this.player.center().y, '#ffdf6e', 10)
      return false
    }

    const wasAlive = this.player.health > 0
    const damaged = this.player.takeDamage(amount, sourceX)
    if (damaged) {
      this.audio.playSfx(this.player.health <= 0 && wasAlive ? 'playerDeath' : 'playerHit')
    }
    return damaged
  }

  updateMusicState() {
    if (this.screen !== 'playing') return
    const bossActive = this.levelManager.aliveBosses().length > 0
    if (bossActive) {
      this.audio.playBoss()
    } else if (this.audio.currentTrackKey === 'boss') {
      this.audio.playLevel(this.levelManager.currentIndex)
    }
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles) {
      projectile.life -= dt
      projectile.x += projectile.vx * dt
      projectile.y += projectile.vy * dt
      projectile.vy += (projectile.gravity ?? 220) * dt

      const projectileRect = {
        x: projectile.x - projectile.radius,
        y: projectile.y - projectile.radius,
        w: projectile.radius * 2,
        h: projectile.radius * 2,
      }

      if (projectile.owner === 'enemy' && rectsOverlap(projectileRect, this.player.bounds())) {
        if (this.damagePlayer(projectile.damage, projectile.x, 'enemy')) {
          projectile.life = 0
          this.emitHitParticles(projectile.x, projectile.y, projectile.color)
        } else if (this.player.parrySuccessTime > 0) {
          projectile.life = 0
          this.emitBurst(projectile.x, projectile.y, '#ffdf6e', 8)
        }
      }

      for (const platform of this.levelManager.platforms) {
        if (rectsOverlap(projectileRect, platform)) {
          projectile.life = 0
          this.emitHitParticles(projectile.x, projectile.y, projectile.color)
          break
        }
      }
    }

    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0)
  }

  applyPlayerAttack() {
    if (!this.player.isAttackActive()) return
    const attack = this.player.attackBox()

    for (const target of this.levelManager.allHostiles()) {
      if (this.player.hitTargets.has(target.id)) continue
      if (rectsOverlap(attack, target.bounds())) {
        this.player.hitTargets.add(target.id)
        target.takeDamage(attack.damage, this.player.center().x, this)
        this.emitSlash(
          target.center().x - signOr(target.center().x - this.player.center().x) * 18,
          target.center().y,
          attack.damage > 1 ? '#ffd166' : '#dbeafe',
        )
      }
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.update(dt)
    }
    this.particles = this.particles.filter((particle) => particle.life > 0)
  }

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.levelManager.draw(ctx, this.camera, this)

    this.drawProjectiles(ctx)
    for (const particle of this.particles) {
      particle.draw(ctx, this.camera)
    }
    if (this.player) {
      this.player.draw(ctx, this.camera)
    }

    if (this.screen === 'playing' || this.screen === 'paused') {
      this.uiManager.draw(ctx, this)
    }
  }

  drawProjectiles(ctx) {
    for (const projectile of this.projectiles) {
      const x = projectile.x - this.camera.x
      const y = projectile.y - this.camera.y
      const r = projectile.radius
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.time * 7)
      drawPolygon(
        ctx,
        [
          { x: 0, y: -r },
          { x: r, y: 0 },
          { x: 0, y: r },
          { x: -r, y: 0 },
        ],
        projectile.color,
        'rgba(255,255,255,0.25)',
      )
      ctx.restore()
    }
  }

  startLevel(index, options = {}) {
    const safeIndex = clamp(index, 0, LEVELS.length - 1)
    if (safeIndex > this.maxUnlocked && !options.forceUnlock) {
      return
    }

    this.levelManager.load(safeIndex)
    this.player = new Player(this.levelManager.level.spawn)
    this.projectiles = []
    this.particles = []
    this.lastLevelResult = null
    this.speedrunAutoAdvance = 0
    this.camera.x = 0
    this.camera.y = clamp(this.player.y - CANVAS_HEIGHT * 0.5, 0, this.levelManager.level.height - CANVAS_HEIGHT)
    this.timer.startLevel(!options.keepLevelTimer)
    if (this.speedrun.active && !this.timer.globalRunning) {
      this.timer.startGlobal(false)
    }
    this.screen = 'playing'
    this.audio.playLevel(safeIndex)
    this.input.clear()
    this.publishState()
  }

  restartLevel() {
    const retryAfterDeath = this.screen === 'gameOver'
    this.startLevel(this.levelManager.currentIndex, {
      forceUnlock: this.speedrun.active,
      keepLevelTimer: retryAfterDeath,
    })
  }

  nextLevel() {
    const nextIndex = Math.min(this.levelManager.currentIndex + 1, LEVELS.length - 1)
    this.startLevel(nextIndex)
  }

  startSpeedrunMode() {
    this.speedrun.start()
    this.timer.resetAll()
    this.timer.startGlobal(true)
    this.startLevel(0, { forceUnlock: true })
  }

  continueSpeedrun() {
    if (!this.speedrun.active) return
    const nextIndex = this.speedrun.advance()
    this.timer.startGlobal(false)
    this.startLevel(nextIndex, { forceUnlock: true })
  }

  completeLevel() {
    const completedIndex = this.levelManager.currentIndex
    const level = LEVELS[completedIndex]
    const levelTime = this.timer.stopLevel()
    const levelRecord = SaveManager.saveLevelRecord(level.id, levelTime)
    this.records = SaveManager.readRecords()
    this.lastLevelResult = {
      levelIndex: completedIndex,
      levelName: level.name,
      levelTime,
      bestTime: levelRecord.bestTime,
      isNewRecord: levelRecord.isNewRecord,
      fragments: this.player.fragments,
    }

    this.maxUnlocked = Math.max(this.maxUnlocked, Math.min(LEVELS.length - 1, completedIndex + 1))
    SaveManager.writeProgress(this.maxUnlocked)
    this.emitBurst(this.player.center().x, this.player.center().y, '#ffdb65', 20)

    if (this.speedrun.active) {
      this.speedrun.recordLevelResult(this.lastLevelResult)
      if (this.speedrun.isFinalLevel(completedIndex)) {
        const totalTime = this.timer.stopGlobal()
        const globalRecord = SaveManager.saveGlobalRecord(totalTime)
        this.records = SaveManager.readRecords()
        this.speedrun.finish({
          totalTime,
          bestTime: globalRecord.bestTime,
          isNewRecord: globalRecord.isNewRecord,
        })
        this.screen = 'speedrunComplete'
        this.audio.playVictory()
      } else {
        this.screen = 'speedrunLevelComplete'
        this.speedrunAutoAdvance = 1.25
        this.audio.playSfx('victory')
      }
      this.publishState()
      return
    }

    this.screen = completedIndex === LEVELS.length - 1 ? 'victory' : 'levelComplete'
    if (this.screen === 'victory') {
      this.audio.playVictory()
    } else {
      this.audio.playSfx('victory')
    }
    this.publishState()
  }

  gameOver() {
    this.screen = 'gameOver'
    this.audio.playGameOver()
    this.publishState()
  }

  pause() {
    this.screen = 'paused'
    this.publishState()
  }

  resume() {
    this.screen = 'playing'
    this.input.clear()
    this.publishState()
  }

  showMenu() {
    if (this.requestSpeedrunExit('menu')) return
    this.openMenu()
  }

  openMenu() {
    this.screen = 'menu'
    this.audio.playMenu()
    this.input.clear()
    this.publishState()
  }

  showLevelSelect() {
    if (this.requestSpeedrunExit('levelSelect')) return
    this.openLevelSelect()
  }

  openLevelSelect() {
    this.screen = 'levelSelect'
    this.audio.playMenu()
    this.input.clear()
    this.publishState()
  }

  showSettings() {
    this.screen = 'settings'
    this.audio.playMenu()
    this.input.clear()
    this.publishState()
  }

  showRecords() {
    this.records = SaveManager.readRecords()
    this.screen = 'records'
    this.audio.playMenu()
    this.input.clear()
    this.publishState()
  }

  setAudioVolume(key, value) {
    const safeValue = clamp(Number(value), 0, 1)
    this.settings.audio = {
      ...defaultAudioSettings(),
      ...this.settings.audio,
      [key]: safeValue,
    }
    this.audio.setSettings(this.settings.audio)
    SaveManager.writeSettings(this.settings)
    this.publishState()
  }

  requestSpeedrunExit(target) {
    if (!this.speedrun.active) return false

    this.pendingExitTarget = target
    this.previousScreenBeforeConfirm = this.screen
    this.screen = 'confirmQuitSpeedrun'
    this.publishState()
    return true
  }

  confirmQuitSpeedrun() {
    const target = this.pendingExitTarget
    this.speedrun.cancel()
    this.timer.resetAll()
    this.lastLevelResult = null
    this.speedrunAutoAdvance = 0

    if (target === 'levelSelect') {
      this.openLevelSelect()
    } else {
      this.openMenu()
    }
  }

  cancelQuitSpeedrun() {
    this.screen = this.previousScreenBeforeConfirm || 'paused'
    this.input.clear()
    this.publishState()
  }

  spawnProjectile(projectile) {
    this.projectiles.push({
      radius: 8,
      life: 3,
      gravity: 220,
      ...projectile,
    })
  }

  addScoreFragment(x, y, amount = 1) {
    this.collectFragments(amount, x, y)
  }

  collectFragments(amount = 1, x = this.player.center().x, y = this.player.center().y) {
    this.player.fragments += amount
    this.emitBurst(x, y, '#ffdb65', Math.min(16, 4 + amount * 2))

    while (this.player.fragments >= this.player.nextHealFragment) {
      if (this.player.health < this.player.maxHealth) {
        this.player.health += 1
        this.emitBurst(this.player.center().x, this.player.center().y, '#59d0b2', 10)
      }
      this.player.nextHealFragment += 5
    }
  }

  emitHitParticles(x, y, color = '#ffffff') {
    for (let index = 0; index < 5; index += 1) {
      this.particles.push(
        new Particle(x, y, {
          color,
          size: 5 + Math.random() * 8,
          life: 0.22 + Math.random() * 0.22,
        }),
      )
    }
  }

  emitBurst(x, y, color = '#ffffff', count = 12) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4
      const speed = 90 + Math.random() * 210
      this.particles.push(
        new Particle(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 80,
          color,
          size: 5 + Math.random() * 8,
          life: 0.35 + Math.random() * 0.34,
        }),
      )
    }
  }

  emitSlash(x, y, color = '#ffffff') {
    for (let index = 0; index < 7; index += 1) {
      this.particles.push(
        new Particle(x + Math.random() * 24 - 12, y + Math.random() * 24 - 12, {
          vx: 120 + Math.random() * 220,
          vy: -120 + Math.random() * 240,
          color,
          size: 4 + Math.random() * 6,
          life: 0.18 + Math.random() * 0.12,
          gravity: 130,
        }),
      )
    }
  }

  publishState() {
    this.onStateChange({
      screen: this.screen,
      levelIndex: this.levelManager.currentIndex,
      maxUnlocked: this.maxUnlocked,
      fragments: this.player?.fragments ?? 0,
      settings: { ...this.settings },
      timer: this.timer.snapshot(),
      speedrun: this.speedrun.snapshot(),
      lastLevelResult: this.lastLevelResult,
      records: this.records,
    })
  }
}
