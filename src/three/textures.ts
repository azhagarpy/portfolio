import * as THREE from 'three'
import { mulberry32 } from '../lib/math'

export const TITLE_FONT = "'Bungee', 'Arial Black', sans-serif"
export const BODY_FONT = "'Outfit', 'Segoe UI', sans-serif"

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxW: number, px: number) {
  let size = px
  ctx.font = font(size)
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2
    ctx.font = font(size)
  }
  return size
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Bright daytime billboard / sign */
export function signTexture(o: {
  title: string
  kicker?: string
  lines?: string[]
  bg: string
  fg: string
  accent: string
  w?: number
  h?: number
}) {
  const w = o.w ?? 1024
  const h = o.h ?? 512
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = o.bg
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = o.accent
    ctx.fillRect(0, 0, w, h * 0.06)
    ctx.fillRect(0, h * 0.94, w, h * 0.06)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const hasLines = o.lines && o.lines.length > 0
    let y = hasLines ? h * 0.36 : h * 0.52
    if (o.kicker) {
      ctx.fillStyle = o.accent
      fitText(ctx, o.kicker, (s) => `600 ${s}px ${BODY_FONT}`, w * 0.85, h * 0.1)
      ctx.fillText(o.kicker.toUpperCase(), w / 2, hasLines ? h * 0.18 : h * 0.28)
      if (!hasLines) y = h * 0.58
    }
    ctx.fillStyle = o.fg
    fitText(ctx, o.title, (s) => `${s}px ${TITLE_FONT}`, w * 0.88, h * (hasLines ? 0.2 : 0.26))
    ctx.fillText(o.title, w / 2, y)
    if (hasLines) {
      ctx.fillStyle = o.fg
      ctx.globalAlpha = 0.85
      o.lines!.forEach((line, i) => {
        fitText(ctx, line, (s) => `500 ${s}px ${BODY_FONT}`, w * 0.86, h * 0.085)
        ctx.fillText(line, w / 2, h * 0.58 + i * h * 0.12)
      })
      ctx.globalAlpha = 1
    }
  })
}

/** Neon tube sign on a dark backing */
export function neonTexture(text: string, color: string, sub?: string, w = 1024, h = 320) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#07040f'
    roundRect(ctx, 6, 6, w - 12, h - 12, 28)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 8
    ctx.shadowColor = color
    ctx.shadowBlur = 24
    roundRect(ctx, 22, 22, w - 44, h - 44, 20)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 30
    fitText(ctx, text, (s) => `${s}px ${TITLE_FONT}`, w * 0.84, h * (sub ? 0.32 : 0.42))
    ctx.fillText(text, w / 2, sub ? h * 0.42 : h * 0.52)
    ctx.fillStyle = color
    ctx.shadowBlur = 12
    ctx.fillText(text, w / 2, sub ? h * 0.42 : h * 0.52)
    if (sub) {
      ctx.fillStyle = '#ffffff'
      fitText(ctx, sub, (s) => `600 ${s}px ${BODY_FONT}`, w * 0.8, h * 0.13)
      ctx.fillText(sub, w / 2, h * 0.74)
    }
  })
}

export function plaidTexture() {
  const t = canvasTexture(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = '#eef2f7'
      ctx.fillRect(0, 0, 128, 128)
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#a9b9d4'
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(i * 32 + 4, 0, 14, 128)
        ctx.fillRect(0, i * 32 + 4, 128, 14)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#5d7bb0'
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(i * 32 + 24, 0, 2, 128)
        ctx.fillRect(0, i * 32 + 24, 128, 2)
      }
    },
    true,
  )
  t.repeat.set(1.5, 1.5)
  return t
}

export type RoadKind = 'asphalt' | 'dirt' | 'city' | 'neon' | 'bridge' | 'snow' | 'mars'

export function roadTexture(kind: RoadKind) {
  const W = 256
  const H = 512
  const rnd = mulberry32(kind.length * 97 + 11)
  const t = canvasTexture(
    W,
    H,
    (ctx) => {
      const base: Record<RoadKind, string> = {
        asphalt: '#3b3e45',
        dirt: '#8b6a45',
        city: '#30333a',
        neon: '#120d1f',
        bridge: '#3d4049',
        snow: '#cfdbe8',
        mars: '#94503a',
      }
      ctx.fillStyle = base[kind]
      ctx.fillRect(0, 0, W, H)
      // grain
      for (let i = 0; i < 2600; i++) {
        const v = rnd()
        ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'
        ctx.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3)
      }
      const edge = (color: string, x: number, width: number) => {
        ctx.fillStyle = color
        ctx.fillRect(x, 0, width, H)
      }
      const dashes = (color: string, x: number, width: number, on = 0.45) => {
        ctx.fillStyle = color
        ctx.fillRect(x - width / 2, 0, width, H * on)
      }
      switch (kind) {
        case 'asphalt':
          edge('#e9e9e9', 12, 7)
          edge('#e9e9e9', W - 19, 7)
          dashes('#f2c230', W / 2, 8)
          break
        case 'city':
        case 'bridge':
          edge('#f0f0f0', 12, 7)
          edge('#f0f0f0', W - 19, 7)
          dashes('#f0f0f0', W / 2, 7)
          break
        case 'neon':
          edge('#ff2fd0', 8, 10)
          edge('#ff2fd0', W - 18, 10)
          dashes('#19f0ff', W / 2, 9, 0.5)
          break
        case 'dirt':
          ctx.fillStyle = 'rgba(70,48,25,0.45)'
          ctx.fillRect(W * 0.24, 0, 26, H)
          ctx.fillRect(W * 0.66, 0, 26, H)
          ctx.fillStyle = '#4f7a35'
          for (let y = 0; y < H; y += 6) {
            ctx.fillRect(0, y, 8 + rnd() * 16, 5)
            ctx.fillRect(W - 8 - rnd() * 16, y, 24, 5)
          }
          break
        case 'snow':
          ctx.fillStyle = 'rgba(120,140,170,0.35)'
          ctx.fillRect(W * 0.24, 0, 24, H)
          ctx.fillRect(W * 0.66, 0, 24, H)
          edge('#ffffff', 0, 18)
          edge('#ffffff', W - 18, 18)
          break
        case 'mars':
          edge('#ffcf5a', 12, 6)
          edge('#ffcf5a', W - 18, 6)
          ctx.fillStyle = 'rgba(60,20,10,0.3)'
          ctx.fillRect(W * 0.25, 0, 30, H)
          ctx.fillRect(W * 0.63, 0, 30, H)
          break
      }
    },
    true,
  )
  return t
}

export function checkerTexture() {
  return canvasTexture(512, 64, (ctx) => {
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 2; y++) {
        ctx.fillStyle = (x + y) % 2 ? '#111' : '#fafafa'
        ctx.fillRect(x * 32, y * 32, 32, 32)
      }
  })
}

export function verticalLabel(text: string, color: string) {
  return canvasTexture(128, 640, (ctx) => {
    ctx.clearRect(0, 0, 128, 640)
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `86px ${TITLE_FONT}`
    const chars = text.split('')
    chars.forEach((ch, i) => ctx.fillText(ch, 64, 60 + i * (520 / Math.max(1, chars.length - 1))))
  })
}
