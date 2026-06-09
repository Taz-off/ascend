import { GRAVITY } from '../constants.js'
import { clamp, drawPolygon, rectsOverlap, signOr } from '../utils.js'

const ATTACKS = [
  { duration: 0.22, active: 0.16, cooldown: 0.09, damage: 1, reach: 82 },
  { duration: 0.25, active: 0.18, cooldown: 0.1, damage: 1, reach: 94 },
  { duration: 0.32, active: 0.22, cooldown: 0.16, damage: 2, reach: 112 },
]

export class Player {
  constructor(spawn) {
    this.w = 42
    this.h = 70
    this.maxHealth = 8
    this.health = this.maxHealth
    this.fragments = 0
    this.nextHealFragment = 5
    this.attackSerial = 0
    this.dashCooldownDuration = 0.48
    this.parryCooldownDuration = 1.15
    this.reset(spawn)
  }

  reset(spawn) {
    this.x = spawn.x
    this.y = spawn.y
    this.vx = 0
    this.vy = 0
    this.facing = 1
    this.onGround = false
    this.wallSide = 0
    this.canDoubleJump = true
    this.coyote = 0
    this.dashTime = 0
    this.dashCooldown = 0
    this.parryTime = 0
    this.parryCooldown = 0
    this.parrySuccessTime = 0
    this.attackTime = 0
    this.attackDuration = 0
    this.attackCooldown = 0
    this.comboStep = 0
    this.comboWindow = 0
    this.hitTargets = new Set()
    this.invincible = 0
    this.hitStun = 0
    this.dead = false
    this.deathTimer = 0
    this.animationTime = 0
  }

  bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h }
  }

  center() {
    return { x: this.x + this.w * 0.5, y: this.y + this.h * 0.5 }
  }

  update(game, dt) {
    this.animationTime += dt
    this.invincible = Math.max(0, this.invincible - dt)
    this.hitStun = Math.max(0, this.hitStun - dt)
    this.dashCooldown = Math.max(0, this.dashCooldown - dt)
    this.parryTime = Math.max(0, this.parryTime - dt)
    this.parryCooldown = Math.max(0, this.parryCooldown - dt)
    this.parrySuccessTime = Math.max(0, this.parrySuccessTime - dt)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)
    this.comboWindow = Math.max(0, this.comboWindow - dt)

    if (this.health <= 0) {
      this.dead = true
      this.deathTimer += dt
      this.vx *= 0.95
      this.vy += GRAVITY * dt
      this.moveAndCollide(game, dt)
      return
    }

    if (game.input.isPressed('attack')) {
      this.startAttack(game)
    }

    if (game.input.isPressed('parry')) {
      this.startParry(game)
    }

    if (this.attackTime > 0) {
      this.attackTime = Math.max(0, this.attackTime - dt)
    }

    if (this.hitStun <= 0) {
      this.handleMovement(game, dt)
    } else {
      this.vy += GRAVITY * dt
    }

    this.moveAndCollide(game, dt)
  }

  handleMovement(game, dt) {
    const input = game.input
    const move = input.axisX()

    if (move !== 0) {
      this.facing = move
    }

    if (input.isPressed('dash') && this.dashCooldown <= 0) {
      this.startDash(input, game)
    }

    if (this.parryTime > 0) {
      this.vx *= this.onGround ? 0.72 : 0.9
      this.vy += GRAVITY * dt
      return
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt
      if (this.dashTime <= 0) {
        this.vx *= 0.45
        this.vy *= 0.4
      }
      return
    }

    const targetSpeed = move * 350
    const acceleration = this.onGround ? 2700 : 1850
    const friction = this.onGround ? 2800 : 720

    if (move !== 0) {
      this.vx += clamp(targetSpeed - this.vx, -acceleration * dt, acceleration * dt)
    } else {
      this.vx += clamp(-this.vx, -friction * dt, friction * dt)
    }

    this.vy += GRAVITY * dt
    if (input.isDown('up') && this.vy > 260 && !input.isDown('down')) {
      this.vy = Math.min(this.vy, 540)
    }
    if (input.isDown('down') && this.vy > 0) {
      this.vy += GRAVITY * 0.55 * dt
    }

    if (this.onGround) {
      this.coyote = 0.1
      this.canDoubleJump = true
    } else {
      this.coyote = Math.max(0, this.coyote - dt)
    }

    if (input.isPressed('up')) {
      this.tryJump(game)
    }
  }

  tryJump(game) {
    if (this.onGround || this.coyote > 0) {
      this.vy = -780
      this.onGround = false
      this.coyote = 0
      game.audio.playSfx('jump')
      return
    }

    if (this.wallSide !== 0) {
      this.vy = -730
      this.vx = -this.wallSide * 520
      this.facing = -this.wallSide
      this.canDoubleJump = true
      game.audio.playSfx('doubleJump')
      return
    }

    if (this.canDoubleJump) {
      this.vy = -700
      this.canDoubleJump = false
      game.audio.playSfx('doubleJump')
    }
  }

  startDash(input, game) {
    const axisX = input.axisX() || this.facing
    const axisY = input.axisY()
    const length = Math.hypot(axisX, axisY) || 1
    const speed = 820

    this.vx = (axisX / length) * speed
    this.vy = (axisY / length) * speed * 0.72
    this.dashTime = 0.15
    this.dashCooldown = this.dashCooldownDuration
    this.invincible = Math.max(this.invincible, 0.1)
    game.audio.playSfx('dash')
  }

  startAttack(game) {
    if (
      this.parryTime > 0 ||
      this.attackCooldown > 0 ||
      this.attackTime > this.attackDuration * 0.35
    ) {
      return
    }

    if (this.comboWindow <= 0) {
      this.comboStep = 0
    } else {
      this.comboStep = (this.comboStep + 1) % ATTACKS.length
    }

    const attack = ATTACKS[this.comboStep]
    this.attackSerial += 1
    this.attackDuration = attack.duration
    this.attackTime = attack.duration
    this.attackCooldown = attack.cooldown
    this.comboWindow = 0.55
    this.hitTargets = new Set()
    game.audio.playSfx('sword')
  }

  startParry(game) {
    if (this.parryCooldown > 0 || this.attackTime > 0 || this.dashTime > 0) {
      return
    }

    this.parryTime = 0.28
    this.parryCooldown = this.parryCooldownDuration
    this.parrySuccessTime = 0
    this.vx *= 0.45
    game.audio.playSfx('parry')
  }

  tryParryHit(sourceX = this.x) {
    if (this.parryTime <= 0 || this.health <= 0) {
      return false
    }

    const sourceDirection = signOr(sourceX - this.center().x, this.facing)
    if (sourceDirection !== this.facing) {
      return false
    }

    this.parryTime = 0.12
    this.parrySuccessTime = 0.22
    this.invincible = Math.max(this.invincible, 0.18)
    this.vx = -sourceDirection * 120
    this.vy = Math.min(this.vy, -130)
    return true
  }

  isAttackActive() {
    if (this.attackTime <= 0) return false
    const attack = ATTACKS[this.comboStep]
    return this.attackTime <= attack.active
  }

  attackBox() {
    const attack = ATTACKS[this.comboStep]
    const h = this.comboStep === 2 ? 70 : 58
    const y = this.y + 10
    const x = this.facing > 0 ? this.x + this.w - 8 : this.x - attack.reach + 8

    return {
      x,
      y,
      w: attack.reach,
      h,
      damage: attack.damage,
      id: this.attackSerial,
    }
  }

  moveAndCollide(game, dt) {
    this.wallSide = 0

    this.x += this.vx * dt
    const wallHit = game.levelManager.resolveEntityX(this)
    if (wallHit !== 0) {
      this.wallSide = wallHit
    }

    this.y += this.vy * dt
    this.onGround = false
    const groundHit = game.levelManager.resolveEntityY(this)
    if (groundHit === 1) {
      this.onGround = true
      this.canDoubleJump = true
    }

    if (!this.onGround) {
      const probeWall = game.levelManager.getWallSide(this)
      if (probeWall !== 0) {
        this.wallSide = probeWall
      }
    }
  }

  takeDamage(amount, sourceX = this.x) {
    if (this.invincible > 0 || this.health <= 0) {
      return false
    }

    this.health = Math.max(0, this.health - amount)
    this.invincible = 0.9
    this.hitStun = 0.18
    const dir = signOr(this.center().x - sourceX, this.facing)
    this.vx = dir * 420
    this.vy = -430
    return true
  }

  healFull() {
    this.health = this.maxHealth
    this.dead = false
    this.deathTimer = 0
  }

  draw(ctx, camera) {
    const cx = this.x - camera.x + this.w * 0.5
    const cy = this.y - camera.y + this.h * 0.5
    const blink = this.invincible > 0 && Math.floor(this.invincible * 18) % 2 === 0
    if (blink) return

    ctx.save()
    ctx.translate(cx, cy)
    if (this.facing < 0) {
      ctx.scale(-1, 1)
    }

    const state = this.animationState()
    const runWave = Math.sin(this.animationTime * 18)
    const squash = state === 'idle' ? Math.sin(this.animationTime * 3) * 1.5 : 0
    const hurtTint = this.hitStun > 0 ? '#ffffff' : '#65d6b1'
    const body = this.health <= 0 ? '#8f9bb3' : hurtTint
    const dark = this.health <= 0 ? '#5f687b' : '#2a6e77'

    if (this.dashTime > 0) {
      ctx.globalAlpha = 0.32
      drawPolygon(
        ctx,
        [
          { x: -58, y: 20 },
          { x: -18, y: -24 },
          { x: 12, y: 26 },
        ],
        '#ffffff',
        null,
      )
      ctx.globalAlpha = 1
    }

    const legOffset = state === 'run' ? runWave * 8 : state === 'jump' ? -9 : 3
    drawPolygon(
      ctx,
      [
        { x: -15, y: 22 },
        { x: -2, y: 20 },
        { x: -4 + legOffset, y: 42 },
        { x: -20 + legOffset * 0.2, y: 42 },
      ],
      dark,
      null,
    )
    drawPolygon(
      ctx,
      [
        { x: 4, y: 21 },
        { x: 17, y: 23 },
        { x: 19 - legOffset, y: 42 },
        { x: 4 - legOffset * 0.2, y: 41 },
      ],
      '#1f4f66',
      null,
    )

    drawPolygon(
      ctx,
      [
        { x: -22, y: -18 + squash },
        { x: 10, y: -27 + squash },
        { x: 25, y: 10 + squash },
        { x: 2, y: 30 + squash },
        { x: -24, y: 20 + squash },
      ],
      body,
      'rgba(255,255,255,0.16)',
    )
    drawPolygon(
      ctx,
      [
        { x: 4, y: -26 + squash },
        { x: 25, y: 9 + squash },
        { x: 4, y: 30 + squash },
      ],
      '#3aa0a3',
      null,
    )

    drawPolygon(
      ctx,
      [
        { x: -13, y: -48 + squash },
        { x: 14, y: -50 + squash },
        { x: 26, y: -31 + squash },
        { x: 5, y: -16 + squash },
        { x: -18, y: -24 + squash },
      ],
      '#f8d8a9',
      'rgba(255,255,255,0.16)',
    )
    drawPolygon(
      ctx,
      [
        { x: -16, y: -48 + squash },
        { x: 13, y: -58 + squash },
        { x: 28, y: -36 + squash },
        { x: 4, y: -42 + squash },
      ],
      '#28364d',
      null,
    )

    const armLift = this.attackTime > 0 ? -22 : state === 'run' ? -runWave * 6 : 0
    drawPolygon(
      ctx,
      [
        { x: 16, y: -12 },
        { x: 31, y: -7 + armLift },
        { x: 24, y: 8 + armLift },
        { x: 10, y: 8 },
      ],
      '#f3c998',
      null,
    )

    this.drawSword(ctx)
    this.drawParry(ctx)
    ctx.restore()
  }

  drawSword(ctx) {
    if (this.attackTime <= 0) {
      drawPolygon(
        ctx,
        [
          { x: 27, y: 7 },
          { x: 37, y: 2 },
          { x: 43, y: -61 },
          { x: 34, y: -66 },
        ],
        '#cbd5e1',
        null,
      )
      drawPolygon(
        ctx,
        [
          { x: 21, y: 4 },
          { x: 43, y: -3 },
          { x: 44, y: 7 },
          { x: 23, y: 13 },
        ],
        '#475569',
        null,
      )
      return
    }

    const progress = 1 - this.attackTime / this.attackDuration
    const angle = -0.9 + progress * 2.1
    ctx.save()
    ctx.rotate(angle)
    drawPolygon(
      ctx,
      [
        { x: 22, y: -5 },
        { x: 100 + this.comboStep * 12, y: -10 },
        { x: 108 + this.comboStep * 12, y: 0 },
        { x: 24, y: 8 },
      ],
      this.comboStep === 2 ? '#fff2a8' : '#dbeafe',
      'rgba(255,255,255,0.42)',
    )
    ctx.globalAlpha = 0.34
    drawPolygon(
      ctx,
      [
        { x: 35, y: -34 },
        { x: 118 + this.comboStep * 10, y: -8 },
        { x: 42, y: 34 },
      ],
      this.comboStep === 2 ? '#ffd166' : '#ffffff',
      null,
    )
    ctx.restore()
  }

  drawParry(ctx) {
    if (this.parryTime <= 0 && this.parrySuccessTime <= 0) return

    const success = this.parrySuccessTime > 0
    const alpha = success ? 0.52 : 0.3 + this.parryTime * 0.5
    const color = success ? '#ffdf6e' : '#9cebd6'

    ctx.save()
    ctx.globalAlpha = alpha
    drawPolygon(
      ctx,
      [
        { x: 36, y: -54 },
        { x: 72, y: -28 },
        { x: 72, y: 26 },
        { x: 34, y: 48 },
        { x: 20, y: -2 },
      ],
      color,
      'rgba(255,255,255,0.45)',
    )
    ctx.globalAlpha = Math.min(0.8, alpha + 0.16)
    drawPolygon(
      ctx,
      [
        { x: 30, y: -42 },
        { x: 54, y: -22 },
        { x: 54, y: 21 },
        { x: 30, y: 35 },
      ],
      'rgba(255,255,255,0.55)',
      null,
    )
    ctx.restore()
  }

  animationState() {
    if (this.health <= 0) return 'die'
    if (this.hitStun > 0) return 'hurt'
    if (this.dashTime > 0) return 'dash'
    if (this.parryTime > 0) return 'parry'
    if (this.attackTime > 0) return 'attack'
    if (!this.onGround && this.vy < 0) return 'jump'
    if (!this.onGround && this.vy >= 0) return 'fall'
    if (Math.abs(this.vx) > 40) return 'run'
    return 'idle'
  }
}
