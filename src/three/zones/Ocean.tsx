import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { projects } from '../../data/portfolio'
import { alongRoad, boundaryU, faceRoadYaw, ROAD_HALF, ROAD_LENGTH, roadPoint, roadYaw, ZONE_SPAN, zoneU } from '../../lib/journey'
import { lerp, mulberry32 } from '../../lib/math'
import { Instanced, writeInstance, ZoneGroup, type Inst } from '../geo'
import { additive, glow, mat, vertexColorMat } from '../materials'
import { buildStrip, buildWall } from '../Road'
import { signTexture } from '../textures'
import { WATER_LEVEL } from '../Terrain'
import { boxBaseGeo, palmGeo } from './props'

const waterVert = /* glsl */ `
uniform float uTime;
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += sin(w.x * 0.12 + uTime * 1.1) * 0.35 + sin(w.z * 0.17 + uTime * 0.8) * 0.3 + sin((w.x + w.z) * 0.31 + uTime * 1.7) * 0.12;
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const waterFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSky;
varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (n.y < 0.0) n = -n;
  vec3 v = normalize(cameraPosition - vW);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float diff = max(dot(n, uSunDir), 0.0);
  vec3 col = mix(uDeep, uShallow, diff * 0.6 + 0.2);
  col = mix(col, uSky, fres * 0.55);
  vec3 h = normalize(uSunDir + v);
  col += vec3(1.0, 0.85, 0.7) * pow(max(dot(n, h), 0.0), 90.0) * 1.6;
  gl_FragColor = vec4(col, 0.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

function Water() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waterVert,
        fragmentShader: waterFrag,
        fog: true,
        transparent: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uDeep: { value: new THREE.Color('#0b4f7c') },
            uShallow: { value: new THREE.Color('#2fc6c6') },
            uSky: { value: new THREE.Color('#ffc3a8') },
            uSunDir: { value: new THREE.Vector3(0.12, 0.3, -1).normalize() },
          },
        ]),
      }),
    [],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  const mid = roadPoint(zoneU(4, 0.5))
  return (
    <mesh position={[mid.x, WATER_LEVEL, mid.z]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[900, ZONE_SPAN + 340, 150, 90]} />
    </mesh>
  )
}

const DECK = ROAD_HALF + 2.4
const TOWER_OFF = 6.6
const TOWER_FRACS = [0.17, 0.4, 0.63, 0.86]
const TOWER_TOP = 31

function Bridge() {
  const u0 = boundaryU(4) - 0.004
  const u1 = boundaryU(5) + 0.004
  const geos = useMemo(() => {
    const walk = [buildStrip(u0, u1, ROAD_HALF, DECK, 0.18, 2), buildStrip(u0, u1, -DECK, -ROAD_HALF, 0.18, 2)]
    const sides = [buildWall(u0, u1, DECK, -1.5, 0.18), buildWall(u0, u1, -DECK, -1.5, 0.18), buildStrip(u0, u1, -DECK, DECK, -1.5, 3)]
    const rails = [buildWall(u0, u1, DECK - 0.1, 1.0, 1.15), buildWall(u0, u1, -DECK + 0.1, 1.0, 1.15)]
    return { walk, sides, rails }
  }, [u0, u1])

  const { posts, pillars, towers, beams } = useMemo(() => {
    const posts: Inst[] = []
    const n = Math.floor(((u1 - u0) * ROAD_LENGTH) / 3)
    for (let i = 0; i <= n; i++) {
      const u = lerp(u0, u1, i / n)
      for (const s of [1, -1]) {
        const p = alongRoad(u, s * (DECK - 0.1))
        posts.push({ p: [p.x, 0.18, p.z], yaw: roadYaw(u), s: [0.1, 0.9, 0.1] })
      }
    }
    const pillars: Inst[] = []
    for (let f = 0.04; f < 0.98; f += 26 / ZONE_SPAN) {
      const u = zoneU(4, f)
      for (const s of [1, -1]) {
        const p = alongRoad(u, s * 3)
        pillars.push({ p: [p.x, -24, p.z], yaw: roadYaw(u), s: [1.6, 22.6, 1.6] })
      }
    }
    const towers: Inst[] = []
    const beams: Inst[] = []
    TOWER_FRACS.forEach((f) => {
      const u = zoneU(4, f)
      const yaw = roadYaw(u)
      for (const s of [1, -1]) {
        const p = alongRoad(u, s * TOWER_OFF)
        towers.push({ p: [p.x, -24, p.z], yaw, s: [1.3, 24 + TOWER_TOP + 1, 1.8] })
      }
      const c = roadPoint(u)
      beams.push({ p: [c.x, TOWER_TOP - 1.2, c.z], yaw, s: [TOWER_OFF * 2 + 1.3, 1.4, 1.4] })
      beams.push({ p: [c.x, -2.6, c.z], yaw, s: [TOWER_OFF * 2 + 1.3, 1.1, 1.4] })
    })
    return { posts, pillars, towers, beams }
  }, [u0, u1])

  const cables = useMemo(() => {
    const anchorsU = [zoneU(4, 0.02), ...TOWER_FRACS.map((f) => zoneU(4, f)), zoneU(4, 0.98)]
    const tubes: THREE.BufferGeometry[] = []
    const hanger: number[] = []
    for (const s of [1, -1]) {
      for (let k = 0; k < anchorsU.length - 1; k++) {
        const ua = anchorsU[k]
        const ub = anchorsU[k + 1]
        const ya = k === 0 ? 0.6 : TOWER_TOP
        const yb = k === anchorsU.length - 2 ? 0.6 : TOWER_TOP
        const pts: THREE.Vector3[] = []
        const N = 16
        for (let i = 0; i <= N; i++) {
          const t = i / N
          const u = lerp(ua, ub, t)
          const sag = k === 0 || k === anchorsU.length - 2 ? 0 : 24 * 4 * t * (1 - t)
          const y = lerp(ya, yb, t) - sag
          const p = alongRoad(u, s * TOWER_OFF, y)
          pts.push(p)
          if (i > 0 && i < N && y > 1.4) hanger.push(p.x, y, p.z, p.x, 0.2, p.z)
        }
        tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.16, 5))
      }
    }
    const hg = new THREE.BufferGeometry()
    hg.setAttribute('position', new THREE.Float32BufferAttribute(hanger, 3))
    return { tubes, hg }
  }, [])

  const deckMat = mat('#c9ccd3', { rough: 0.85, side: THREE.DoubleSide })
  const sideMat = mat('#e85d4a', { rough: 0.6, side: THREE.DoubleSide })
  const cableMat = mat('#e85d4a', { rough: 0.5 })
  return (
    <group>
      {geos.walk.map((g, i) => (
        <mesh key={'w' + i} geometry={g} material={deckMat} receiveShadow />
      ))}
      {geos.sides.map((g, i) => (
        <mesh key={'s' + i} geometry={g} material={sideMat} />
      ))}
      {geos.rails.map((g, i) => (
        <mesh key={'r' + i} geometry={g} material={mat('#f1f1f1', { side: THREE.DoubleSide })} />
      ))}
      <Instanced geometry={boxBaseGeo()} material={mat('#f1f1f1')} items={posts} />
      <Instanced geometry={boxBaseGeo()} material={mat('#9aa0a8')} items={pillars} />
      <Instanced geometry={boxBaseGeo()} material={mat('#e85d4a', { rough: 0.6 })} items={towers} castShadow />
      <Instanced geometry={boxBaseGeo()} material={mat('#d14f3e', { rough: 0.6 })} items={beams} castShadow />
      {cables.tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={cableMat} />
      ))}
      <lineSegments geometry={cables.hg}>
        <lineBasicMaterial color="#f3e7e1" transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}

const ISLAND_FRACS = [0.25, 0.5, 0.75]

function Island({ index }: { index: number }) {
  const pr = projects[index]
  const f = ISLAND_FRACS[index]
  const off = -(29 + index * 3)
  const u = zoneU(4, f)
  const p = alongRoad(u, off)
  const yaw = faceRoadYaw(u, off, 1.1)
  const tex = useMemo(
    () =>
      signTexture({
        kicker: `Project 0${index + 1} · ${pr.kind}`,
        title: pr.name,
        lines: [pr.stack.join(' · ')],
        bg: '#0c1222',
        fg: '#ffffff',
        accent: pr.color,
        w: 1024,
        h: 512,
      }),
    [index, pr],
  )
  const palms = useMemo<Inst[]>(() => {
    const rnd = mulberry32(90 + index)
    return Array.from({ length: 6 }, () => {
      const a = rnd() * Math.PI * 2
      const r = 4 + rnd() * 6.5
      return { p: [Math.cos(a) * r, 1.2, Math.sin(a) * r], yaw: rnd() * 6, s: 0.9 + rnd() * 0.5 }
    })
  }, [index])
  return (
    <group position={[p.x, WATER_LEVEL, p.z]}>
      <mesh position={[0, -4, 0]} material={mat('#e8d29c')} receiveShadow>
        <cylinderGeometry args={[14, 18, 8, 12]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={mat('#6dbb4f')} receiveShadow castShadow>
        <cylinderGeometry args={[11, 13.5, 1.6, 12]} />
      </mesh>
      <group>
        <Instanced geometry={palmGeo()} material={vertexColorMat} items={palms} castShadow />
      </group>
      <group rotation={[0, yaw, 0]}>
        {[-6.5, 6.5].map((x) => (
          <mesh key={x} position={[x, 8, -0.4]} material={mat('#2b2f3a')} castShadow>
            <boxGeometry args={[0.6, 14, 0.6]} />
          </mesh>
        ))}
        <mesh position={[0, 15.6, -0.35]} material={mat('#1d212b')} castShadow>
          <boxGeometry args={[23, 11.8, 0.4]} />
        </mesh>
        <mesh position={[0, 15.6, 0.0]}>
          <planeGeometry args={[22, 11]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 21.6, -0.1]} material={glow(pr.color, 2.4)}>
          <boxGeometry args={[23, 0.25, 0.25]} />
        </mesh>
      </group>
    </group>
  )
}

function Lighthouse() {
  const beam = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    beam.current.rotation.y += dt * 0.9
  })
  const u = zoneU(4, 0.62)
  const p = alongRoad(u, 34)
  return (
    <group position={[p.x, WATER_LEVEL, p.z]}>
      <mesh position={[0, -1, 0]} material={mat('#7d8288')} receiveShadow>
        <dodecahedronGeometry args={[7, 0]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 4 + i * 2.6, 0]} material={mat(i % 2 ? '#e2412b' : '#f6f6f6')} castShadow>
          <cylinderGeometry args={[1.9 - i * 0.12, 2.0 - i * 0.12, 2.6, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 19.6, 0]} material={glow('#fff3c0', 2.5)}>
        <cylinderGeometry args={[1.2, 1.2, 1.8, 10]} />
      </mesh>
      <mesh position={[0, 21.2, 0]} material={mat('#2b2f3a')}>
        <coneGeometry args={[1.7, 1.6, 10]} />
      </mesh>
      <group ref={beam} position={[0, 19.6, 0]}>
        <mesh position={[0, 0, 22]} rotation={[-Math.PI / 2, 0, 0]} material={additive('#fff0b8', 0.16)}>
          <coneGeometry args={[6, 44, 16, 1, true]} />
        </mesh>
      </group>
    </group>
  )
}

function Sea() {
  // sailboats, whales and seagulls
  const boats = useMemo(() => {
    const rnd = mulberry32(61)
    return Array.from({ length: 9 }, (_, i) => {
      const f = 0.08 + i * 0.1 + rnd() * 0.04
      const off = (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 90)
      const p = alongRoad(zoneU(4, f), off)
      return { p, yaw: rnd() * 6, sail: ['#ffffff', '#ffd166', '#ff7eb6', '#4fc3ff'][i % 4] }
    })
  }, [])
  const boatRefs = useRef<THREE.Group[]>([])
  const whaleRefs = useRef<THREE.Group[]>([])
  const whales = useMemo(
    () => [
      { p: alongRoad(zoneU(4, 0.33), -36), yaw: 0.6, period: 7, offset: 0 },
      { p: alongRoad(zoneU(4, 0.7), 40), yaw: 2.4, period: 9, offset: 3 },
      { p: alongRoad(zoneU(4, 0.12), 30), yaw: -0.8, period: 8, offset: 5 },
    ],
    [],
  )
  const gulls = useRef<THREE.InstancedMesh>(null!)
  const gullData = useMemo(() => {
    const rnd = mulberry32(62)
    return Array.from({ length: 16 }, () => ({
      f: rnd(),
      off: (rnd() - 0.5) * 60,
      y: 12 + rnd() * 18,
      r: 6 + rnd() * 10,
      sp: 0.3 + rnd() * 0.4,
      ph: rnd() * 6,
    }))
  }, [])
  const gullGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0.3, -1.2, 0.35, 0, 0, 0, -0.3, 0, 0, 0.3, 0, 0, -0.3, 1.2, 0.35, 0], 3),
    )
    g.computeVertexNormals()
    return g
  }, [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    boatRefs.current.forEach((g, i) => {
      if (!g) return
      g.position.y = WATER_LEVEL + Math.sin(t * 1.2 + i) * 0.25
      g.rotation.z = Math.sin(t * 0.9 + i) * 0.06
    })
    whaleRefs.current.forEach((g, i) => {
      if (!g) return
      const w = whales[i]
      const ph = ((t + w.offset) % w.period) / 2.6
      if (ph > 1) {
        g.visible = false
        return
      }
      g.visible = true
      const a = ph * Math.PI
      g.position.set(w.p.x + Math.sin(w.yaw) * (ph - 0.5) * 14, WATER_LEVEL - 3 + Math.sin(a) * 8, w.p.z + Math.cos(w.yaw) * (ph - 0.5) * 14)
      g.rotation.set(-Math.cos(a) * 0.9, w.yaw, 0, 'YXZ')
    })
    gullData.forEach((d, i) => {
      const c = alongRoad(zoneU(4, d.f), d.off, d.y, tmp)
      const a = t * d.sp + d.ph
      const x = c.x + Math.cos(a) * d.r
      const z = c.z + Math.sin(a) * d.r
      const flap = Math.sin(t * 8 + i) * 0.35
      writeInstance(gulls.current, i, { p: [x, c.y + Math.sin(t + i) * 0.5, z], r: [0, -a, flap], s: 1.1 })
    })
    gulls.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      {boats.map((b, i) => (
        <group key={i} ref={(g) => void (boatRefs.current[i] = g!)} position={[b.p.x, WATER_LEVEL, b.p.z]} rotation={[0, b.yaw, 0]}>
          <mesh position={[0, 0.4, 0]} material={mat('#6b3e26')} castShadow>
            <boxGeometry args={[1.8, 0.9, 5]} />
          </mesh>
          <mesh position={[0, 4, 0]} material={mat('#d9d9d9')}>
            <cylinderGeometry args={[0.08, 0.08, 6.4, 6]} />
          </mesh>
          <mesh position={[0, 4.2, -1.1]} rotation={[0, Math.PI / 2, 0]} material={mat(b.sail, { side: THREE.DoubleSide })} castShadow>
            <shapeGeometry args={[sailShape]} />
          </mesh>
        </group>
      ))}
      {whales.map((w, i) => (
        <group key={i} ref={(g) => void (whaleRefs.current[i] = g!)}>
          <mesh scale={[1.6, 1.3, 4.2]} material={mat('#2f4a66')} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh position={[0, -0.5, 0.6]} scale={[1.3, 0.8, 3.2]} material={mat('#dfe8f0')}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh position={[0, 0.2, -4.6]} rotation={[0.2, 0, 0]} scale={[3.2, 0.25, 1.2]} material={mat('#2f4a66')}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={gulls} args={[gullGeo, mat('#ffffff', { side: THREE.DoubleSide }), gullData.length]} frustumCulled={false} />
    </>
  )
}

const sailShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(0, -2.8)
  s.lineTo(3.2, -2.8)
  s.lineTo(0, 3)
  s.lineTo(0, -2.8)
  return s
})()

export function Ocean() {
  return (
    <ZoneGroup zone={4}>
      <Water />
      <Bridge />
      {projects.map((_, i) => (
        <Island key={i} index={i} />
      ))}
      <Lighthouse />
      <Sea />
    </ZoneGroup>
  )
}
