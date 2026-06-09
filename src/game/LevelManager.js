import { LEVELS } from './levels.js'
import { Boss } from './entities/Boss.js'
import { Enemy } from './entities/Enemy.js'
import { createRect, rectsOverlap } from './utils.js'
import {
  drawBackground,
  drawCheckpoint,
  drawFragment,
  drawGoal,
  drawHazard,
  drawPlatform,
  drawShortcutPreview,
  drawShortcutTrigger,
} from './rendering/lowPoly.js'

export class LevelManager {
  constructor() {
    this.currentIndex = 0
    this.level = null
    this.platforms = []
    this.staticPlatforms = []
    this.movingPlatforms = []
    this.shortcutPlatforms = []
    this.shortcutTriggers = []
    this.hazards = []
    this.fragments = []
    this.checkpoints = []
    this.enemies = []
    this.bosses = []
    this.goal = null
    this.activeCheckpoint = null
  }

  load(index) {
    const source = LEVELS[index]
    this.currentIndex = index
    this.level = structuredClone(source)
    this.staticPlatforms = this.level.platforms.map((platform) => ({
      kind: platform.h > 160 && platform.w < 80 ? 'wall' : 'ground',
      ...platform,
    }))
    this.movingPlatforms = (this.level.movingPlatforms || []).map((platform) => ({
      kind: 'elevator',
      speed: 90,
      direction: 1,
      previousX: platform.x,
      previousY: platform.y,
      ...platform,
      from: platform.from || { x: platform.x, y: platform.y },
      to: platform.to || { x: platform.x, y: platform.y },
    }))
    this.shortcutPlatforms = (this.level.shortcutPlatforms || []).map((platform) => ({
      kind: 'shortcut',
      active: false,
      previousActive: false,
      ...platform,
    }))
    this.shortcutTriggers = (this.level.shortcutTriggers || []).map((trigger) => ({
      active: false,
      ...trigger,
    }))
    this.refreshPlatforms()
    this.hazards = this.level.hazards
      .map((hazard) => this.placeHazardOnPlatform(hazard))
      .filter(Boolean)
    this.fragments = this.level.fragments.map((fragment, fragmentIndex) => ({
      id: `fragment-${fragmentIndex}`,
      x: fragment.x,
      y: fragment.y,
      w: 28,
      h: 34,
      collected: false,
    }))
    this.checkpoints = this.level.checkpoints.map((checkpoint, checkpointIndex) => {
      const platform = this.findPlatformForPoint(checkpoint.x, checkpoint.y)
      const y = platform ? platform.y : checkpoint.y
      return {
        id: `checkpoint-${checkpointIndex}`,
        x: checkpoint.x,
        y,
        w: 72,
        h: 110,
        active: false,
      }
    })
    this.enemies = this.level.enemies.map((enemy) => new Enemy(enemy))
    this.bosses = this.level.bosses.map((boss) => new Boss(boss))
    this.goal = { ...this.level.goal }
    this.activeCheckpoint = { ...this.level.spawn }
  }

  preUpdate(game, dt) {
    this.updateMovingPlatforms(game, dt)
  }

