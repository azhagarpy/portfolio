import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { alongRoad, CROSSINGS, faceRoadYaw, ROAD_HALF, ROAD_LENGTH, zoneU } from '../../lib/journey'
import { mulberry32 } from '../../lib/math'
import { Instanced, ZoneGroup, type Inst } from '../geo'
import { buildingMaterial, glow, mat, vertexColorMat } from '../materials'
import { Sidewalks } from '../Road'
import { signTexture } from '../textures'
import { boxBaseGeo, buildingLocal, lampGeo, roundTreeGeo, streetBuildings } from './props'

const SKILL_BOARDS: [string, string][] = [
  ['React.js', 'Frontend'],
  ['Next.js', 'Frontend'],
  ['TypeScript', 'Frontend'],
  ['JavaScript ES6+', 'Frontend'],
  ['React Native', 'Mobile'],
  ['Remix.js', 'Frontend'],
  ['Tailwind CSS', 'Styling'],
  ['Redux', 'State & Data'],
  ['Node.js', 'Backend'],
  ['Express.js', 'Backend'],
  ['Directus', 'Headless CMS'],
  ['Git · GitHub', 'Tools'],
]
const BOARD_ACCENTS = ['#4fc3ff', '#ff7a45', '#7ee06a', '#ff3ec8', '#ffd166', '#9b8cff']

