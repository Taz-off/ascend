import { GRAVITY } from '../constants.js'
import { centerOf, drawPolygon, rectsOverlap, signOr } from '../utils.js'

const BOSS_CONFIG = {
  stoneGuardian: {
    name: 'Gardien de pierre',
    w: 92,
    h: 118,
    health: 18,
    color: '#9ca3af',
    dark: '#51596b',
    accent: '#7ee6ff',
    speed: 92,
  },
  polygonKing: {
    name: 'Souverain du Zenith',
    w: 98,
    h: 126,
    health: 28,
    color: '#d7a84f',
    dark: '#7a4661',
    accent: '#ff5c86',
    speed: 112,
  },
}

let nextBossId = 1

export class Boss {
  constructor(data) {
    const config = BOSS_CONFIG[data.type] || BOSS_CONFIG.stoneGuardian
    this.id = `boss-${nextBossId}`
    nextBossId += 1
    this.type = data.type
    this.name = config.name
    this.x = data.x
    this.y = data.y
    this.w = config.w
    this.h = config.h
    this.vx = 0
    this.vy = 0
    this.maxHealth = data.health ?? config.health
    this.health = this.maxHealth
    this.color = config.color
    this.dark = config.dark
    this.accent = config.accent
    this.speed = config.speed
    this.arena = data.arena
    this.facing = -1
    this.active = false
    this.dead = false
    this.flash = 0
    this.attackCooldown = 1
    this.currentAttack = null
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
      this.vx *= 0.88
      this.vy += GRAVITY * dt
      this.applyPhysics(game, dt)
      return
    }

    const player = game.player
    const playerCenter = player.center()
    this.active = this.active || playerCenter.x > this.arena.x - 360
    if (!this.active) {
      this.idlePhysics(game, dt)
      return
    }

    this.facing = signOr(playerCenter.x - this.center().x, this.facing)

    if (this.currentAttack) {
      this.updateAttack(game, dt)
    } else {
      this.paceInArena(playerCenter, dt)
      if (this.attackCooldown <= 0) {
        this.chooseAttack(playerCenter)
      }
    }

