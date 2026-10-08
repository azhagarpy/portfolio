import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live, ZONES, zoneWeights } from '../lib/journey'
import { useStore, settings } from '../lib/store'
import { mulberry32 } from '../lib/math'

interface Preset {
  top: string
  bottom: string
  fog: string
  near: number
  far: number
  sun: string
  sunI: number
  dir: [number, number, number]
  hemiSky: string
  hemiGround: string
  hemiI: number
  stars: number
  bloom: number
  sunSize: number
}

const PRESETS: Preset[] = [
  { top: '#4f7fd6', bottom: '#ffc890', fog: '#f3c9a2', near: 45, far: 340, sun: '#ffd6a8', sunI: 2.6, dir: [-0.45, 0.32, -0.8], hemiSky: '#c4dcff', hemiGround: '#7a6a3a', hemiI: 1.1, stars: 0, bloom: 0.55, sunSize: 1 },
  { top: '#5f9fd9', bottom: '#e2f1d8', fog: '#bcd5b4', near: 25, far: 215, sun: '#fff1d0', sunI: 2.4, dir: [0.35, 0.75, -0.4], hemiSky: '#d6ecff', hemiGround: '#3a5228', hemiI: 1.05, stars: 0, bloom: 0.5, sunSize: 0.8 },
  { top: '#3b7fe0', bottom: '#d4e8ff', fog: '#cadef3', near: 50, far: 360, sun: '#ffffff', sunI: 2.7, dir: [0.5, 0.62, -0.35], hemiSky: '#dbeaff', hemiGround: '#6d7280', hemiI: 1.15, stars: 0, bloom: 0.5, sunSize: 0.8 },
  { top: '#05010f', bottom: '#2e0c55', fog: '#1d0838', near: 25, far: 250, sun: '#8c7cff', sunI: 0.7, dir: [-0.3, 0.6, -0.5], hemiSky: '#5a3aa8', hemiGround: '#0b0718', hemiI: 0.6, stars: 0.9, bloom: 1.35, sunSize: 0.5 },
  { top: '#36509c', bottom: '#ffa07d', fog: '#efae96', near: 80, far: 480, sun: '#ffb98f', sunI: 2.3, dir: [0.12, 0.16, -1], hemiSky: '#ffd8c6', hemiGround: '#2d4d6b', hemiI: 1.0, stars: 0.1, bloom: 0.7, sunSize: 1.6 },
  { top: '#7fb6f2', bottom: '#f2f8ff', fog: '#e2eefb', near: 30, far: 260, sun: '#ffffff', sunI: 2.3, dir: [-0.4, 0.6, -0.5], hemiSky: '#eef6ff', hemiGround: '#a9bfd6', hemiI: 1.2, stars: 0, bloom: 0.45, sunSize: 0.8 },
  { top: '#16123a', bottom: '#ff7350', fog: '#6a2f40', near: 55, far: 360, sun: '#ff9a6b', sunI: 1.7, dir: [0.25, 0.14, -1], hemiSky: '#8a6aa8', hemiGround: '#3a1a14', hemiI: 0.75, stars: 0.6, bloom: 0.9, sunSize: 1.4 },
]
const SPACE: Preset = { top: '#000003', bottom: '#080420', fog: '#05030f', near: 120, far: 700, sun: '#ffffff', sunI: 2.4, dir: [-0.6, 0.35, 0.7], hemiSky: '#6a6aa0', hemiGround: '#1a1a2a', hemiI: 0.9, stars: 1, bloom: 0.9, sunSize: 0.6 }

const COLOR_KEYS = ['top', 'bottom', 'fog', 'sun', 'hemiSky', 'hemiGround'] as const
const NUM_KEYS = ['near', 'far', 'sunI', 'hemiI', 'stars', 'bloom', 'sunSize'] as const

type Parsed = Record<(typeof COLOR_KEYS)[number], THREE.Color> & Record<(typeof NUM_KEYS)[number], number> & { dir: THREE.Vector3 }