function Billboard({ u, off, title, sub, accent }: { u: number; off: number; title: string; sub: string; accent: string }) {
  const tex = useMemo(
    () => signTexture({ title, kicker: 'Skill unlocked', lines: [sub], bg: '#ffffff', fg: '#11131c', accent, w: 1024, h: 512 }),
    [title, sub, accent],
  )
  const p = alongRoad(u, off)
  const yaw = faceRoadYaw(u, off, 0.55)
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 3.5, -0.2]} material={mat('#3c4048')} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 7, 8]} />
      </mesh>
      <mesh position={[0, 9, -0.25]} material={mat('#2a2d33')} castShadow>
        <boxGeometry args={[8.4, 4.4, 0.3]} />
      </mesh>
      <mesh position={[0, 9, 0.01]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial map={tex} roughness={0.6} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function ReactAtom({ u, off }: { u: number; off: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.4
  })
  const p = alongRoad(u, off)
  const cyan = glow('#61dafb', 2.2)
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 1, 0]} material={mat('#2a2f3a')} castShadow receiveShadow>
        <cylinderGeometry args={[5, 6, 2, 8]} />
      </mesh>
      <mesh position={[0, 5, 0]} material={mat('#3a4150')} castShadow>
        <cylinderGeometry args={[0.6, 1, 6, 8]} />
      </mesh>
      <group ref={ref} position={[0, 15, 0]}>
        <mesh material={cyan}>
          <icosahedronGeometry args={[1.4, 1]} />
        </mesh>
        {[0, Math.PI / 3, -Math.PI / 3].map((a) => (
          <group key={a} rotation={[0, 0, a]}>
            <mesh scale={[1, 0.38, 1]} material={cyan}>
              <torusGeometry args={[6.5, 0.32, 8, 48]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function TVTower({ u, off }: { u: number; off: number }) {
  const p = alongRoad(u, off)
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 45, 0]} material={mat('#d9dee6')} castShadow>
        <cylinderGeometry args={[1.2, 2.6, 90, 10]} />
      </mesh>
      <mesh position={[0, 72, 0]} material={mat('#b8c2cf', { metal: 0.4, rough: 0.4 })} castShadow>
        <sphereGeometry args={[5, 14, 10]} />
      </mesh>
      <mesh position={[0, 78, 0]} material={mat('#e85d4a')}>
        <cylinderGeometry args={[5.5, 5.5, 1.2, 14]} />
      </mesh>
      <mesh position={[0, 98, 0]} material={mat('#d9dee6')}>
        <cylinderGeometry args={[0.25, 0.5, 34, 6]} />
      </mesh>
      <mesh position={[0, 115.5, 0]} material={glow('#ff3030', 3)}>
        <sphereGeometry args={[0.6, 8, 6]} />
      </mesh>
    </group>
  )
}

export function City() {
  const material = useMemo(
    () => buildingMaterial({ windowColor: '#8fb6d9', litColor: '#ffe6a3', litChance: 0.12, litStrength: 0.25, roughness: 0.55 }),
    [],
  )
  const data = useMemo(() => {
    const buildings = streetBuildings(2, 41, {
      setback: ROAD_HALF + 5.6,
      rows: 3,
      hMin: 14,
      hMax: 70,
      colors: ['#d9d4cc', '#c4ccd6', '#e8e2d6', '#9aa7b5', '#b8c4cf', '#f0ebe3', '#c9b8a6', '#a3b8c9'],
      skip: (f, side, row) => row === 0 && ((side < 0 && f > 0.44 && f < 0.58) || f < 0.09 || f > 0.9),
    })
    const blds: Inst[] = buildings.map((b) => ({ p: b.p, yaw: b.yaw, s: b.s, c: b.c }))
    const rnd = mulberry32(42)
    const roofs: Inst[] = []
    buildings.forEach((b) => {
      if (rnd() < 0.6) {
        const [lx, lz] = [(rnd() - 0.5) * b.s[0] * 0.5, (rnd() - 0.5) * b.s[2] * 0.5]
        roofs.push({ p: buildingLocal(b, lx, b.s[1], lz), yaw: b.yaw, s: [2 + rnd() * 3, 1.5 + rnd() * 2, 2 + rnd() * 3], c: '#8a919b' })
      }
    })
    const lamps: Inst[] = []
    const trees: Inst[] = []
    // keep the pavement clear around the pedestrian crossings
    const clear = (u: number) => CROSSINGS.every((c) => Math.abs(u - c.u) * ROAD_LENGTH > 9)
    for (let f = 0.03; f < 0.97; f += 22 / 220) {
      for (const s of [1, -1]) {
        const u = zoneU(2, f + (s > 0 ? 0 : 0.03))
        const off = s * (ROAD_HALF + 2.4)
        const p = alongRoad(u, off)
        if (clear(u)) lamps.push({ p: [p.x, 0.16, p.z], yaw: faceRoadYaw(u, off, 0) })
        const ut = zoneU(2, f + 0.05)
        const pt = alongRoad(ut, s * (ROAD_HALF + 2.0))
        if (clear(ut)) trees.push({ p: [pt.x, 0.1, pt.z], yaw: f * 30, s: 0.5 })
      }
    }
    return { blds, roofs, lamps, trees }
  }, [])

  return (
    <ZoneGroup zone={2}>
      <Sidewalks zone={2} color="#b9bec6" width={3.6} />
      <Instanced geometry={boxBaseGeo()} material={material} items={data.blds} castShadow receiveShadow />
      <Instanced geometry={boxBaseGeo()} material={mat('#ffffff')} items={data.roofs} castShadow />
      <Instanced geometry={lampGeo()} material={vertexColorMat} items={data.lamps} castShadow />
      <Instanced geometry={roundTreeGeo('#4f9a3e', '#62b04a')} material={vertexColorMat} items={data.trees} castShadow />
      {SKILL_BOARDS.map(([t, s], i) => (
        <Billboard
          key={t}
          u={zoneU(2, 0.07 + i * 0.075)}
          off={(i % 2 ? -1 : 1) * (ROAD_HALF + 2.8)}
          title={t}
          sub={s}
          accent={BOARD_ACCENTS[i % BOARD_ACCENTS.length]}
        />
      ))}
      <ReactAtom u={zoneU(2, 0.51)} off={-24} />
      <TVTower u={zoneU(2, 0.72)} off={75} />
    </ZoneGroup>
  )
}