  update(game, dt) {
    this.updateShortcuts(game)
    this.updateFragments(game)
    this.updateCheckpoints(game)
    this.updateHazards(game)

    for (const enemy of this.enemies) {
      enemy.update(game, dt)
      if (!enemy.dead && rectsOverlap(enemy.bounds(), game.player.bounds())) {
        game.damagePlayer(enemy.damage, enemy.center().x, 'enemy')
      }
    }

    for (const boss of this.bosses) {
      boss.update(game, dt)
      if (!boss.dead && rectsOverlap(boss.bounds(), game.player.bounds())) {
        game.damagePlayer(2, boss.center().x, 'enemy')
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead || enemy.deathTimer < 1.1)

    if (game.player.y > this.level.height + 260) {
      if (game.damagePlayer(2, game.player.x, 'hazard')) {
        this.respawnPlayer(game)
      }
    }

    const goalOpen = this.areBossesDefeated()
    if (goalOpen && rectsOverlap(game.player.bounds(), this.goal)) {
      game.completeLevel()
    }
  }

  updateFragments(game) {
    for (const fragment of this.fragments) {
      if (fragment.collected) continue
      const pickup = createRect(fragment.x - 15, fragment.y - 18, 30, 36)
      if (rectsOverlap(game.player.bounds(), pickup)) {
        fragment.collected = true
        game.collectFragments(1, fragment.x, fragment.y)
      }
    }
  }

  updateCheckpoints(game) {
    for (const checkpoint of this.checkpoints) {
      const trigger = createRect(checkpoint.x - 34, checkpoint.y - 110, 68, 126)
      if (!checkpoint.active && rectsOverlap(game.player.bounds(), trigger)) {
        this.checkpoints.forEach((other) => {
          other.active = false
        })
        checkpoint.active = true
        game.audio.playSfx('checkpoint')
        this.activeCheckpoint = {
          x: checkpoint.x - game.player.w * 0.5,
          y: checkpoint.y - game.player.h - 4,
        }
      }
    }
  }

  updateHazards(game) {
    for (const hazard of this.hazards) {
      if (rectsOverlap(game.player.bounds(), hazard)) {
        if (game.damagePlayer(1, hazard.x + hazard.w * 0.5, 'hazard')) {
          this.respawnPlayer(game, false)
        }
      }
    }
  }

  respawnPlayer(game, heal = false) {
    const fragments = game.player.fragments
    const nextHealFragment = game.player.nextHealFragment
    const health = game.player.health
    game.player.reset(this.activeCheckpoint)
    game.player.fragments = fragments
    game.player.nextHealFragment = nextHealFragment
    game.player.health = heal ? game.player.maxHealth : Math.max(1, health)
    game.emitBurst(game.player.center().x, game.player.center().y, '#59d0b2', 12)
  }

  draw(ctx, camera, game) {
    drawBackground(ctx, this.level, camera, game.time)

    for (const platform of this.platforms) {
      if (this.isInView(platform, camera, 80)) {
        drawPlatform(ctx, platform, this.level.theme, camera)
      }
    }

    for (const platform of this.shortcutPlatforms) {
      if (!platform.active && this.isInView(platform, camera, 80)) {
        drawShortcutPreview(ctx, platform, this.level.theme, camera, game.time)
      }
    }

    for (const trigger of this.shortcutTriggers) {
      if (this.isInView(trigger, camera, 140)) {
        drawShortcutTrigger(ctx, trigger, this.level.theme, camera, game.time)
      }
    }

    for (const hazard of this.hazards) {
      if (this.isInView(hazard, camera, 80)) {
        drawHazard(ctx, hazard, this.level.theme, camera, game.time)
      }
    }

    for (const fragment of this.fragments) {
      if (!fragment.collected && this.isInView(fragment, camera, 120)) {
        drawFragment(ctx, fragment, this.level.theme, camera, game.time)
      }
    }

    for (const checkpoint of this.checkpoints) {
      if (this.isInView(checkpoint, camera, 120)) {
        drawCheckpoint(ctx, checkpoint, camera, game.time)
      }
    }

    for (const enemy of this.enemies) {
      if (this.isInView(enemy.bounds(), camera, 160)) {
        enemy.draw(ctx, camera)
      }
    }

    for (const boss of this.bosses) {
      if (this.isInView(boss.bounds(), camera, 220)) {
        boss.draw(ctx, camera)
      }
    }

    drawGoal(ctx, this.goal, this.level.theme, camera, game.time, this.areBossesDefeated())
  }

  resolveEntityX(entity) {
    let wallSide = 0
    const bounds = entity.bounds()

    for (const platform of this.platforms) {
      if (!rectsOverlap(bounds, platform)) continue

      if (entity.vx > 0) {
        entity.x = platform.x - entity.w
        wallSide = 1
      } else if (entity.vx < 0) {
        entity.x = platform.x + platform.w
        wallSide = -1
      }
      entity.vx = 0
      bounds.x = entity.x
    }

    if (entity.x < 0) {
      entity.x = 0
      entity.vx = 0
      wallSide = -1
    }
    if (entity.x + entity.w > this.level.width) {
      entity.x = this.level.width - entity.w
      entity.vx = 0
      wallSide = 1
    }

    return wallSide
  }

  resolveEntityY(entity) {
    let hit = 0
    const bounds = entity.bounds()

    for (const platform of this.platforms) {
      if (!rectsOverlap(bounds, platform)) continue

      if (entity.vy > 0) {
        entity.y = platform.y - entity.h
        hit = 1
      } else if (entity.vy < 0) {
        entity.y = platform.y + platform.h
        hit = -1
      }
      entity.vy = 0
      bounds.y = entity.y
    }

    return hit
  }

  getWallSide(entity) {
    const leftProbe = {
      x: entity.x - 3,
      y: entity.y + 8,
      w: 3,
      h: entity.h - 16,
    }
    const rightProbe = {
      x: entity.x + entity.w,
      y: entity.y + 8,
      w: 3,
      h: entity.h - 16,
    }

    for (const platform of this.platforms) {
      if (rectsOverlap(leftProbe, platform)) return -1
      if (rectsOverlap(rightProbe, platform)) return 1
    }
    return 0
  }

  updateMovingPlatforms(game, dt) {
    for (const platform of this.movingPlatforms) {
      platform.previousX = platform.x
      platform.previousY = platform.y

      const target = platform.direction > 0 ? platform.to : platform.from
      const dx = target.x - platform.x
      const dy = target.y - platform.y
      const distance = Math.hypot(dx, dy)

      if (distance < 2) {
        platform.direction *= -1
      } else {
        const step = Math.min(distance, platform.speed * dt)
        platform.x += (dx / distance) * step
        platform.y += (dy / distance) * step
      }

      const moveX = platform.x - platform.previousX
      const moveY = platform.y - platform.previousY
      if (this.isEntityStandingOnPlatform(game.player, platform)) {
        game.player.x += moveX
        game.player.y += moveY
      }
    }
  }

  updateShortcuts(game) {
    let changed = false
    for (const trigger of this.shortcutTriggers) {
      if (trigger.active) continue

      if (rectsOverlap(game.player.bounds(), trigger)) {
        trigger.active = true
        for (const platform of this.shortcutPlatforms) {
          if (trigger.platformIds.includes(platform.id)) {
            platform.active = true
            changed = true
            game.emitBurst(platform.x + platform.w * 0.5, platform.y, '#59d0b2', 14)
          }
        }
      }
    }

    if (changed) {
      this.refreshPlatforms()
    }
  }

  refreshPlatforms() {
    this.platforms = [
      ...this.staticPlatforms,
      ...this.movingPlatforms,
      ...this.shortcutPlatforms.filter((platform) => platform.active),
    ]
  }

  isEntityStandingOnPlatform(entity, platform) {
    if (!entity) return false
    const entityBottom = entity.y + entity.h
    return (
      entityBottom <= platform.y + 6 &&
      entityBottom >= platform.y - 8 &&
      entity.x + entity.w > platform.x + 4 &&
      entity.x < platform.x + platform.w - 4 &&
      entity.vy >= -30
    )
  }

  placeHazardOnPlatform(hazard) {
    const platform = this.findPlatformForRange(hazard.x, hazard.x + hazard.w, hazard.y + hazard.h)
    if (!platform) return null

    return {
      ...hazard,
      y: platform.y - hazard.h,
    }
  }

  findPlatformForRange(left, right, preferredY = Infinity) {
    const candidates = this.platforms.filter(
      (platform) =>
        platform.kind !== 'wall' &&
        left >= platform.x + 12 &&
        right <= platform.x + platform.w - 12,
    )

    if (candidates.length === 0) return null
    return candidates.sort((a, b) => Math.abs(a.y - preferredY) - Math.abs(b.y - preferredY))[0]
  }

  findPlatformForPoint(x, preferredY = Infinity) {
    const candidates = this.platforms.filter(
      (platform) => platform.kind !== 'wall' && x >= platform.x && x <= platform.x + platform.w,
    )

    if (candidates.length === 0) return null
    return candidates.sort((a, b) => Math.abs(a.y - preferredY) - Math.abs(b.y - preferredY))[0]
  }

  areBossesDefeated() {
    return this.bosses.every((boss) => boss.dead)
  }

  aliveBosses() {
    return this.bosses.filter((boss) => boss.active && !boss.dead)
  }

  allHostiles() {
    return [...this.enemies.filter((enemy) => !enemy.dead), ...this.bosses.filter((boss) => !boss.dead)]
  }

  isInView(rect, camera, margin = 0) {
    return (
      rect.x + rect.w > camera.x - margin &&
      rect.x < camera.x + camera.w + margin &&
      rect.y + rect.h > camera.y - margin &&
      rect.y < camera.y + camera.h + margin
    )
  }
}
