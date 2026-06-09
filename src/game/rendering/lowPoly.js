import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants.js'
import { drawPolygon } from '../utils.js'

const THEMES = {
  meadow: {
    sky: ['#72c9ef', '#f3cf83'],
    far: ['#7bbd8d', '#66a47c', '#4d886a'],
    near: ['#3f8d69', '#2f7359', '#25614f'],
    ground: ['#58b66e', '#3f9658', '#2f774a'],
    edge: '#9fe38c',
    hazard: '#e45656',
    crystal: '#ffdb65',
  },
  forest: {
    sky: ['#5fb8d2', '#89d68f'],
    far: ['#58976b', '#386e56', '#2f5f4d'],
    near: ['#286f56', '#215443', '#183d37'],
    ground: ['#4aa15b', '#347b47', '#275d3c'],
    edge: '#82d66c',
    hazard: '#f05a58',
    crystal: '#ffd166',
  },
  cave: {
    sky: ['#3a3f5f', '#25273d'],
    far: ['#4b4a6c', '#393a5a', '#2d2b46'],
    near: ['#303047', '#27263c', '#1e2034'],
    ground: ['#6a6380', '#504c69', '#393956'],
    edge: '#a7a2d6',
    hazard: '#ff6b70',
    crystal: '#7ee6ff',
  },
  mountain: {
    sky: ['#7ec8eb', '#d2e8ee'],
    far: ['#8aa0a8', '#6f838f', '#566f7d'],
    near: ['#647b86', '#4d6875', '#405966'],
    ground: ['#7b8d92', '#60757c', '#465d66'],
    edge: '#d7f0f5',
    hazard: '#ef5f5f',
    crystal: '#ffe36c',
  },
  castle: {
    sky: ['#556078', '#272739'],
    far: ['#5b5266', '#493f58', '#372f47'],
    near: ['#40344b', '#312a3f', '#252033'],
    ground: ['#766778', '#5b5165', '#443d53'],
    edge: '#d4b978',
    hazard: '#ff5c64',
    crystal: '#f9c85c',
  },
}

export function themeFor(name) {
  return THEMES[name] || THEMES.meadow
}

export function drawBackground(ctx, level, camera, time) {
  const theme = themeFor(level.theme)
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, theme.sky[0])
  gradient.addColorStop(1, theme.sky[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawSunOrMoon(ctx, level.theme, time)
  drawMountains(ctx, camera, theme.far, 0.18, 260, 1)
  drawMountains(ctx, camera, theme.near, 0.34, 360, 2)
  drawLowClouds(ctx, level.theme, camera, time)
}

function drawSunOrMoon(ctx, themeName, time) {
  const isDark = themeName === 'cave' || themeName === 'castle'
  const x = 1080 + Math.sin(time * 0.1) * 14
  const y = isDark ? 112 : 94
  const radius = isDark ? 42 : 58

  ctx.save()
  ctx.globalAlpha = isDark ? 0.7 : 0.92
  ctx.fillStyle = isDark ? '#d9e3ff' : '#ffe89a'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawMountains(ctx, camera, palette, parallax, baseY, layer) {
  const offset = -(camera.x * parallax) % 520
  for (let x = offset - 620; x < CANVAS_WIDTH + 680; x += 520) {
    const peak = baseY - 170 - layer * 24 + ((x / 37) % 30)
    drawPolygon(
      ctx,
      [
        { x, y: CANVAS_HEIGHT },
        { x: x + 180, y: peak + 80 },
        { x: x + 330, y: peak },
        { x: x + 560, y: CANVAS_HEIGHT },
      ],
      palette[0],
      null,
    )
    drawPolygon(
      ctx,
      [
        { x: x + 180, y: peak + 80 },
        { x: x + 330, y: peak },
        { x: x + 408, y: CANVAS_HEIGHT },
      ],
      palette[1],
      null,
    )
    drawPolygon(
      ctx,
      [
        { x: x + 330, y: peak },
        { x: x + 560, y: CANVAS_HEIGHT },
        { x: x + 420, y: CANVAS_HEIGHT },
      ],
      palette[2],
      null,
    )
  }
}

function drawLowClouds(ctx, themeName, camera, time) {
  if (themeName === 'cave') {
    ctx.fillStyle = 'rgba(140, 224, 255, 0.08)'
  } else if (themeName === 'castle') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.08)'
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
  }

  const drift = (time * 16 - camera.x * 0.12) % 460
  for (let x = -460 + drift; x < CANVAS_WIDTH + 260; x += 460) {
    drawPolygon(
      ctx,
      [
        { x, y: 132 },
        { x: x + 82, y: 92 },
        { x: x + 190, y: 118 },
        { x: x + 238, y: 160 },
        { x: x + 34, y: 170 },
      ],
      ctx.fillStyle,
      null,
    )
  }
}

export function drawPlatform(ctx, platform, themeName, camera) {
  const theme = themeFor(themeName)
  const x = Math.round(platform.x - camera.x)
  const y = Math.round(platform.y - camera.y)
  const w = platform.w
  const h = platform.h
  const colors =
    platform.kind === 'wall'
      ? theme.near
      : platform.kind === 'elevator'
        ? ['#88e3d3', '#3ba99b', '#25736f']
        : platform.kind === 'shortcut'
          ? ['#f7d66f', '#bd8f2c', '#805b23']
          : theme.ground

  ctx.fillStyle = colors[1]
  ctx.fillRect(x, y, w, h)

  drawPolygon(
    ctx,
    [
      { x, y },
      { x: x + w, y },
      { x: x + w - 24, y: y + Math.min(34, h) },
      { x: x + 32, y: y + Math.min(42, h) },
    ],
    colors[0],
    null,
  )
  drawPolygon(
    ctx,
    [
      { x: x + w * 0.5, y: y + Math.min(22, h) },
      { x: x + w, y: y + 8 },
      { x: x + w, y: y + h },
      { x: x + w * 0.65, y: y + h },
    ],
    colors[2],
    null,
  )

  ctx.fillStyle = theme.edge
  ctx.fillRect(x, y - 4, w, 7)

  if (platform.kind === 'elevator') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 12, y + h * 0.5)
    ctx.lineTo(x + w - 12, y + h * 0.5)
    ctx.stroke()
  }

  if (platform.kind === 'shortcut') {
    ctx.fillStyle = '#fff2a8'
    ctx.fillRect(x + 10, y - 8, w - 20, 5)
  }
}

