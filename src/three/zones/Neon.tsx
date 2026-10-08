import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { alongRoad, faceRoadYaw, ROAD_HALF, roadPoint, roadYaw, ZONE_SPAN, zoneU } from '../../lib/journey'
import { mulberry32 } from '../../lib/math'
import { Instanced, writeInstance, ZoneGroup, type Inst } from '../geo'
import { buildingMaterial, glow, mat } from '../materials'
import { Sidewalks } from '../Road'
import { neonTexture } from '../textures'
import { boxBaseGeo, buildingLocal, streetBuildings, type Building } from './props'

const NEON = ['#ff3ec8', '#19f0ff', '#9b5cff', '#ffe14d', '#ff4d6d']

const SIGNS: [string, string, string?][] = [
  ['REACT.JS', '#19f0ff'],
  ['NEXT.JS', '#ffffff', 'App Router · SSR'],
  ['TYPESCRIPT', '#4d9bff'],
  ['REACT NATIVE', '#ff3ec8', 'Android + iOS'],
  ['JENKINS CI/CD', '#ffe14d', 'Deploys −40%'],
  ['PM2 · NGINX', '#7dff6a', 'Linux servers'],
  ['COMPONENTS', '#ff4d6d', 'Reusable architecture'],
  ['FULL CYCLE', '#9b5cff', 'Plan · Build · Ship'],
  ['OPEN 24/7', '#19f0ff', 'Production support'],
  ['SINCE 2024', '#ff3ec8'],
]

