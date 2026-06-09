import { GRAVITY } from '../constants.js'
import { centerOf, drawPolygon, rectsOverlap, signOr } from '../utils.js'

const ENEMY_CONFIG = {
  patrol: {
    name: 'Sentinelle',
    w: 44,
    h: 50,
    speed: 85,
    health: 2,
    damage: 1,
    color: '#ff8a65',
    dark: '#b74f43',
  },
  swift: {
    name: 'Eclaireur',
    w: 38,
    h: 44,
    speed: 150,
    health: 2,
    damage: 1,
    color: '#f45b7a',
    dark: '#9f3156',
  },
  flying: {
    name: 'Aile prismatique',
    w: 48,
    h: 40,
    speed: 105,
    health: 2,
    damage: 1,
    color: '#8bd7ff',
    dark: '#3d7aa0',
  },
  brute: {
    name: 'Lourd',
    w: 58,
    h: 68,
    speed: 58,
    health: 5,
    damage: 2,
    color: '#b993ff',
    dark: '#6d55a8',
  },
  ranger: {
    name: 'Archer',
    w: 44,
    h: 54,
    speed: 48,
    health: 3,
    damage: 1,
    color: '#ffd166',
    dark: '#b3822e',
  },
}

let nextEnemyId = 1

export class Enemy {
  constructor(data) {
    const config = ENEMY_CONFIG[data.type] || ENEMY_CONFIG.patrol
    this.id = `enemy-${nextEnemyId}`
    nextEnemyId += 1
    this.type = data.type
    this.name = config.name
    this.x = data.x
    this.y = data.y
    this.w = config.w
    this.h = config.h
    this.vx = 0
    this.vy = 0
    this.speed = data.speed ?? config.speed
    this.maxHealth = data.health ?? config.health
    this.health = this.maxHealth
    this.damage = config.damage
    this.color = config.color
    this.dark = config.dark
    this.patrol = data.patrol || [data.x - 140, data.x + 140]
    this.homeY = data.y
    this.facing = 1
    this.onGround = false
    this.flash = 0
    this.dead = false
    this.deathTimer = 0
    this.attackCooldown = 0.8
    this.animationTime = Math.random() * 10
  }

  bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h }
  }

  center() {
    return centerOf(this.bounds())
  }

  update(game, dt) {
    this.animationTime += dt
    this.flash = Math.max(0, this.flash - dt)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)

    if (this.health <= 0) {
      this.dead = true
      this.deathTimer += dt
      this.vx *= 0.9
      this.vy += GRAVITY * dt
      if (this.type !== 'flying') {
        this.applyPhysics(game, dt)
      } else {
        this.y += 130 * dt
      }
      return
    }

    if (this.type === 'flying') {
      this.updateFlying(game, dt)
      return
    }

    if (this.type === 'ranger') {
      this.updateRanger(game, dt)
    } else if (this.type === 'swift') {
      this.updateSwift(game)
    } else {
      this.updateWalker(game)
    }

    this.applyPhysics(game, dt)
  }

  updateWalker(game) {
    const player = game.player
    const distance = player.center().x - this.center().x
    const seesPlayer = Math.abs(distance) < (this.type === 'brute' ? 340 : 260)
    const targetDirection = seesPlayer ? signOr(distance, this.facing) : this.facing

    this.facing = targetDirection
    this.vx = targetDirection * this.speed

    if (!seesPlayer) {
      this.turnAtPatrolBounds()
    }

    if (this.type === 'brute' && seesPlayer && Math.abs(distance) < 78 && this.attackCooldown <= 0) {
      this.attackCooldown = 0.9
      if (rectsOverlap(this.meleeBox(), player.bounds())) {
        game.damagePlayer(this.damage, this.center().x, 'enemy')
      }
    }
  }

  updateSwift(game) {
    const player = game.player
    const distance = player.center().x - this.center().x
    const close = Math.abs(distance) < 430 && Math.abs(player.y - this.y) < 160
    this.facing = close ? signOr(distance, this.facing) : this.facing
    this.vx = this.facing * (close ? this.speed * 1.35 : this.speed)
    if (!close) {
      this.turnAtPatrolBounds()
    }
  }

  updateRanger(game, dt) {
    const player = game.player
    const distance = player.center().x - this.center().x
    const vertical = Math.abs(player.center().y - this.center().y)
    const seesPlayer = Math.abs(distance) < 640 && vertical < 190

    if (seesPlayer) {
      this.facing = signOr(distance, this.facing)
      this.vx *= 0.82
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.35
        game.spawnProjectile({
          owner: 'enemy',
          x: this.center().x + this.facing * 28,
          y: this.center().y - 5,
          vx: this.facing * 360,
          vy: -40,
          radius: 9,
          damage: this.damage,
          color: '#ffd166',
        })
      }
    } else {
      this.vx = this.facing * this.speed
      this.turnAtPatrolBounds()
    }

    this.vy += GRAVITY * dt
  }

  updateFlying(game, dt) {
    const player = game.player
    const distance = player.center().x - this.center().x
    const vertical = player.center().y - this.center().y
    const seesPlayer = Math.abs(distance) < 480 && Math.abs(vertical) < 320
    const targetX = seesPlayer ? player.center().x : this.x + this.facing * 120
    const targetY = seesPlayer ? player.center().y - 40 : this.homeY + Math.sin(this.animationTime * 2) * 36

    this.facing = signOr(targetX - this.center().x, this.facing)
    this.vx += (targetX - this.center().x) * 1.6 * dt
    this.vy += (targetY - this.center().y) * 1.9 * dt
    this.vx = Math.max(-this.speed * 1.55, Math.min(this.speed * 1.55, this.vx))
    this.vy = Math.max(-this.speed * 1.3, Math.min(this.speed * 1.3, this.vy))
    this.x += this.vx * dt
    this.y += this.vy * dt

    if (this.x < this.patrol[0] || this.x > this.patrol[1]) {
      this.facing *= -1
      this.x = Math.max(this.patrol[0], Math.min(this.patrol[1], this.x))
    }
  }

  turnAtPatrolBounds() {
    if (this.x < this.patrol[0]) {
      this.facing = 1
    }
    if (this.x + this.w > this.patrol[1]) {
      this.facing = -1
    }
  }

  applyPhysics(game, dt) {
    if (this.type !== 'ranger') {
      this.vy += GRAVITY * dt
    }

    this.x += this.vx * dt
    const wallHit = game.levelManager.resolveEntityX(this)
    if (wallHit !== 0) {
      this.facing *= -1
    }

    this.y += this.vy * dt
    this.onGround = false
    if (game.levelManager.resolveEntityY(this) === 1) {
      this.onGround = true
    }
  }

  meleeBox() {
    return {
      x: this.facing > 0 ? this.x + this.w - 6 : this.x - 52,
      y: this.y + 12,
      w: 58,
      h: this.h - 18,
    }
  }

  takeDamage(amount, sourceX, game) {
    if (this.dead) return false
    this.health = Math.max(0, this.health - amount)
    this.flash = 0.16
    const dir = signOr(this.center().x - sourceX, 1)
    this.vx = dir * (this.type === 'brute' ? 110 : 210)
    this.vy = this.type === 'flying' ? -80 : -240

    game.emitHitParticles(this.center().x, this.center().y, this.color)
    if (this.health <= 0) {
      game.audio.playSfx('enemyDeath')
      game.emitBurst(this.center().x, this.center().y, this.color, 9)
      game.addScoreFragment(this.center().x, this.center().y)
    } else {
      game.audio.playSfx('enemyHit')
    }
    return true
  }

  draw(ctx, camera) {
    const x = this.x - camera.x
    const y = this.y - camera.y
    const cx = x + this.w * 0.5
    const cy = y + this.h * 0.5
    const color = this.flash > 0 ? '#ffffff' : this.color
    const wing = Math.sin(this.animationTime * 12) * 12
    const bob = this.type === 'flying' ? Math.sin(this.animationTime * 5) * 3 : 0

    ctx.save()
    ctx.translate(cx, cy + bob)
    if (this.facing < 0) ctx.scale(-1, 1)
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer * 2)

    if (this.type === 'flying') {
      drawPolygon(
        ctx,
        [
          { x: -8, y: -4 },
          { x: -40, y: -18 - wing * 0.2 },
          { x: -22, y: 13 + wing * 0.18 },
        ],
        '#dff7ff',
        null,
      )
      drawPolygon(
        ctx,
        [
          { x: 8, y: -4 },
          { x: 40, y: -18 - wing * 0.2 },
          { x: 22, y: 13 + wing * 0.18 },
        ],
        '#a7ecff',
        null,
      )
    }

    drawPolygon(
      ctx,
      [
        { x: -this.w * 0.43, y: -this.h * 0.22 },
        { x: -this.w * 0.06, y: -this.h * 0.48 },
        { x: this.w * 0.42, y: -this.h * 0.16 },
        { x: this.w * 0.3, y: this.h * 0.34 },
        { x: -this.w * 0.35, y: this.h * 0.38 },
      ],
      color,
      'rgba(255,255,255,0.12)',
    )
    drawPolygon(
      ctx,
      [
        { x: this.w * 0.02, y: -this.h * 0.48 },
        { x: this.w * 0.42, y: -this.h * 0.16 },
        { x: this.w * 0.3, y: this.h * 0.34 },
        { x: this.w * 0.04, y: this.h * 0.15 },
      ],
      this.dark,
      null,
    )

    if (this.type !== 'flying') {
      const leg = Math.sin(this.animationTime * 10) * 5
      drawPolygon(
        ctx,
        [
          { x: -14, y: this.h * 0.25 },
          { x: -2, y: this.h * 0.25 },
          { x: -4 + leg, y: this.h * 0.48 },
          { x: -17 + leg, y: this.h * 0.48 },
        ],
        this.dark,
        null,
      )
      drawPolygon(
        ctx,
        [
          { x: 8, y: this.h * 0.25 },
          { x: 20, y: this.h * 0.25 },
          { x: 20 - leg, y: this.h * 0.48 },
          { x: 6 - leg, y: this.h * 0.48 },
        ],
        '#34384e',
        null,
      )
    }

    ctx.fillStyle = '#161b29'
    ctx.beginPath()
    ctx.arc(12, -this.h * 0.25, 4, 0, Math.PI * 2)
    ctx.fill()

    if (this.type === 'ranger') {
      drawPolygon(
        ctx,
        [
          { x: 25, y: -18 },
          { x: 46, y: -2 },
          { x: 25, y: 18 },
        ],
        '#6b3f2a',
        null,
      )
    }

    ctx.restore()
    this.drawHealth(ctx, camera)
  }

  drawHealth(ctx, camera) {
    if (this.health <= 0 || this.health >= this.maxHealth) return
    const x = this.x - camera.x
    const y = this.y - camera.y - 12
    const width = this.w
    ctx.fillStyle = 'rgba(20, 24, 34, 0.65)'
    ctx.fillRect(x, y, width, 5)
    ctx.fillStyle = '#ffdf6e'
    ctx.fillRect(x, y, width * (this.health / this.maxHealth), 5)
  }
}
