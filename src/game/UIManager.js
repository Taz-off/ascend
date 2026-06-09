import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants.js'

export class UIManager {
  draw(ctx, game) {
    if (!game.player || !game.levelManager.level) return

    this.drawTopBar(ctx, game)
    this.drawBossBars(ctx, game)
    this.drawDamageVignette(ctx, game)
  }

  drawTopBar(ctx, game) {
    const player = game.player
    const x = 28
    const y = 24
    const panelWidth = 520
    const panelHeight = 112

    ctx.save()
    ctx.fillStyle = 'rgba(13, 18, 30, 0.68)'
    this.roundRect(ctx, x, y, panelWidth, panelHeight, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.stroke()

    this.drawHealthBar(ctx, x + 18, y + 18, 180, 18, player.health, player.maxHealth)
    this.drawRechargeBar(
      ctx,
      x + 18,
      y + 50,
      180,
      16,
      1 - player.dashCooldown / player.dashCooldownDuration,
      'DASH',
      '#59d0b2',
    )
    this.drawRechargeBar(
      ctx,
      x + 18,
      y + 77,
      180,
      16,
      1 - player.parryCooldown / player.parryCooldownDuration,
      'PARADE',
      '#ffdf6e',
    )

    ctx.font = '900 18px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#ffdb65'
    ctx.fillText(`Fragments ${player.fragments}`, x + 228, y + 36)

    ctx.fillStyle = '#9cebd6'
    ctx.font = '900 18px Inter, system-ui, sans-serif'
    if (game.speedrun.active) {
      ctx.fillText(
        `Speedrun ${this.formatTime(game.timer.globalTime)}  ${game.levelManager.currentIndex + 1}/10`,
        x + 228,
        y + 72,
      )
    } else {
      ctx.fillText(`Chrono ${this.formatTime(game.timer.levelTime)}`, x + 228, y + 72)
    }
    ctx.restore()
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const wholeSeconds = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 1000)
    return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
  }

  drawHealthBar(ctx, x, y, width, height, health, maxHealth) {
    const ratio = health / maxHealth
    ctx.fillStyle = '#2a3041'
    this.roundRect(ctx, x, y, width, height, 7)
    ctx.fill()
    if (ratio > 0) {
      ctx.fillStyle = '#ff5c6c'
      this.roundRect(ctx, x, y, width * Math.min(1, ratio), height, 7)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.stroke()

    ctx.fillStyle = '#f8fafc'
    ctx.font = '800 12px Inter, system-ui, sans-serif'
    ctx.fillText(`VIE ${health}/${maxHealth}`, x + 10, y + 13)
  }

  drawRechargeBar(ctx, x, y, width, height, ratio, label, color) {
    const ready = ratio >= 1
    const fill = Math.max(0, Math.min(1, ratio))

    ctx.fillStyle = '#2a3041'
    this.roundRect(ctx, x, y, width, height, 7)
    ctx.fill()
    if (fill > 0) {
      ctx.fillStyle = ready ? color : '#5b667a'
      this.roundRect(ctx, x, y, width * fill, height, 7)
      ctx.fill()
    }
    ctx.strokeStyle = ready ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)'
    ctx.stroke()

    ctx.fillStyle = ready ? '#10211d' : '#f8fafc'
    ctx.font = '800 12px Inter, system-ui, sans-serif'
    ctx.fillText(label, x + 10, y + 12)
  }

  drawBossBars(ctx, game) {
    const bosses = game.levelManager.aliveBosses()
    bosses.forEach((boss, index) => {
      const width = 430
      const height = 18
      const x = CANVAS_WIDTH * 0.5 - width * 0.5
      const y = CANVAS_HEIGHT - 54 - index * 34
      const ratio = boss.health / boss.maxHealth

      ctx.save()
      ctx.fillStyle = 'rgba(13, 18, 30, 0.72)'
      this.roundRect(ctx, x - 14, y - 26, width + 28, 54, 8)
      ctx.fill()
      ctx.fillStyle = '#f8fafc'
      ctx.font = '900 15px Inter, system-ui, sans-serif'
      ctx.fillText(boss.name, x, y - 8)
      ctx.fillStyle = '#312333'
      this.roundRect(ctx, x, y, width, height, 7)
      ctx.fill()
      ctx.fillStyle = boss.accent
      this.roundRect(ctx, x, y, width * Math.max(0, ratio), height, 7)
      ctx.fill()
      ctx.restore()
    })
  }

  drawDamageVignette(ctx, game) {
    if (game.player.invincible <= 0) return
    const alpha = Math.min(0.18, game.player.invincible * 0.12)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ff3344'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.restore()
  }

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }
}
