import * as THREE from 'three'
import { alongRoad, boundaryU, nearestRoad, roadDir, roadPoint, roadYaw, zoneU } from '../../lib/journey'
import { mulberry32 } from '../../lib/math'
import { merged, part } from '../geo'
import { terrainHeight } from '../Terrain'

const cache = new Map<string, THREE.BufferGeometry>()
function once(key: string, f: () => THREE.BufferGeometry) {
  let g = cache.get(key)
  if (!g) {
    g = f()
    cache.set(key, g)
  }
  return g
}

const TRUNK = '#6b4a2f'

export const pineGeo = (snowy = false) =>
  once('pine' + snowy, () => {
    const parts = [part(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6), TRUNK, [0, 1.1, 0])]
    const tiers: [number, number, number][] = [
      [2.3, 3.2, 3.1],
      [1.75, 2.8, 4.7],
      [1.15, 2.3, 6.1],
    ]
    tiers.forEach(([r, h, y], i) => {
      parts.push(part(new THREE.ConeGeometry(r, h, 7), i % 2 ? '#2f6e35' : '#3a8040', [0, y, 0]))
      if (snowy) parts.push(part(new THREE.ConeGeometry(r * 0.72, h * 0.55, 7), '#f7fbff', [0, y + h * 0.26, 0]))
    })
    return merged(parts)
  })

export const roundTreeGeo = (leaf = '#4f9a3e', leaf2 = '#5fae47') =>
  once('round' + leaf, () =>
    merged([
      part(new THREE.CylinderGeometry(0.25, 0.35, 2.6, 6), TRUNK, [0, 1.3, 0]),
      part(new THREE.IcosahedronGeometry(2.1, 0), leaf, [0, 3.9, 0]),
      part(new THREE.IcosahedronGeometry(1.4, 0), leaf2, [0.9, 4.9, 0.4]),
      part(new THREE.IcosahedronGeometry(1.2, 0), leaf2, [-1.0, 4.4, -0.5]),
    ]),
  )

export const palmGeo = () =>
  once('palm', () => {
    const parts: THREE.BufferGeometry[] = []
    let x = 0
    let y = 0
    const segs = 6
    for (let i = 0; i < segs; i++) {
      const lean = 0.08 + i * 0.045
      const len = 1.35
      const cx = x + Math.sin(lean) * len * 0.5
      const cy = y + Math.cos(lean) * len * 0.5
      parts.push(part(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.26 - i * 0.012, len, 6), i % 2 ? '#8a6a45' : '#7a5b3a', [cx, cy, 0], [0, 0, -lean]))
      x += Math.sin(lean) * len
      y += Math.cos(lean) * len
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      const leaf = new THREE.BoxGeometry(0.55, 0.06, 3.0)
      leaf.translate(0, 0, 1.5)
      leaf.rotateX(0.45)
      parts.push(part(leaf, k % 2 ? '#3f8f3a' : '#4fa645', [x, y, 0], [0, a, 0]))
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      parts.push(part(new THREE.IcosahedronGeometry(0.2, 0), '#6b4a1f', [x + Math.cos(a) * 0.25, y - 0.25, Math.sin(a) * 0.25]))
    }
    return merged(parts)
  })

export const rockGeo = (color = '#8a8d91') =>
  once('rock' + color, () => merged([part(new THREE.DodecahedronGeometry(1, 0), color, [0, 0.35, 0], [0.3, 0.6, 0], [1.2, 0.7, 1])]))

export const snowRockGeo = () =>
  once('snowrock', () =>
    merged([
      part(new THREE.DodecahedronGeometry(1, 0), '#8796a8', [0, 0.35, 0], [0.3, 0.6, 0], [1.2, 0.7, 1]),
      part(new THREE.DodecahedronGeometry(0.85, 0), '#ffffff', [0, 0.62, 0], [0.3, 0.6, 0], [1.1, 0.38, 0.92]),
    ]),
  )

export const mushroomGeo = () =>
  once('mushroom', () =>
    merged([
      part(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 6), '#f3ead8', [0, 0.25, 0]),
      part(new THREE.SphereGeometry(0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#d8322b', [0, 0.48, 0]),
      part(new THREE.IcosahedronGeometry(0.07, 0), '#ffffff', [0.18, 0.78, 0.1]),
      part(new THREE.IcosahedronGeometry(0.06, 0), '#ffffff', [-0.15, 0.74, -0.15]),
    ]),
  )

export const logGeo = () =>
  once('log', () =>
    merged([
      part(new THREE.CylinderGeometry(0.4, 0.4, 4, 8), '#6b4a2f', [0, 0.4, 0], [0, 0, Math.PI / 2]),
      part(new THREE.CylinderGeometry(0.33, 0.33, 4.02, 8), '#c9a06a', [0, 0.4, 0], [0, 0, Math.PI / 2], [1, 1, 1]),
    ]),
  )

export const lampGeo = (lampColor = '#fff3c4') =>
  once('lamp' + lampColor, () =>
    merged([
      part(new THREE.CylinderGeometry(0.1, 0.14, 6.5, 6), '#3c4048', [0, 3.25, 0]),
      part(new THREE.BoxGeometry(0.12, 0.12, 1.8), '#3c4048', [0, 6.4, 0.85]),
      part(new THREE.BoxGeometry(0.5, 0.18, 0.7), '#2a2d33', [0, 6.32, 1.65]),
      part(new THREE.BoxGeometry(0.4, 0.05, 0.55), lampColor, [0, 6.2, 1.65]),
    ]),
  )

export const houseGeo = () =>
  once('house', () => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  })

