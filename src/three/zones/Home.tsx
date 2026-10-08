import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { alongRoad, faceRoadYaw, ROAD_LENGTH, roadYaw, zoneU } from '../../lib/journey'
import { mulberry32 } from '../../lib/math'
import { Instanced, ZoneGroup, type Inst } from '../geo'
import { mat, vertexColorMat } from '../materials'
import { signTexture } from '../textures'
import { terrainHeight } from '../Terrain'
import { coneGeo, houseGeo, palmGeo, roofGeo, roundTreeGeo, scatter, boxBaseGeo } from './props'

const WALLS = ['#f4a259', '#5b8e7d', '#f6d5a3', '#e9c46a', '#8ecae6', '#f28482', '#fdfcdc', '#c8b6ff', '#ffb4a2']
const TIERS = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#e76f51', '#8ab17d', '#f4a261']

function Gopuram({ u, off }: { u: number; off: number }) {
  const p = alongRoad(u, off)
  const y = terrainHeight(p.x, p.z) - 0.5
  const yaw = faceRoadYaw(u, off, 0.2)
  return (
    <group position={[p.x, y, p.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 2, 0]} material={mat('#d9c7a1')} castShadow receiveShadow>
        <boxGeometry args={[30, 4, 22]} />
      </mesh>
      {TIERS.map((c, i) => {
        const w = 18 - i * 2.1
        const d = 11 - i * 1.1
        return (
          <mesh key={i} position={[0, 4 + 1.6 + i * 3.2, 0]} material={mat(c)} castShadow>
            <boxGeometry args={[w, 3.2, d]} />
          </mesh>
        )
      })}
      <mesh position={[0, 4 + TIERS.length * 3.2 + 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#e76f51')} castShadow>
        <cylinderGeometry args={[1.6, 1.6, 5.6, 10]} />
      </mesh>
      {[-1.8, 0, 1.8].map((x) => (
        <mesh key={x} position={[x, 4 + TIERS.length * 3.2 + 3.4, 0]} material={mat('#ffd166', { metal: 0.7, rough: 0.3 })}>
          <coneGeometry args={[0.35, 1.4, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 5.5, d0(11)]} material={mat('#5a3d2b')}>
        <boxGeometry args={[3.2, 5, 0.2]} />
      </mesh>
    </group>
  )
}
const d0 = (d: number) => d / 2 + 0.05

function HomeHouse() {
  // Azhagar's home, right behind the start line
  const u = -24 / ROAD_LENGTH
  const off = -12
  const p = alongRoad(u, off)
  const y = terrainHeight(p.x, p.z) - 0.2
  const yaw = faceRoadYaw(0, off, 0)
  const tex = useMemo(() => signTexture({ title: 'Home', kicker: "Azhagar's", bg: '#fff8ec', fg: '#2b2118', accent: '#ff9f1c', w: 512, h: 256 }), [])
  return (
    <group position={[p.x, y, p.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, -1, 0]} material={mat('#c9b38a')} receiveShadow>
        <boxGeometry args={[9.8, 2.4, 7.8]} />
      </mesh>
      <mesh position={[0, 2.2, 0]} material={mat('#ffcf8a')} castShadow receiveShadow>
        <boxGeometry args={[9, 4.4, 7]} />
      </mesh>
      <mesh position={[0, 5.4, 0]} rotation={[0, Math.PI / 4, 0]} material={mat('#b5523b')} castShadow>
        <coneGeometry args={[6.6, 2.2, 4]} />
      </mesh>
      <mesh position={[0, 1.3, 3.52]} material={mat('#6b3e26')}>
        <boxGeometry args={[1.5, 2.6, 0.06]} />
      </mesh>
      {[-2.8, 2.8].map((x) => (
        <mesh key={x} position={[x, 2.6, 3.52]} material={mat('#8ecae6', { rough: 0.2 })}>
          <boxGeometry args={[1.4, 1.2, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, 3.62]}>
        <planeGeometry args={[2.4, 1.2]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      {/* kolam-style doorstep */}
      <mesh position={[0, 0.03, 5.2]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={mat('#ffffff')}>
        <ringGeometry args={[0.6, 0.9, 4]} />
      </mesh>
    </group>
  )
}

function Kites() {
  const refs = useRef<THREE.Group[]>([])
  const kites = useMemo(
    () =>
      [
        [0.25, -24, 26, '#ff4d6d'],
        [0.5, 30, 32, '#4cc9f0'],
        [0.78, -18, 22, '#ffd166'],
      ].map(([f, off, y, c]) => ({ p: alongRoad(zoneU(0, f as number), off as number, y as number), c: c as string })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z = Math.PI / 4 + Math.sin(t * 1.3 + i) * 0.25
      g.position.y = kites[i].p.y + Math.sin(t * 0.8 + i * 2) * 1.2
    })
  })
  return (
    <>
      {kites.map((k, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g!)} position={k.p}>
          <mesh material={mat(k.c, { side: THREE.DoubleSide })}>
            <planeGeometry args={[2.2, 2.2]} />
          </mesh>
          <mesh position={[0.9, -0.9, 0.01]} material={mat('#ffffff', { side: THREE.DoubleSide })}>
            <planeGeometry args={[0.6, 0.6]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function Home() {
  const data = useMemo(() => {
    const palms: Inst[] = scatter(0, 90, 11, { min: 8, max: 120 }).map((s) => ({ p: [s.x, s.y - 0.2, s.z], yaw: s.yaw, s: 0.85 + s.r * 0.5 }))
    // extra palms around home, behind the start
    const rnd = mulberry32(3)
    for (let i = 0; i < 26; i++) {
      const u = (-10 - rnd() * 90) / ROAD_LENGTH
      const off = (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 40)
      const p = alongRoad(u, off)
      if (Math.abs(off) < 20 && off < 0 && u > -45 / ROAD_LENGTH) continue
      palms.push({ p: [p.x, terrainHeight(p.x, p.z) - 0.2, p.z], yaw: rnd() * 6, s: 0.9 + rnd() * 0.4 })
    }
    const trees: Inst[] = scatter(0, 30, 12, { min: 14, max: 110 }).map((s) => ({ p: [s.x, s.y - 0.2, s.z], yaw: s.yaw, s: 0.8 + s.r * 0.6 }))

    const houses: Inst[] = []
    const roofs: Inst[] = []
    scatter(0, 20, 13, { min: 13, max: 34, from: 0.06, to: 0.95 }).forEach((s, i) => {
      const w = 5 + s.r * 3
      const d = 4.5 + ((i * 7) % 3)
      const h = 3 + (i % 3) * 0.6
      const yaw = faceRoadYaw(s.u, s.off, 0)
      houses.push({ p: [s.x, s.y - 0.3, s.z], yaw, s: [w, h, d], c: WALLS[i % WALLS.length] })
      roofs.push({ p: [s.x, s.y - 0.3 + h - 1.6, s.z], yaw, s: [w * 1.05, 1.6, d * 1.05] })
    })

    const fields: Inst[] = []
    const fr = mulberry32(14)
    for (let f = 0.14; f < 0.5; f += 0.045) {
      for (let k = 0; k < 4; k++) {
        const off = 20 + k * 13
        const p = alongRoad(zoneU(0, f), off)
        fields.push({
          p: [p.x, terrainHeight(p.x, p.z) - 0.05, p.z],
          yaw: roadYaw(zoneU(0, f)),
          s: [11, 0.35, 8.5],
          c: ['#9ccc65', '#8bc34a', '#aed581', '#7cb342'][Math.floor(fr() * 4)],
        })
      }
    }
    const stacks: Inst[] = scatter(0, 16, 15, { min: 10, max: 45, from: 0.5, to: 0.95 }).map((s) => ({
      p: [s.x, s.y - 0.1, s.z],
      yaw: s.yaw,
      s: [1.3, 1.4, 1.3],
    }))
    return { palms, trees, houses, roofs, fields, stacks }
  }, [])

  return (
    <ZoneGroup zone={0}>
      <Instanced geometry={palmGeo()} material={vertexColorMat} items={data.palms} castShadow />
      <Instanced geometry={roundTreeGeo('#4f9a3e', '#62b04a')} material={vertexColorMat} items={data.trees} castShadow />
      <Instanced geometry={houseGeo()} material={mat('#ffffff')} items={data.houses} castShadow receiveShadow />
      <Instanced geometry={roofGeo()} material={mat('#b5523b')} items={data.roofs} castShadow />
      <Instanced geometry={boxBaseGeo()} material={mat('#ffffff', { rough: 0.6 })} items={data.fields} receiveShadow />
      <Instanced geometry={coneGeo()} material={mat('#e0b44c', { rough: 1 })} items={data.stacks} castShadow />
      <Gopuram u={zoneU(0, 0.62)} off={-64} />
      <HomeHouse />
      <Kites />
    </ZoneGroup>
  )
}
