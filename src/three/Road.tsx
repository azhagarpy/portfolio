import { useMemo } from 'react'
import * as THREE from 'three'
import { zones } from '../data/portfolio'
import {
  boundaryU,
  RANGES,
  ROAD_HALF,
  ROAD_LENGTH,
  roadPoint,
  roadRight,
  roadYaw,
  START_U,
  ZONES,
} from '../lib/journey'
import { lerp } from '../lib/math'
import { additive, glow, mat } from './materials'
import { checkerTexture, roadTexture, signTexture, type RoadKind } from './textures'

export const ROAD_Y = 0.05

const _p = new THREE.Vector3()
const _r = new THREE.Vector3()

/** Flat ribbon following the road between two lateral offsets */
export function buildStrip(u0: number, u1: number, left: number, right: number, y: number, step = 1.5, vLen = 20) {
  const n = Math.max(2, Math.ceil(((u1 - u0) * ROAD_LENGTH) / step))
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const u = lerp(u0, u1, i / n)
    roadPoint(u, _p)
    roadRight(Math.min(1, Math.max(0, u)), _r)
    const v = (u * ROAD_LENGTH) / vLen
    pos.push(_p.x + _r.x * left, y, _p.z + _r.z * left, _p.x + _r.x * right, y, _p.z + _r.z * right)
    uv.push(0, v, 1, v)
    if (i < n) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Vertical ribbon following the road at a lateral offset */
export function buildWall(u0: number, u1: number, offset: number, y0: number, y1: number, step = 2) {
  const n = Math.max(2, Math.ceil(((u1 - u0) * ROAD_LENGTH) / step))
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const u = lerp(u0, u1, i / n)
    roadPoint(u, _p)
    roadRight(Math.min(1, Math.max(0, u)), _r)
    const x = _p.x + _r.x * offset
    const z = _p.z + _r.z * offset
    pos.push(x, y0, z, x, y1, z)
    if (i < n) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const KINDS: RoadKind[] = ['asphalt', 'dirt', 'city', 'neon', 'bridge', 'snow', 'mars']

function Gate({ u, zone, title, kicker }: { u: number; zone: number; title: string; kicker: string }) {
  const accent = zones[zone].accent
  const tex = useMemo(
    () => signTexture({ title, kicker, bg: '#0c0f1d', fg: '#ffffff', accent, w: 1024, h: 256 }),
    [title, kicker, accent],
  )
  const p = roadPoint(u)
  const yaw = roadYaw(u) + Math.PI
  const off = ROAD_HALF + 1.1
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, yaw, 0]}>
      {[off, -off].map((x) => (
        <group key={x}>
          <mesh position={[x, 4.2, 0]} material={mat('#23263a', { metal: 0.3, rough: 0.5 })} castShadow>
            <boxGeometry args={[0.9, 8.4, 0.9]} />
          </mesh>
          <mesh position={[x, 4.2, 0.46]} material={glow(accent, 2.2)}>
            <boxGeometry args={[0.16, 7.6, 0.04]} />
          </mesh>
          <mesh position={[x, 4.2, -0.46]} material={glow(accent, 2.2)}>
            <boxGeometry args={[0.16, 7.6, 0.04]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 8.2, 0]} material={mat('#23263a', { metal: 0.3, rough: 0.5 })} castShadow>
        <boxGeometry args={[off * 2 + 1.4, 2.9, 0.7]} />
      </mesh>
      <mesh position={[0, 8.2, 0.41]}>
        <planeGeometry args={[off * 2 + 0.8, (off * 2 + 0.8) / 4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 8.2, -0.41]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[off * 2 + 0.8, (off * 2 + 0.8) / 4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Glowing parking bay where the next vehicle waits */
function Bay({ u, color }: { u: number; color: string }) {
  const p = roadPoint(u)
  const yaw = roadYaw(u)
  return (
    <group position={[p.x, ROAD_Y + 0.02, p.z]} rotation={[0, yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={additive(color, 0.28)}>
        <planeGeometry args={[3.6, 6.4]} />
      </mesh>
      {[1.8, -1.8].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow(color, 2)}>
          <planeGeometry args={[0.12, 6.4]} />
        </mesh>
      ))}
    </group>
  )
}

export function Road() {
  const roads = useMemo(
    () =>
      KINDS.map((k, i) => {
        const u0 = i === 0 ? -0.006 : boundaryU(i)
        const u1 = i === ZONES - 1 ? 1 + 16 / ROAD_LENGTH : boundaryU(i + 1) + 0.0003
        const geo = buildStrip(u0, u1, -ROAD_HALF, ROAD_HALF, ROAD_Y)
        const tex = roadTexture(k)
        const m =
          k === 'neon'
            ? new THREE.MeshStandardMaterial({
                map: tex,
                emissiveMap: tex,
                emissive: '#ffffff',
                emissiveIntensity: 1.25,
                roughness: 0.3,
                metalness: 0.35,
              })
            : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })
        return { geo, m, key: k }
      }),
    [],
  )
  const checker = useMemo(() => checkerTexture(), [])
  const startU = START_U + 5 / ROAD_LENGTH
  const sp = roadPoint(startU)

  return (
    <group>
      {roads.map(({ geo, m, key }) => (
        <mesh key={key} geometry={geo} material={m} receiveShadow />
      ))}

      <mesh position={[sp.x, ROAD_Y + 0.015, sp.z]} rotation={[-Math.PI / 2, 0, roadYaw(startU)]}>
        <planeGeometry args={[ROAD_HALF * 2, 1.15]} />
        <meshStandardMaterial map={checker} />
      </mesh>
      <Gate u={START_U + 12 / ROAD_LENGTH} zone={0} title="Azhagar's Road Trip" kicker="Start · Zone 01 · Hometown" />

      {zones.slice(1).map((z, i) => (
        <Gate
          key={z.id}
          u={boundaryU(i + 1)}
          zone={i + 1}
          title={z.name}
          kicker={`Zone 0${i + 2} · ${z.section}`}
        />
      ))}
      {RANGES.slice(1).map(([u0], i) => (
        <Bay key={i} u={u0} color={zones[i + 1].accent} />
      ))}
    </group>
  )
}

/** Sidewalk ribbons both sides of a zone */
export function Sidewalks({ zone, color, width = 3.2 }: { zone: number; color: string; width?: number }) {
  const geos = useMemo(() => {
    const u0 = boundaryU(zone) + 0.004
    const u1 = boundaryU(zone + 1) - 0.004
    return [
      buildStrip(u0, u1, ROAD_HALF, ROAD_HALF + width, 0.16, 2),
      buildStrip(u0, u1, -ROAD_HALF - width, -ROAD_HALF, 0.16, 2),
      buildWall(u0, u1, ROAD_HALF, -0.05, 0.16),
      buildWall(u0, u1, -ROAD_HALF, -0.05, 0.16),
    ]
  }, [zone, width])
  const m = mat(color, { rough: 0.9, side: THREE.DoubleSide })
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={m} receiveShadow />
      ))}
    </group>
  )
}

