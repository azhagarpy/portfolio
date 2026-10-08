import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { profile } from '../../data/portfolio'
import { alongRoad, ARM_Y, faceRoadYaw, GANTRY_X, HATCH_X, live, PAD_POS, PAD_TOP, PAD_YAW, zoneU } from '../../lib/journey'
import { mulberry32, smoothstep } from '../../lib/math'
import { Instanced, writeInstance, ZoneGroup, type Inst } from '../geo'
import { glow, mat, vertexColorMat } from '../materials'
import { neonTexture, signTexture } from '../textures'
import { terrainHeight } from '../Terrain'
import { boxBaseGeo, rockGeo, scatter } from './props'

function Radar({ f, off }: { f: number; off: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.35
  })
  const u = zoneU(6, f)
  const p = alongRoad(u, off)
  const y = terrainHeight(p.x, p.z)
  return (
    <group position={[p.x, y, p.z]}>
      <mesh position={[0, 3, 0]} material={mat('#d8d8dc')} castShadow>
        <cylinderGeometry args={[0.6, 1.2, 6, 8]} />
      </mesh>
      <group ref={ref} position={[0, 6.4, 0]}>
        <mesh rotation={[-0.8, 0, 0]} material={mat('#f2f2f2', { side: THREE.DoubleSide })} castShadow>
          <sphereGeometry args={[4.2, 16, 6, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        </mesh>
        <mesh position={[0, 1.6, 1.4]} rotation={[0.8, 0, 0]} material={mat('#999')}>
          <cylinderGeometry args={[0.08, 0.08, 4, 6]} />
        </mesh>
        <mesh position={[0, 3.2, 2.7]} material={glow('#ff4d4d', 3)}>
          <sphereGeometry args={[0.25, 8, 6]} />
        </mesh>
      </group>
    </group>
  )
}

function Floodlight({ x, z, aim }: { x: number; z: number; aim: THREE.Vector3 }) {
  const yaw = Math.atan2(aim.x - x, aim.z - z)
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 9, 0]} material={mat('#3a3a40')} castShadow>
        <boxGeometry args={[0.6, 18, 0.6]} />
      </mesh>
      <mesh position={[0, 18.2, 0.3]} rotation={[0.5, 0, 0]} material={mat('#222')}>
        <boxGeometry args={[3, 1.6, 0.5]} />
      </mesh>
      <mesh position={[0, 18.2, 0.6]} rotation={[0.5, 0, 0]} material={glow('#fff6dc', 3)}>
        <planeGeometry args={[2.6, 1.2]} />
      </mesh>
    </group>
  )
}

function ContactSign({ f, off }: { f: number; off: number }) {
  const tex = useMemo(() => neonTexture("LET'S BUILD", '#ff7a45', profile.email, 1024, 360), [])
  const u = zoneU(6, f)
  const p = alongRoad(u, off)
  return (
    <group position={[p.x, terrainHeight(p.x, p.z), p.z]} rotation={[0, faceRoadYaw(u, off, 0.9), 0]}>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 4, -0.3]} material={mat('#2a2230')} castShadow>
          <boxGeometry args={[0.4, 8, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, 9.5, -0.25]} material={mat('#140f1c')}>
        <boxGeometry args={[11, 4, 0.3]} />
      </mesh>
      <mesh position={[0, 9.5, 0.0]}>
        <planeGeometry args={[10.6, 3.73]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.6, 1.6, 1.6]} />
      </mesh>
    </group>
  )
}