function parse(p: Preset): Parsed {
  const out = { dir: new THREE.Vector3(...p.dir).normalize() } as Parsed
  for (const k of COLOR_KEYS) out[k] = new THREE.Color(p[k])
  for (const k of NUM_KEYS) out[k] = p[k]
  return out
}

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w;
}`

const skyFragment = /* glsl */ `
uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uSunSize;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 col = mix(uBottom, uTop, smoothstep(-0.02, 0.6, h));
  col = mix(col, uBottom * 0.85, smoothstep(0.0, -0.3, h));
  float s = max(dot(vDir, uSunDir), 0.0);
  col += uSun * (pow(s, 900.0 / uSunSize) * 4.0 + pow(s, 12.0) * 0.28 * uSunSize);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function Atmosphere() {
  const scene = useThree((s) => s.scene)
  const quality = useStore(settings, (s) => s.quality)
  const presets = useMemo(() => PRESETS.map(parse), [])
  const space = useMemo(() => parse(SPACE), [])
  const cur = useMemo(() => parse(PRESETS[0]), [])
  const weights = useMemo(() => new Array(ZONES).fill(0), [])

  const fog = useMemo(() => new THREE.Fog('#f3c9a2', 40, 340), [])
  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uSun: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(0, 1, 0) },
          uSunSize: { value: 1 },
        },
      }),
    [],
  )

  const stars = useMemo(() => {
    const rnd = mulberry32(42)
    const n = 2400
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2
      const y = rnd() * 1.1 - 0.15
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      pos.set([Math.cos(th) * r * 800, y * 800, Math.sin(th) * r * 800], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 1.8,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      }),
    [],
  )
  const planetMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#e8a4ff', transparent: true, opacity: 0, fog: false, depthWrite: false }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffd9a8',
        transparent: true,
        opacity: 0,
        fog: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  )

  const sky = useRef<THREE.Mesh>(null!)
  const starPts = useRef<THREE.Points>(null!)
  const planet = useRef<THREE.Group>(null!)
  const sun = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const tmpC = useMemo(() => new THREE.Color(), [])
  const focus = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    zoneWeights(live.focusU * ZONES, 0.06, weights)
    for (const k of COLOR_KEYS) cur[k].setRGB(0, 0, 0)
    for (const k of NUM_KEYS) cur[k] = 0
    cur.dir.set(0, 0, 0)
    for (let i = 0; i < ZONES; i++) {
      const w = weights[i]
      if (w < 1e-4) continue
      const p = presets[i]
      for (const k of COLOR_KEYS) {
        tmpC.copy(p[k]).multiplyScalar(w)
        cur[k].add(tmpC)
      }
      for (const k of NUM_KEYS) cur[k] += p[k] * w
      cur.dir.addScaledVector(p.dir, w)
    }
    const sp = live.space
    if (sp > 0) {
      for (const k of COLOR_KEYS) cur[k].lerp(space[k], sp)
      for (const k of NUM_KEYS) cur[k] += (space[k] - cur[k]) * sp
      cur.dir.lerp(space.dir, sp)
    }
    cur.dir.normalize()

    fog.color.copy(cur.fog)
    fog.near = cur.near
    fog.far = cur.far
    const u = skyMat.uniforms
    u.uTop.value.copy(cur.top)
    u.uBottom.value.copy(cur.bottom)
    u.uSun.value.copy(cur.sun)
    u.uSunDir.value.copy(cur.dir)
    u.uSunSize.value = cur.sunSize
    sky.current.position.copy(camera.position)
    starPts.current.position.copy(camera.position)
    starMat.opacity = cur.stars

    // ringed planet that appears at dusk and in space
    const launchW = weights[6]
    const pv = Math.max(launchW * 0.55, sp)
    planetMat.opacity = pv
    ringMat.opacity = pv * 0.8
    planet.current.visible = pv > 0.01
    planet.current.position.set(camera.position.x - 260, camera.position.y + 230 - sp * 120, camera.position.z - 520)

    hemi.current.color.copy(cur.hemiSky)
    hemi.current.groundColor.copy(cur.hemiGround)
    hemi.current.intensity = cur.hemiI
    sun.current.color.copy(cur.sun)
    sun.current.intensity = cur.sunI

    // keep the shadow frustum around the action
    const target = live.kind === 'swap' ? live.char.pos : live.vehicles[Math.min(live.vehicle, 7)].pos
    focus.copy(target)
    sun.current.position.copy(focus).addScaledVector(cur.dir, 120)
    sun.current.target.position.copy(focus)
    sun.current.target.updateMatrixWorld()
    live.bloom = cur.bloom
  })

  const shadowSize = quality === 'high' ? 2048 : 1024
  return (
    <>
      <mesh ref={sky} renderOrder={-10} material={skyMat} frustumCulled={false}>
        <sphereGeometry args={[900, 32, 16]} />
      </mesh>
      <points ref={starPts} geometry={stars} material={starMat} frustumCulled={false} renderOrder={-9} />
      <group ref={planet}>
        <mesh material={planetMat}>
          <sphereGeometry args={[60, 32, 16]} />
        </mesh>
        <mesh material={ringMat} rotation={[1.2, 0.3, 0.2]}>
          <ringGeometry args={[80, 112, 64]} />
        </mesh>
      </group>
      <hemisphereLight ref={hemi} args={['#ffffff', '#444444', 1]} />
      <directionalLight
        ref={sun}
        castShadow={quality === 'high'}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  )
}