export function drawShortcutPreview(ctx, platform, themeName, camera, time) {
  const x = platform.x - camera.x
  const y = platform.y - camera.y
  const alpha = 0.15 + Math.sin(time * 4 + platform.x) * 0.04

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = themeFor(themeName).crystal
  ctx.fillRect(x, y, platform.w, platform.h)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.setLineDash([10, 8])
  ctx.strokeRect(x, y, platform.w, platform.h)
  ctx.restore()
}

export function drawShortcutTrigger(ctx, trigger, themeName, camera, time) {
  const theme = themeFor(themeName)
  const x = trigger.x - camera.x + trigger.w * 0.5
  const y = trigger.y - camera.y + trigger.h * 0.5
  const pulse = Math.sin(time * 5 + trigger.x) * 5
  const color = trigger.active ? '#59d0b2' : theme.crystal

  ctx.save()
  ctx.globalAlpha = trigger.active ? 0.45 : 0.85
  drawPolygon(
    ctx,
    [
      { x, y: y - 24 - pulse * 0.2 },
      { x: x + 22, y },
      { x, y: y + 24 + pulse * 0.2 },
      { x: x - 22, y },
    ],
    color,
    'rgba(255,255,255,0.35)',
  )
  ctx.globalAlpha = trigger.active ? 0.18 : 0.28
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 40 + pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawHazard(ctx, hazard, themeName, camera, time) {
  const theme = themeFor(themeName)
  const x = hazard.x - camera.x
  const y = hazard.y - camera.y
  const spikeCount = Math.max(2, Math.floor(hazard.w / 28))
  const spikeW = hazard.w / spikeCount

  ctx.fillStyle = 'rgba(80, 20, 30, 0.36)'
  ctx.fillRect(x, y + hazard.h - 8, hazard.w, 10)

  for (let index = 0; index < spikeCount; index += 1) {
    const left = x + index * spikeW
    const wave = Math.sin(time * 6 + index) * 3
    drawPolygon(
      ctx,
      [
        { x: left, y: y + hazard.h },
        { x: left + spikeW * 0.5, y: y + wave },
        { x: left + spikeW, y: y + hazard.h },
      ],
      theme.hazard,
      'rgba(255,255,255,0.14)',
    )
  }
}

export function drawFragment(ctx, fragment, themeName, camera, time) {
  const theme = themeFor(themeName)
  const x = fragment.x - camera.x
  const y = fragment.y - camera.y + Math.sin(time * 5 + fragment.x) * 6
  const glow = 0.35 + Math.sin(time * 4 + fragment.x) * 0.12

  ctx.save()
  ctx.globalAlpha = glow
  ctx.fillStyle = theme.crystal
  ctx.beginPath()
  ctx.arc(x, y, 27, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  drawPolygon(
    ctx,
    [
      { x, y: y - 18 },
      { x: x + 16, y },
      { x, y: y + 22 },
      { x: x - 16, y },
    ],
    theme.crystal,
    'rgba(255,255,255,0.45)',
  )
  drawPolygon(
    ctx,
    [
      { x, y: y - 18 },
      { x: x + 16, y },
      { x, y },
    ],
    '#fff0a6',
    null,
  )
}

export function drawCheckpoint(ctx, checkpoint, camera, time) {
  const x = checkpoint.x - camera.x
  const y = checkpoint.y - camera.y
  const active = checkpoint.active
  const flagColor = active ? '#59d0b2' : '#f7f0de'

  ctx.fillStyle = '#263246'
  ctx.fillRect(x - 5, y - 78, 10, 88)
  drawPolygon(
    ctx,
    [
      { x: x + 5, y: y - 76 },
      { x: x + 62, y: y - 55 + Math.sin(time * 6) * 3 },
      { x: x + 5, y: y - 33 },
    ],
    flagColor,
    'rgba(255,255,255,0.18)',
  )
  drawPolygon(
    ctx,
    [
      { x: x - 18, y: y + 10 },
      { x: x + 18, y: y + 10 },
      { x: x + 10, y: y + 24 },
      { x: x - 10, y: y + 24 },
    ],
    '#2a3444',
    null,
  )
}

export function drawGoal(ctx, goal, themeName, camera, time, open) {
  const x = goal.x - camera.x
  const y = goal.y - camera.y
  const theme = themeFor(themeName)
  const pulse = 1 + Math.sin(time * 4) * 0.05

  ctx.save()
  ctx.translate(x + goal.w * 0.5, y + goal.h * 0.5)
  ctx.scale(pulse, pulse)
  ctx.globalAlpha = open ? 0.95 : 0.38
  ctx.fillStyle = open ? theme.crystal : '#a0a7b8'
  ctx.beginPath()
  ctx.ellipse(0, 0, goal.w * 0.45, goal.h * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = open ? 0.72 : 0.28
  ctx.fillStyle = open ? '#ffffff' : '#d1d5db'
  ctx.beginPath()
  ctx.ellipse(0, 0, goal.w * 0.24, goal.h * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#2b3345'
  ctx.fillRect(x - 8, y + goal.h - 18, goal.w + 16, 18)
}
