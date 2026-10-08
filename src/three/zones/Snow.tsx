import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { certifications, education } from '../../data/portfolio'
import { alongRoad, faceRoadYaw, zoneU } from '../../lib/journey'
import { Instanced, ZoneGroup, type Inst } from '../geo'
import { glow, mat, vertexColorMat } from '../materials'
import { signTexture } from '../textures'
import { terrainHeight } from '../Terrain'
import { pineGeo, scatter, snowRockGeo } from './props'

function Plaque({ title, kicker, lines, accent }: { title: string; kicker: string; lines: string[]; accent: string }) {
  const tex = useMemo(
    () => signTexture({ title, kicker, lines, bg: '#0f1830', fg: '#ffffff', accent, w: 1024, h: 512 }),
    [title, kicker, lines, accent],
  )
  return (
    <group>
      <mesh position={[0, 4.8, -0.25]} material={mat('#5a6b85')} castShadow>
        <boxGeometry args={[9.4, 5, 0.4]} />
      </mesh>
      <mesh position={[0, 4.8, 0.04]}>
        <planeGeometry args={[9, 4.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 1.2, -0.25]} material={mat('#5a6b85')}>
          <boxGeometry args={[0.4, 2.4, 0.4]} />
        </mesh>
      ))}
    </group>
  )
}

function Monument({ f, off, children }: { f: number; off: number; children: React.ReactNode }) {
  const u = zoneU(5, f)
  const p = alongRoad(u, off)
  const y = terrainHeight(p.x, p.z) - 0.1
  return (
    <group position={[p.x, y, p.z]} rotation={[0, faceRoadYaw(u, off, 0.8), 0]}>
      {children}
    </group>
  )
}

function GradCap() {
  const ref = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.5
    ref.current.position.y = 13 + Math.sin(clock.elapsedTime * 1.2) * 0.4
  })
  return (
    <>
      <mesh position={[-8.5, 3, -1]} material={mat('#c5d4e8')} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 3, 6, 8]} />
      </mesh>
      <group ref={ref} position={[-8.5, 13, -1]}>
        <mesh material={mat('#1b1f2e')} castShadow>
          <cylinderGeometry args={[1.8, 2.1, 1.6, 12]} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} material={mat('#1b1f2e')} castShadow>
          <boxGeometry args={[4.6, 0.25, 4.6]} />
        </mesh>
        <mesh position={[0, 1.1, 0]} material={glow('#ffd166', 2)}>
          <sphereGeometry args={[0.25, 8, 6]} />
        </mesh>
        <mesh position={[1.6, -0.2, 1.6]} material={glow('#ffd166', 2)}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
        </mesh>
      </group>
    </>
  )
}

function Trophy() {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.7
  })
  const gold = mat('#f5c542', { metal: 0.9, rough: 0.25, emissive: '#6b4a00', ei: 0.6 })
  return (
    <>
      <mesh position={[8.5, 3, -1]} material={mat('#c5d4e8')} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 3, 6, 8]} />
      </mesh>
      <group ref={ref} position={[8.5, 6, -1]}>
        <mesh position={[0, 0.5, 0]} material={gold} castShadow>
          <cylinderGeometry args={[1.3, 1.6, 1, 10]} />
        </mesh>
        <mesh position={[0, 2, 0]} material={gold} castShadow>
          <cylinderGeometry args={[0.35, 0.5, 2, 8]} />
        </mesh>
        <mesh position={[0, 4.2, 0]} material={gold} castShadow>
          <cylinderGeometry args={[2.2, 0.7, 3, 14]} />
        </mesh>
        {[2.2, -2.2].map((x) => (
          <mesh key={x} position={[x, 4.4, 0]} rotation={[0, x > 0 ? 0 : Math.PI, 0]} material={gold}>
            <torusGeometry args={[0.8, 0.18, 6, 14, Math.PI * 1.2]} />
          </mesh>
        ))}
        <mesh position={[0, 6.3, 0]} material={glow('#61dafb', 2.2)}>
          <icosahedronGeometry args={[0.7, 0]} />
        </mesh>
      </group>
    </>
  )
}

