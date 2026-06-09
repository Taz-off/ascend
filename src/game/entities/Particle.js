import { randomBetween } from '../utils.js'

export class Particle {
  constructor(x, y, options = {}) {
    this.x = x
    this.y = y
    this.vx = options.vx ?? randomBetween(-120, 120)
    this.vy = options.vy ?? randomBetween(-180, -40)
    this.size = options.size ?? randomBetween(5, 12)
    this.color = options.color ?? '#ffffff'
    this.life = options.life ?? randomBetween(0.25, 0.55)
    this.maxLife = this.life
    this.gravity = options.gravity ?? 460
  }

  update(dt) {
    this.life -= dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vy += this.gravity * dt
  }

  draw(ctx, camera) {
    const alpha = Math.max(0, this.life / this.maxLife)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color
    ctx.translate(this.x - camera.x, this.y - camera.y)
    ctx.rotate((1 - alpha) * Math.PI)
    ctx.fillRect(-this.size * 0.5, -this.size * 0.5, this.size, this.size)
    ctx.restore()
  }
}
