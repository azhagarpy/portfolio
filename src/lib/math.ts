export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const remap = (v: number, a: number, b: number) => clamp((v - a) / (b - a))

export function smoothstep(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Trapezoidal velocity profile: accelerate, cruise, brake. Returns position 0..1. */
export function cruiseEase(t: number, ramp = 0.16) {
  t = clamp(t)
  const v = 1 / (1 - ramp)
  if (t < ramp) return (0.5 * v * t * t) / ramp
  if (t > 1 - ramp) return 1 - (0.5 * v * (1 - t) * (1 - t)) / ramp
  return 0.5 * v * ramp + v * (t - ramp)
}

/** Velocity of cruiseEase normalised to 0..1 */
export function cruiseSpeed(t: number, ramp = 0.16) {
  t = clamp(t)
  if (t < ramp) return t / ramp
  if (t > 1 - ramp) return (1 - t) / ramp
  return 1
}

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

export function angleDiff(a: number, b: number) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randRange = (r: () => number, a: number, b: number) => a + (b - a) * r()

function hash2(ix: number, iy: number) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

export function noise2(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy)
}

export function fbm(x: number, y: number, octaves = 4) {
  let amp = 0.5
  let freq = 1
  let sum = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq)
    freq *= 2.03
    amp *= 0.5
  }
  return sum / (1 - Math.pow(0.5, octaves))
}