function Penguins() {
  const spots = useMemo(() => scatter(5, 10, 71, { min: 6.5, max: 16, from: 0.1, to: 0.9 }), [])
  const refs = useRef<THREE.Group[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z = Math.sin(t * 5 + i) * 0.12
    })
  })
  return (
    <>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, faceRoadYaw(s.u, s.off, -0.3), 0]}>
          <group ref={(g) => void (refs.current[i] = g!)}>
            <mesh position={[0, 0.65, 0]} scale={[0.45, 0.7, 0.4]} material={mat('#1d2230')} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh position={[0, 0.6, 0.18]} scale={[0.34, 0.55, 0.26]} material={mat('#ffffff')}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh position={[0, 1.42, 0]} material={mat('#1d2230')}>
              <icosahedronGeometry args={[0.3, 1]} />
            </mesh>
            <mesh position={[0, 1.38, 0.3]} rotation={[Math.PI / 2, 0, 0]} material={mat('#ff9f1c')}>
              <coneGeometry args={[0.08, 0.25, 6]} />
            </mesh>
            {[0.1, -0.1].map((x) => (
              <mesh key={x} position={[x, 1.5, 0.24]} material={mat('#ffffff')}>
                <sphereGeometry args={[0.05, 6, 4]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  )
}

export function Snow() {
  const data = useMemo(() => {
    const pines: Inst[] = scatter(5, 260, 81, { min: 7, max: 150, bias: 1.5 }).map((s) => ({
      p: [s.x, s.y - 0.3, s.z],
      yaw: s.yaw,
      s: 0.8 + s.r * 0.9,
    }))
    const rocks: Inst[] = scatter(5, 40, 82, { min: 7, max: 70 }).map((s) => ({ p: [s.x, s.y - 0.2, s.z], yaw: s.yaw, s: 0.6 + s.r * 1.6 }))
    const snowmen = scatter(5, 5, 83, { min: 7, max: 14, from: 0.1, to: 0.9 })
    const crystals = scatter(5, 22, 84, { min: 8, max: 40 })
    const igloos = scatter(5, 3, 85, { min: 14, max: 26, from: 0.15, to: 0.85 })
    return { pines, rocks, snowmen, crystals, igloos }
  }, [])
  const cert = certifications[0]
  return (
    <ZoneGroup zone={5}>
      <Instanced geometry={pineGeo(true)} material={vertexColorMat} items={data.pines} castShadow />
      <Instanced geometry={snowRockGeo()} material={vertexColorMat} items={data.rocks} castShadow />
      {data.snowmen.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, faceRoadYaw(s.u, s.off, 0), 0]}>
          <mesh position={[0, 0.8, 0]} material={mat('#ffffff')} castShadow>
            <icosahedronGeometry args={[0.95, 1]} />
          </mesh>
          <mesh position={[0, 2.1, 0]} material={mat('#ffffff')} castShadow>
            <icosahedronGeometry args={[0.65, 1]} />
          </mesh>
          <mesh position={[0, 3.0, 0]} material={mat('#ffffff')} castShadow>
            <icosahedronGeometry args={[0.45, 1]} />
          </mesh>
          <mesh position={[0, 3.0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={mat('#ff7a1a')}>
            <coneGeometry args={[0.08, 0.5, 6]} />
          </mesh>
          <mesh position={[0, 3.55, 0]} material={mat('#1b1f2e')}>
            <cylinderGeometry args={[0.35, 0.35, 0.55, 10]} />
          </mesh>
          <mesh position={[0, 2.55, 0]} rotation={[0.1, 0, 0]} material={mat(i % 2 ? '#e2412b' : '#2a9df4')}>
            <torusGeometry args={[0.5, 0.12, 6, 14]} />
          </mesh>
        </group>
      ))}
      {data.crystals.map((s, i) => (
        <mesh key={i} position={[s.x, s.y + 1.2, s.z]} rotation={[0, s.yaw, 0.2]} scale={[0.7, 1.6 + s.r * 1.5, 0.7]} material={glow('#9fe6ff', 1.25)}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {data.igloos.map((s, i) => (
        <group key={i} position={[s.x, s.y - 0.2, s.z]} rotation={[0, faceRoadYaw(s.u, s.off, 0), 0]}>
          <mesh material={mat('#eaf4ff')} castShadow>
            <sphereGeometry args={[3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.9, 2.6]} rotation={[Math.PI / 2, 0, 0]} material={mat('#eaf4ff')}>
            <cylinderGeometry args={[1.1, 1.1, 1.6, 10, 1, false, 0, Math.PI]} />
          </mesh>
          <mesh position={[0, 0.7, 3.3]} material={mat('#1b2433')}>
            <circleGeometry args={[0.8, 10, 0, Math.PI]} />
          </mesh>
        </group>
      ))}
      <Monument f={0.32} off={-17}>
        <GradCap />
        <Plaque
          kicker="Education · Achievement unlocked"
          title={education.degree.replace(' (BCA)', '')}
          lines={[`${education.school}`, `Class of ${education.year} · Score ${education.score}`]}
          accent="#ffd166"
        />
      </Monument>
      <Monument f={0.68} off={17}>
        <Trophy />
        <Plaque
          kicker="Certification · Trophy earned"
          title={cert.name}
          lines={[cert.issuer, cert.date]}
          accent="#61dafb"
        />
      </Monument>
      <Penguins />
    </ZoneGroup>
  )
}
