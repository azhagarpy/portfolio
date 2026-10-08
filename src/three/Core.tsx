import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type BloomEffect } from 'postprocessing'
import { game, stepGame } from '../lib/game'
import { COINS, live, ROAD_LENGTH, ZONES, zoneWeights } from '../lib/journey'
import { clamp, damp, mulberry32, smoothstep } from '../lib/math'
import { settings, useStore } from '../lib/store'

if (import.meta.env.DEV) (window as unknown as { __live: typeof live }).__live = live

/** Reads the page scroll and advances the game + journey every frame */
export function JourneyController() {
  useFrame((state, delta) => {
    stepGame(state.clock.elapsedTime, Math.min(delta, 0.1))
    live.panel = live.kind === 'drive' ? 1 : 0
  }, -10)
  return null
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const st = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), shift: 1, init: false })
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const s = st.current
    const c = live.cam
    if (!s.init || live.snap) {
      s.pos.copy(c.pos)
      s.target.copy(c.target)
      s.init = true
      live.snap = false
    }
    s.pos.lerp(c.pos, 1 - Math.exp(-dt * 9))
    s.target.lerp(c.target, 1 - Math.exp(-dt * 12))
    camera.position.copy(s.pos)
    if (c.shake > 0) {
      const t = live.time * 60
      camera.position.x += Math.sin(t * 1.3) * c.shake
      camera.position.y += Math.sin(t * 1.7 + 1) * c.shake
    }
    camera.lookAt(s.target)

    s.shift = damp(s.shift, live.panel, 3, dt)
    const w = size.width
    const h = size.height
    const aspect = w / h
    const fov = aspect < 0.8 ? 64 : aspect < 1.2 ? 56 : 50
    if (camera.fov !== fov) camera.fov = fov
    if (w >= 900) camera.setViewOffset(w, h, w * 0.17 * s.shift, 0, w, h)
    else camera.setViewOffset(w, h, 0, h * 0.2 * s.shift, w, h)
    camera.updateProjectionMatrix()
  })
  return null
}

export function Coins() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 18)
    g.rotateX(Math.PI / 2)
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffd23f',
        metalness: 0.35,
        roughness: 0.3,
        emissive: '#ffae00',
        emissiveIntensity: 0.75,
        flatShading: true,
      }),
    [],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const mesh = ref.current
    const t = clock.elapsedTime
    for (let i = 0; i < COINS.length; i++) {
      const c = COINS[i]
      const d = (live.focusU - c.u) * ROAD_LENGTH
      let s = 1
      let lift = Math.sin(t * 2 + i) * 0.15
      let spin = 0
      if (game.collected[i]) {
        // pop up and vanish after being grabbed
        const k = clamp((t - game.collectedAt[i]) / 0.45)
        s = (1 + Math.sin(k * Math.PI) * 0.5) * (1 - smoothstep(0.4, 1, k))
        lift += k * 2.2
        spin = k * 12
      }
      if (Math.abs(d) > 260) s = 0
      p.copy(c.pos)
      p.y += lift
      e.set(0, t * 2.4 + i * 0.4 + spin, 0)
      q.setFromEuler(e)
      sc.setScalar(s)
      m.compose(p, q, sc)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  useLayoutEffect(() => {
    ref.current.frustumCulled = false
  }, [])
  return <instancedMesh ref={ref} args={[geometry, material, COINS.length]} castShadow />
}

const snowVert = /* glsl */ `
uniform float uTime; uniform vec3 uOrigin; uniform vec3 uBox;
attribute float aSeed;
void main() {
  vec3 p = position;
  p.y -= uTime * (1.6 + aSeed * 1.4);
  p.x += sin(uTime * 0.7 + aSeed * 20.0) * 1.2;
  vec3 wp = p - uBox * floor((p - uOrigin) / uBox + 0.5);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + aSeed * 2.5) * (260.0 / -mv.z);
}`
const snowFrag = /* glsl */ `
uniform float uOpacity; uniform vec3 uColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.15, length(c)) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`

/** Snowfall that wraps around the camera, only in the snow zone */
export function Snowfall() {
  const weights = useMemo(() => new Array(ZONES).fill(0), [])
  const { geometry, material } = useMemo(() => {
    const n = 3500
    const rnd = mulberry32(7)
    const box = new THREE.Vector3(140, 70, 140)
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos.set([rnd() * box.x, rnd() * box.y, rnd() * box.z], i * 3)
      seed[i] = rnd()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: snowVert,
      fragmentShader: snowFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOrigin: { value: new THREE.Vector3() },
        uBox: { value: box },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') },
      },
    })
    return { geometry: g, material: m }
  }, [])
  const ref = useRef<THREE.Points>(null!)
  useFrame(({ clock, camera }) => {
    zoneWeights(live.focusU * ZONES, 0.08, weights)
    const o = weights[5] * (1 - live.space)
    material.uniforms.uOpacity.value = o * 0.9
    ref.current.visible = o > 0.01
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uOrigin.value.copy(camera.position)
  })
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

export function Effects() {
  const quality = useStore(settings, (s) => s.quality)
  const bloom = useRef<BloomEffect>(null)
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = live.bloom
  })
  if (quality === 'low') return null
  return (
    <EffectComposer multisampling={4}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.7} radius={0.75} />
      <Vignette offset={0.32} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
