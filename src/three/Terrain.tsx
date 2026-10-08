import { useMemo } from 'react'
import * as THREE from 'three'
import { nearestRoad, ROAD_HALF, ZONE_SPAN, ZONES, zoneWeights } from '../lib/journey'
import { fbm, noise2, smoothstep } from '../lib/math'

export const WATER_LEVEL = -3.6

function ridge(x: number, z: number) {
  const r = 1 - Math.abs(fbm(x, z, 4) * 2 - 1)
  return r * r
}

/** Height contribution of each zone at a world position */
function zoneHeight(i: number, x: number, z: number, dist: number) {
  const flat = smoothstep(ROAD_HALF + 1.5, ROAD_HALF + 26, dist)
  switch (i) {
    case 0:
      return flat * (fbm(x * 0.012, z * 0.012) * 8 - 2.5) + smoothstep(110, 300, dist) * 34 * fbm(x * 0.006 + 3, z * 0.006)
    case 1:
      return flat * (fbm(x * 0.016 + 7, z * 0.016) * 12 - 3) + smoothstep(80, 250, dist) * 70 * ridge(x * 0.007, z * 0.007 + 5)
    case 2:
      return smoothstep(220, 380, dist) * 30 * fbm(x * 0.01, z * 0.01)
    case 3:
      return smoothstep(240, 400, dist) * 26 * fbm(x * 0.01 + 4, z * 0.01)
    case 4:
      return -19 + 7 * fbm(x * 0.02, z * 0.02)
    case 5:
      return flat * (fbm(x * 0.02, z * 0.02) * 6 - 1) + smoothstep(45, 210, dist) * 120 * ridge(x * 0.0065 + 2, z * 0.0065)
    case 6: {
      const mesa = smoothstep(0.56, 0.6, fbm(x * 0.011 + 11, z * 0.011, 3)) * 30 * smoothstep(55, 100, dist)
      return flat * (fbm(x * 0.02, z * 0.02) * 7 - 2) + mesa + smoothstep(200, 380, dist) * 40 * fbm(x * 0.006, z * 0.006 + 9)
    }
  }
  return 0
}

const C = (hex: string) => new THREE.Color(hex)
const PALETTE = [
  [C('#7dbb4b'), C('#5c9a38'), C('#b59a6a')],
  [C('#3f7c36'), C('#2b5a28'), C('#6b5536')],
  [C('#a2a7ae'), C('#868c94'), C('#bfc3c8')],
  [C('#150c24'), C('#1f1236'), C('#2a1840')],
  [C('#d8bf86'), C('#a98d5a'), C('#e8d39c')],
  [C('#f4f8ff'), C('#d7e3f2'), C('#ffffff')],
  [C('#b5543a'), C('#8e3d2b'), C('#c96a45')],
]
const SAND = C('#ead49e')
const ROCK = C('#8796a8')

function zoneColor(i: number, x: number, z: number, h: number, dist: number, out: THREE.Color) {
  const [a, b, near] = PALETTE[i]
  const n = noise2(x * 0.08, z * 0.08)
  out.copy(a).lerp(b, n)
  if (i === 0 || i === 1 || i === 6) out.lerp(near, (1 - smoothstep(ROAD_HALF + 0.5, ROAD_HALF + 3.5, dist)) * 0.8)
  if (i === 1 && h > 26) out.lerp(C('#59674e'), smoothstep(26, 50, h))
  if (i === 5 && h > 14 && noise2(x * 0.05, z * 0.05) > 0.62) out.lerp(ROCK, 0.7)
  if (i === 6 && h > 18) out.lerp(near, 0.6)
  return out
}

export function Terrain() {
  const geometry = useMemo(() => {
    const X_HALF = 430
    const zStart = 170
    const zEnd = -(ZONES * ZONE_SPAN) - 300
    const STEP = 5
    const segX = Math.round((X_HALF * 2) / STEP)
    const segZ = Math.round((zStart - zEnd) / STEP)
    const g = new THREE.PlaneGeometry(X_HALF * 2, zStart - zEnd, segX, segZ)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, (zStart + zEnd) / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const w: number[] = new Array(ZONES).fill(0)
    const col = new THREE.Color()
    const acc = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const nr = nearestRoad(x, z)
      const zf = nr.u * ZONES
      zoneWeights(zf, 0.12, w)
      let h = 0
      for (let k = 0; k < ZONES; k++) if (w[k] > 0.0001) h += w[k] * zoneHeight(k, x, z, nr.dist)
      h -= 0.06
      acc.setRGB(0, 0, 0)
      for (let k = 0; k < ZONES; k++) {
        if (w[k] < 0.0001) continue
        zoneColor(k, x, z, h, nr.dist, col)
        acc.r += col.r * w[k]
        acc.g += col.g * w[k]
        acc.b += col.b * w[k]
      }
      // beaches where land meets the sea
      if (w[4] > 0.01 && w[4] < 0.995 && h > WATER_LEVEL - 3) acc.lerp(SAND, smoothstep(2.5, -1.5, h) * 0.9)
      const j = 0.93 + noise2(x * 0.37, z * 0.37) * 0.14
      colors[i * 3] = acc.r * j
      colors[i * 3 + 1] = acc.g * j
      colors[i * 3 + 2] = acc.b * j
      pos.setY(i, h)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
    [],
  )
  return <mesh geometry={geometry} material={material} receiveShadow />
}

/** Sample terrain height roughly (used to seat props on hills) */
export function terrainHeight(x: number, z: number) {
  const nr = nearestRoad(x, z)
  const w: number[] = new Array(ZONES).fill(0)
  zoneWeights(nr.u * ZONES, 0.12, w)
  let h = 0
  for (let k = 0; k < ZONES; k++) if (w[k] > 0.0001) h += w[k] * zoneHeight(k, x, z, nr.dist)
  return h - 0.06
}