    this.applyPhysics(game, dt)
  }

  idlePhysics(game, dt) {
    this.vy += GRAVITY * dt
    this.applyPhysics(game, dt)
  }

  paceInArena(playerCenter, dt) {
    const distance = playerCenter.x - this.center().x
    const desired = Math.abs(distance) > 220 ? signOr(distance, this.facing) * this.speed : 0
    this.vx += (desired - this.vx) * Math.min(1, dt * 5)
  }

  chooseAttack(playerCenter) {
    const distance = Math.abs(playerCenter.x - this.center().x)
    const lowHealth = this.health < this.maxHealth * 0.45
    let attackType = 'ranged'

    if (distance < 165) {
      attackType = 'melee'
    } else if (lowHealth || distance > 360) {
      attackType = Math.random() > 0.45 ? 'charge' : 'ranged'
    } else {
      attackType = Math.random() > 0.5 ? 'melee' : 'ranged'
    }

    const duration = attackType === 'charge' ? 0.95 : attackType === 'melee' ? 0.54 : 0.72
    this.pendingAttackSound = true
    this.currentAttack = {
      type: attackType,
      time: 0,
      duration,
      fired: false,
      hit: false,
      direction: this.facing,
    }
  }

  updateAttack(game, dt) {
    const attack = this.currentAttack
    attack.time += dt
    if (this.pendingAttackSound && attack.time > 0.08) {
      this.pendingAttackSound = false
      game.audio.playSfx('bossAttack')
    }
    this.vx *= attack.type === 'charge' && attack.time > 0.42 ? 1 : 0.82

    if (attack.type === 'melee') {
      this.updateMelee(game, attack)
    }
    if (attack.type === 'ranged') {
      this.updateRanged(game, attack)
    }
    if (attack.type === 'charge') {
      this.updateCharge(game, attack)
    }

    if (attack.time >= attack.duration) {
      this.attackCooldown = this.type === 'polygonKing' ? 0.62 : 0.86
      this.currentAttack = null
    }
  }

  updateMelee(game, attack) {
    if (!attack.hit && attack.time > 0.26) {
      attack.hit = true
      const hitbox = {
        x: this.facing > 0 ? this.x + this.w - 14 : this.x - 86,
        y: this.y + 25,
        w: 98,
        h: 70,
      }
      if (rectsOverlap(hitbox, game.player.bounds())) {
        game.damagePlayer(this.type === 'polygonKing' ? 2 : 1, this.center().x, 'enemy')
      }
      game.emitSlash(hitbox.x + hitbox.w * 0.5, hitbox.y + hitbox.h * 0.5, this.accent)
    }
  }

  updateRanged(game, attack) {
    if (!attack.fired && attack.time > 0.34) {
      attack.fired = true
      const shots = this.type === 'polygonKing' ? [-0.28, 0, 0.28] : [-0.18, 0.18]
      shots.forEach((spread) => {
        game.spawnProjectile({
          owner: 'enemy',
          x: this.center().x + this.facing * 48,
          y: this.center().y - 18,
          vx: this.facing * (390 + Math.abs(spread) * 120),
          vy: spread * 360,
          radius: this.type === 'polygonKing' ? 12 : 11,
          damage: this.type === 'polygonKing' ? 2 : 1,
          color: this.accent,
        })
      })
    }
  }

  updateCharge(game, attack) {
    if (attack.time < 0.42) {
      this.vx *= 0.7
      return
    }

    this.vx = attack.direction * (this.type === 'polygonKing' ? 650 : 560)
    if (rectsOverlap(this.bounds(), game.player.bounds())) {
      game.damagePlayer(this.type === 'polygonKing' ? 2 : 2, this.center().x, 'enemy')
    }

    if (this.x < this.arena.x || this.x + this.w > this.arena.x + this.arena.w) {
      attack.time = attack.duration
      this.vx *= -0.25
    }
  }

  applyPhysics(game, dt) {
    this.vy += GRAVITY * dt
    this.x += this.vx * dt
    const wall = game.levelManager.resolveEntityX(this)
    if (wall !== 0) {
      this.vx *= -0.35
    }

    this.y += this.vy * dt
    game.levelManager.resolveEntityY(this)

    if (this.active && this.arena) {
      if (this.x < this.arena.x) {
        this.x = this.arena.x
        this.vx = Math.abs(this.vx) * 0.2
      }
      if (this.x + this.w > this.arena.x + this.arena.w) {
        this.x = this.arena.x + this.arena.w - this.w
        this.vx = -Math.abs(this.vx) * 0.2
      }
    }
  }

  takeDamage(amount, sourceX, game) {
    if (this.dead) return false
    this.health = Math.max(0, this.health - amount)
    this.flash = 0.14
    this.vx += signOr(this.center().x - sourceX, 1) * 110
    game.emitHitParticles(this.center().x, this.center().y, this.accent)
    if (this.health <= 0) {
      game.audio.playSfx('enemyDeath')
      game.emitBurst(this.center().x, this.center().y, this.accent, 24)
      game.addScoreFragment(this.center().x, this.center().y, 5)
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
    const breathe = Math.sin(this.animationTime * 3) * 3

    ctx.save()
    ctx.translate(cx, cy + breathe)
    if (this.facing < 0) ctx.scale(-1, 1)
    if (this.dead) ctx.globalAlpha = Math.max(0, this.health <= 0 ? 0.55 : 1)

    if (this.currentAttack?.type === 'charge' && this.currentAttack.time < 0.42) {
      ctx.globalAlpha = 0.22
      drawPolygon(
        ctx,
        [
          { x: 24, y: -56 },
          { x: 112, y: -10 },
          { x: 24, y: 50 },
        ],
        this.accent,
        null,
      )
      ctx.globalAlpha = 1
    }

    drawPolygon(
      ctx,
      [
        { x: -42, y: -50 },
        { x: 18, y: -64 },
        { x: 48, y: -18 },
        { x: 34, y: 58 },
        { x: -34, y: 62 },
        { x: -56, y: -10 },
      ],
      color,
      'rgba(255,255,255,0.14)',
    )
    drawPolygon(
      ctx,
      [
        { x: 16, y: -64 },
        { x: 48, y: -18 },
        { x: 34, y: 58 },
        { x: 0, y: 24 },
      ],
      this.dark,
      null,
    )

    drawPolygon(
      ctx,
      [
        { x: -28, y: -82 },
        { x: 22, y: -88 },
        { x: 46, y: -54 },
        { x: 8, y: -36 },
        { x: -36, y: -48 },
      ],
      this.type === 'polygonKing' ? '#f2c46d' : '#b8c1d1',
      'rgba(255,255,255,0.18)',
    )

    if (this.type === 'polygonKing') {
      drawPolygon(
        ctx,
        [
          { x: -20, y: -88 },
          { x: -4, y: -118 },
          { x: 12, y: -88 },
          { x: 28, y: -116 },
          { x: 42, y: -80 },
        ],
        '#ffdf6e',
        null,
      )
    }

    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(18, -58, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = this.accent
    ctx.beginPath()
    ctx.arc(18, -58, 2, 0, Math.PI * 2)
    ctx.fill()

    drawPolygon(
      ctx,
      [
        { x: -52, y: -22 },
        { x: -88, y: 16 },
        { x: -68, y: 36 },
        { x: -36, y: 10 },
      ],
      this.dark,
      null,
    )
    drawPolygon(
      ctx,
      [
        { x: 38, y: -12 },
        { x: 84, y: 8 },
        { x: 76, y: 38 },
        { x: 34, y: 22 },
      ],
      this.dark,
      null,
    )
    ctx.restore()
  }
}