const gridVert = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const gridFrag = /* glsl */ `
uniform float uTime;
varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  vec2 g = vW.xz / 6.0;
  vec2 gw = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(gw.x, gw.y), 1.0);
  vec3 base = vec3(0.025, 0.012, 0.05);
  vec3 lc = mix(vec3(1.0, 0.15, 0.8), vec3(0.08, 0.9, 1.0), 0.5 + 0.5 * sin(vW.z * 0.015 + uTime * 0.4));
  float pulse = 0.55 + 0.45 * sin(vW.z * 0.08 - uTime * 3.0);
  gl_FragColor = vec4(base + lc * line * 1.5 * pulse, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

function GridFloor() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: gridVert,
        fragmentShader: gridFrag,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      }),
    [],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  const mid = roadPoint(zoneU(3, 0.5))
  return (
    <mesh position={[mid.x, 0, mid.z]} rotation={[-Math.PI / 2, 0, roadYaw(zoneU(3, 0.5))]} material={material}>
      <planeGeometry args={[400, ZONE_SPAN - 8]} />
    </mesh>
  )
}

function NeonSign({ u, off, y, text, color, sub }: { u: number; off: number; y: number; text: string; color: string; sub?: string }) {
  const tex = useMemo(() => neonTexture(text, color, sub), [text, color, sub])
  const p = alongRoad(u, off)
  const yaw = faceRoadYaw(u, off, 0.55)
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, y / 2, -0.3]} material={mat('#16121f', { metal: 0.6, rough: 0.4 })}>
        <boxGeometry args={[0.3, y, 0.3]} />
      </mesh>
      <mesh position={[0, y + 1.3, 0]}>
        <planeGeometry args={[8, 2.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.7, 1.7, 1.7]} />
      </mesh>
    </group>
  )
}

function Overhead({ u, title, sub, color }: { u: number; title: string; sub: string; color: string }) {
  const tex = useMemo(() => neonTexture(title, color, sub, 1280, 340), [title, color, sub])
  const p = roadPoint(u)
  const off = ROAD_HALF + 1.6
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, roadYaw(u) + Math.PI, 0]}>
      {[off, -off].map((x) => (
        <mesh key={x} position={[x, 5.5, 0]} material={mat('#16121f', { metal: 0.6, rough: 0.4 })}>
          <boxGeometry args={[0.6, 11, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, 10.2, -0.1]} material={mat('#100c18')}>
        <boxGeometry args={[off * 2 + 1, 3.6, 0.3]} />
      </mesh>
      <mesh position={[0, 10.2, 0.14]}>
        <planeGeometry args={[off * 2 + 0.6, ((off * 2 + 0.6) * 340) / 1280]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.8, 1.8, 1.8]} />
      </mesh>
    </group>
  )
}

function Rings() {
  const rings = useMemo(
    () =>
      [0.12, 0.26, 0.52, 0.62, 0.88].map((f, i) => {
        const u = zoneU(3, f)
        return { p: roadPoint(u), yaw: roadYaw(u), c: i % 2 ? '#19f0ff' : '#ff3ec8' }
      }),
    [],
  )
  return (
    <>
      {rings.map((r, i) => (
        <mesh key={i} position={[r.p.x, 0.5, r.p.z]} rotation={[0, r.yaw, 0]} material={glow(r.c, 3)}>
          <torusGeometry args={[7.6, 0.22, 8, 64, Math.PI]} />
        </mesh>
      ))}
    </>
  )
}

function FlyingCars() {
  const body = useRef<THREE.InstancedMesh>(null!)
  const lights = useRef<THREE.InstancedMesh>(null!)
  const cars = useMemo(() => {
    const rnd = mulberry32(77)
    return Array.from({ length: 22 }, () => ({
      off: (rnd() - 0.5) * 90,
      y: 14 + rnd() * 26,
      speed: (rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 16),
      phase: rnd(),
      c: NEON[Math.floor(rnd() * NEON.length)],
    }))
  }, [])
  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.7, 2.4, 4, 8).rotateX(Math.PI / 2), [])
  const lightGeo = useMemo(() => new THREE.BoxGeometry(1.5, 0.15, 3.4), [])
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false }), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    cars.forEach((c, i) => {
      const f = (((c.phase + (t * c.speed) / ZONE_SPAN) % 1) + 1) % 1
      const u = zoneU(3, f)
      alongRoad(u, c.off, c.y, p)
      const yaw = roadYaw(u) + (c.speed < 0 ? Math.PI : 0)
      const it: Inst = { p: [p.x, p.y, p.z], yaw }
      writeInstance(body.current, i, it)
      writeInstance(lights.current, i, { ...it, p: [p.x, p.y - 0.62, p.z], c: c.c })
    })
    body.current.instanceMatrix.needsUpdate = true
    lights.current.instanceMatrix.needsUpdate = true
    if (lights.current.instanceColor) lights.current.instanceColor.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={body} args={[bodyGeo, mat('#1c1830', { metal: 0.7, rough: 0.3 }), cars.length]} frustumCulled={false} />
      <instancedMesh ref={lights} args={[lightGeo, lightMat, cars.length]} frustumCulled={false} />
    </>
  )
}

function edgeStrips(buildings: Building[]) {
  const out: Inst[] = []
  buildings.forEach((b, i) => {
    if (b.row > 1) return
    const [d, h, w] = b.s
    const xf = b.side * (d / 2)
    const c = NEON[i % NEON.length]
    out.push({ p: buildingLocal(b, xf, 0, w / 2), yaw: b.yaw, s: [0.28, h, 0.28], c })
    out.push({ p: buildingLocal(b, xf, 0, -w / 2), yaw: b.yaw, s: [0.28, h, 0.28], c })
    out.push({ p: buildingLocal(b, xf, h - 0.2, 0), yaw: b.yaw, s: [0.28, 0.28, w], c })
    if (i % 3 === 0) out.push({ p: buildingLocal(b, xf, h * 0.55, 0), yaw: b.yaw, s: [0.2, 0.2, w], c: NEON[(i + 2) % NEON.length] })
  })
  return out
}

export function Neon() {
  const pinkLit = useMemo(
    () => buildingMaterial({ windowColor: '#1a1530', litColor: '#ff5fd8', litChance: 0.32, litStrength: 2.4, roughness: 0.4, metalness: 0.4 }),
    [],
  )
  const cyanLit = useMemo(
    () => buildingMaterial({ windowColor: '#14192e', litColor: '#3ff2ff', litChance: 0.3, litStrength: 2.4, roughness: 0.4, metalness: 0.4 }),
    [],
  )
  const stripMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.6), toneMapped: false }), [])
  const data = useMemo(() => {
    const buildings = streetBuildings(3, 51, {
      setback: ROAD_HALF + 5.6,
      skip: (f, _side, row) => f > 0.86 || (row === 0 && f < 0.09),
      rows: 3,
      hMin: 18,
      hMax: 85,
      colors: ['#1d1830', '#231c3a', '#161a2e', '#2a1f3d', '#1b2236'],
    })
    const a: Inst[] = []
    const b: Inst[] = []
    buildings.forEach((bd, i) => (i % 2 ? a : b).push({ p: bd.p, yaw: bd.yaw, s: bd.s, c: bd.c }))
    return { a, b, strips: edgeStrips(buildings) }
  }, [])

  return (
    <ZoneGroup zone={3}>
      <GridFloor />
      <Sidewalks zone={3} color="#1f1934" width={3.2} />
      <Instanced geometry={boxBaseGeo()} material={pinkLit} items={data.a} castShadow receiveShadow />
      <Instanced geometry={boxBaseGeo()} material={cyanLit} items={data.b} castShadow receiveShadow />
      <Instanced geometry={boxBaseGeo()} material={stripMat} items={data.strips} />
      {SIGNS.map(([t, c, sub], i) => (
        <NeonSign
          key={t}
          u={zoneU(3, 0.06 + i * 0.092)}
          off={(i % 2 ? 1 : -1) * (ROAD_HALF + 2.8)}
          y={5 + (i % 3) * 1.6}
          text={t}
          color={c}
          sub={sub}
        />
      ))}
      <Overhead u={zoneU(3, 0.38)} title="EWALL SOLUTIONS" sub="Junior Software Developer · May 2024 → Present" color="#ff3ec8" />
      <Overhead u={zoneU(3, 0.75)} title="5+ APPS SHIPPED" sub="React.js · Next.js · React Native · TypeScript" color="#19f0ff" />
      <Rings />
      <FlyingCars />
    </ZoneGroup>
  )
}
