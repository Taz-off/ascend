export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

export function centerOf(rect) {
  return {
    x: rect.x + rect.w * 0.5,
    y: rect.y + rect.h * 0.5,
  }
}

export function signOr(value, fallback = 1) {
  if (value > 0) return 1
  if (value < 0) return -1
  return fallback
}

export function createRect(x, y, w, h) {
  return { x, y, w, h }
}

export function drawPolygon(ctx, points, fill, stroke = 'rgba(255,255,255,0.08)') {
  if (points.length < 3) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

export function flashColor(base, flash, amount) {
  return amount > 0 ? flash : base
}