export const roofGeo = () =>
  once('roof', () => {
    const g = new THREE.ConeGeometry(0.78, 0.55, 4)
    g.rotateY(Math.PI / 4)
    g.translate(0, 1.27, 0)
    return g
  })

export const boxBaseGeo = () =>
  once('boxbase', () => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  })

export const coneGeo = () => once('cone', () => new THREE.ConeGeometry(1, 1.6, 7).translate(0, 0.8, 0))

export interface Spot {
  x: number
  y: number
  z: number
  u: number
  off: number
  yaw: number
  r: number
}

const _v = new THREE.Vector3()

// the swap camera sits beside each zone gate: keep trees out of its view
const GATES = Array.from({ length: 6 }, (_, i) => {
  const u = boundaryU(i + 1)
  const p = roadPoint(u)
  return { x: p.x, z: p.z, yaw: roadYaw(u) }
})
export function inSwapView(x: number, z: number) {
  for (const g of GATES) {
    const dx = x - g.x
    const dz = z - g.z
    const c = Math.cos(g.yaw)
    const s = Math.sin(g.yaw)
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    if (lx > 1 && lx < 22 && lz > -28 && lz < 10) return true
  }
  return false
}

/** Random positions beside the road within a zone, kept clear of the road */
export function scatter(
  zone: number,
  count: number,
  seed: number,
  o: { min: number; max: number; from?: number; to?: number; side?: number; clearance?: number; ground?: boolean; bias?: number },
): Spot[] {
  const rnd = mulberry32(seed)
  const out: Spot[] = []
  let tries = 0
  const from = o.from ?? 0.02
  const to = o.to ?? 0.98
  while (out.length < count && tries < count * 5) {
    tries++
    const u = zoneU(zone, from + (to - from) * rnd())
    const s = o.side || (rnd() < 0.5 ? -1 : 1)
    const off = s * (o.min + (o.max - o.min) * Math.pow(rnd(), o.bias ?? 1.3))
    alongRoad(u, off, 0, _v)
    if (inSwapView(_v.x, _v.z)) continue
    const nr = nearestRoad(_v.x, _v.z)
    if (nr.dist < (o.clearance ?? o.min * 0.92)) continue
    const y = o.ground === false ? 0 : terrainHeight(_v.x, _v.z)
    out.push({ x: _v.x, y, z: _v.z, u, off, yaw: rnd() * Math.PI * 2, r: rnd() })
  }
  return out
}

export interface Building {
  p: [number, number, number]
  yaw: number
  s: [number, number, number]
  c: string
  side: number
  row: number
  u: number
}

/** Rows of buildings lining both sides of a zone's street */
export function streetBuildings(
  zone: number,
  seed: number,
  o: { setback: number; rows: number; hMin: number; hMax: number; colors: string[]; skip?: (f: number, side: number, row: number) => boolean },
) {
  const rnd = mulberry32(seed)
  const out: Building[] = []
  for (const side of [1, -1]) {
    for (let row = 0; row < o.rows; row++) {
      let f = 0.025 + rnd() * 0.02
      while (f < 0.975) {
        const along = 9 + rnd() * 7
        const depth = 10 + rnd() * 8
        const center = row === 0 ? o.setback + depth / 2 : o.setback + 22 + (row - 1) * 24 + depth / 2 + rnd() * 6
        const u = zoneU(zone, f)
        if (!(o.skip && o.skip(f, side, row)) && rnd() > 0.08) {
          alongRoad(u, side * center, 0, _v)
          const nr = nearestRoad(_v.x, _v.z)
          if (nr.dist > o.setback + depth / 2 - 1.5) {
            const mid = 1 - Math.abs(f - 0.5) * 1.1
            const h = (o.hMin + (o.hMax - o.hMin) * Math.pow(rnd(), 1.6) * (0.6 + mid * 0.6)) * (1 + row * 0.45)
            out.push({
              p: [_v.x, -0.1, _v.z],
              yaw: Math.atan2(...dirXZ(u)),
              s: [depth, h, along],
              c: o.colors[Math.floor(rnd() * o.colors.length)],
              side,
              row,
              u,
            })
          }
        }
        f += (along + 1.5 + rnd() * 3) / 220
      }
    }
  }
  return out
}

const _d = new THREE.Vector3()
function dirXZ(u: number): [number, number] {
  roadDir(u, _d)
  return [_d.x, _d.z]
}

/** Transform a building-local point to world space */
export function buildingLocal(b: Building, lx: number, ly: number, lz: number): [number, number, number] {
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  return [b.p[0] + lx * c + lz * s, b.p[1] + ly, b.p[2] - lx * s + lz * c]
}