function MissionControl({ f, off }: { f: number; off: number }) {
  const tex = useMemo(
    () => signTexture({ title: 'Mission Control', kicker: 'Contact · Open for opportunities', bg: '#101425', fg: '#ffffff', accent: '#ff7a45', w: 1024, h: 256 }),
    [],
  )
  const u = zoneU(6, f)
  const p = alongRoad(u, off)
  return (
    <group position={[p.x, terrainHeight(p.x, p.z) - 0.2, p.z]} rotation={[0, faceRoadYaw(u, off, 0.3), 0]}>
      <mesh position={[0, 3, 0]} material={mat('#e6e2dc')} castShadow receiveShadow>
        <boxGeometry args={[18, 6, 10]} />
      </mesh>
      <mesh position={[0, 3.4, 5.02]} material={glow('#7fd4ff', 1.4)}>
        <boxGeometry args={[15, 1.4, 0.05]} />
      </mesh>
      <mesh position={[0, 6.8, 0]} material={mat('#c9c4bc')}>
        <boxGeometry args={[19, 0.6, 11]} />
      </mesh>
      <mesh position={[0, 8.8, 4.6]}>
        <planeGeometry args={[14, 3.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[5, 9, -2]} material={mat('#d8d8dc')}>
        <cylinderGeometry args={[0.1, 0.1, 5, 6]} />
      </mesh>
    </group>
  )
}

function FuelTanks({ f, off }: { f: number; off: number }) {
  const u = zoneU(6, f)
  const p = alongRoad(u, off)
  const y = terrainHeight(p.x, p.z)
  return (
    <group position={[p.x, y, p.z]} rotation={[0, faceRoadYaw(u, off, 0), 0]}>
      {[-5, 0, 5].map((x, i) => (
        <group key={x} position={[x, 0, i === 1 ? -2 : 0]}>
          <mesh position={[0, 4, 0]} material={mat('#f2f2f4')} castShadow>
            <cylinderGeometry args={[2, 2, 8, 14]} />
          </mesh>
          <mesh position={[0, 8, 0]} material={mat('#f2f2f4')} castShadow>
            <sphereGeometry args={[2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 4, 0]} material={mat('#ff7a45')}>
            <cylinderGeometry args={[2.03, 2.03, 0.8, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Launch pad, gantry tower, elevator, access arm and liftoff smoke */
function LaunchComplex() {
  const elevator = useRef<THREE.Group>(null!)
  const arm = useRef<THREE.Group>(null!)
  const smoke = useRef<THREE.InstancedMesh>(null!)
  const smokeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f1ece6', transparent: true, opacity: 0.85, roughness: 1, flatShading: true, depthWrite: false }),
    [],
  )
  const lattice = useMemo(() => {
    const out: Inst[] = []
    const H = ARM_Y + 6
    const hw = 1.2
    for (const [cx, cz] of [
      [hw, hw],
      [hw, -hw],
      [-hw, hw],
      [-hw, -hw],
    ])
      out.push({ p: [GANTRY_X + cx, 0, cz], s: [0.22, H, 0.22] })
    for (let y = 2; y <= H; y += 2.4) {
      out.push({ p: [GANTRY_X, y, hw], s: [hw * 2, 0.16, 0.16] })
      out.push({ p: [GANTRY_X, y, -hw], s: [hw * 2, 0.16, 0.16] })
      out.push({ p: [GANTRY_X + hw, y, 0], s: [0.16, 0.16, hw * 2] })
      out.push({ p: [GANTRY_X - hw, y, 0], s: [0.16, 0.16, hw * 2] })
      out.push({ p: [GANTRY_X, y - 1.2, hw], r: [0, 0, 0.75], s: [0.12, 3.2, 0.12] })
      out.push({ p: [GANTRY_X, y - 1.2, -hw], r: [0, 0, -0.75], s: [0.12, 3.2, 0.12] })
    }
    out.push({ p: [GANTRY_X, H, 0], s: [hw * 2 + 0.4, 0.3, hw * 2 + 0.4] })
    out.push({ p: [GANTRY_X, H + 0.3, 0], s: [0.1, 6, 0.1] })
    return out
  }, [])
  const puffs = useMemo(() => {
    const rnd = mulberry32(99)
    return Array.from({ length: 46 }, () => ({ a: rnd() * Math.PI * 2, r: rnd(), s: 0.6 + rnd() * 0.8, y: rnd() }))
  }, [])
  useFrame(() => {
    elevator.current.position.y = live.elevator
    arm.current.rotation.y = live.armOpen * 1.5
    const lt = live.launch
    const k = smoothstep(0, 0.25, lt)
    const fade = 1 - smoothstep(0.35, 0.8, lt)
    smoke.current.visible = lt > 0.001 && fade > 0.01
    smokeMat.opacity = 0.85 * fade
    puffs.forEach((p, i) => {
      const dist = 3 + p.r * (6 + k * 46)
      const size = (1.5 + k * 9) * p.s
      writeInstance(smoke.current, i, {
        p: [Math.cos(p.a) * dist, 1 + p.y * (1 + k * 10), Math.sin(p.a) * dist],
        s: size,
      })
    })
    smoke.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group position={[PAD_POS.x, 0, PAD_POS.z]} rotation={[0, PAD_YAW, 0]}>
      <mesh position={[0, PAD_TOP / 2 - 0.4, 0]} material={mat('#9a9aa0')} castShadow receiveShadow>
        <cylinderGeometry args={[10.5, 12, PAD_TOP + 0.8, 24]} />
      </mesh>
      <mesh position={[0, PAD_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#ffcf3a')}>
        <ringGeometry args={[9.2, 10, 40]} />
      </mesh>
      <mesh position={[0, PAD_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#2a2a2e')}>
        <circleGeometry args={[3.2, 20]} />
      </mesh>
      <group position={[0, PAD_TOP, 0]}>
        <Instanced geometry={boxBaseGeo()} material={mat('#c8462c', { metal: 0.3, rough: 0.6 })} items={lattice} castShadow />
        <group ref={elevator}>
          <mesh position={[GANTRY_X, 0.08, 0]} material={mat('#ffcf3a')}>
            <boxGeometry args={[2.2, 0.16, 2.2]} />
          </mesh>
          <mesh position={[GANTRY_X, 1.2, 0]} material={glow('#ffcf3a', 1.6)}>
            <boxGeometry args={[2.3, 0.06, 2.3]} />
          </mesh>
        </group>
        <group ref={arm} position={[GANTRY_X - 1.2, ARM_Y, 0]}>
          <mesh position={[-(GANTRY_X - 1.2 - HATCH_X) / 2, -0.1, 0]} material={mat('#9a3a26')} castShadow>
            <boxGeometry args={[GANTRY_X - 1.2 - HATCH_X + 0.2, 0.2, 1.4]} />
          </mesh>
          {[0.7, -0.7].map((z) => (
            <mesh key={z} position={[-(GANTRY_X - 1.2 - HATCH_X) / 2, 0.55, z]} material={mat('#c8462c')}>
              <boxGeometry args={[GANTRY_X - 1.2 - HATCH_X, 0.08, 0.08]} />
            </mesh>
          ))}
        </group>
      </group>
      <instancedMesh ref={smoke} args={[new THREE.IcosahedronGeometry(1, 1), smokeMat, puffs.length]} frustumCulled={false} />
    </group>
  )
}

export function Launch() {
  const data = useMemo(() => {
    const rocks: Inst[] = scatter(6, 90, 91, { min: 7, max: 120, bias: 1.4 }).map((s) => ({ p: [s.x, s.y - 0.3, s.z], yaw: s.yaw, s: 0.5 + s.r * 2.2 }))
    return { rocks }
  }, [])
  const aim = useMemo(() => new THREE.Vector3(PAD_POS.x, 10, PAD_POS.z), [])
  const lights = useMemo(() => {
    const out: { x: number; z: number }[] = []
    // angles chosen to stay clear of the road (180°) and the boarding camera (~125°)
    for (const deg of [30, 72, 232, 300]) {
      const a = PAD_YAW + (deg * Math.PI) / 180
      out.push({ x: PAD_POS.x + Math.sin(a) * 26, z: PAD_POS.z + Math.cos(a) * 26 })
    }
    return out
  }, [])
  return (
    <ZoneGroup zone={6}>
      <Instanced geometry={rockGeo('#a24a32')} material={vertexColorMat} items={data.rocks} castShadow />
      <Radar f={0.22} off={-26} />
      <Radar f={0.46} off={30} />
      <FuelTanks f={0.6} off={-22} />
      <MissionControl f={0.36} off={20} />
      <ContactSign f={0.78} off={-(4.6 + 4)} />
      {lights.map((l, i) => (
        <Floodlight key={i} x={l.x} z={l.z} aim={aim} />
      ))}
      <LaunchComplex />
    </ZoneGroup>
  )
}
