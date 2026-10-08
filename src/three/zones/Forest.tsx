import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instanced, ZoneGroup, type Inst } from '../geo'
import { vertexColorMat } from '../materials'
import { logGeo, mushroomGeo, pineGeo, rockGeo, roundTreeGeo, scatter } from './props'

const fireflyVert = /* glsl */ `
uniform float uTime;
attribute float aSeed;
varying float vA;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.6 + aSeed * 40.0) * 0.8;
  p.y += sin(uTime * 0.9 + aSeed * 17.0) * 0.6;
  p.z += cos(uTime * 0.5 + aSeed * 23.0) * 0.8;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 2.5 + aSeed * 60.0), 3.0);
  gl_PointSize = 5.0 * (120.0 / -mv.z);
}`
const fireflyFrag = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vec3(2.2, 2.6, 0.9) * a, a);
}`

function Fireflies() {
  const { geometry, material } = useMemo(() => {
    const spots = scatter(1, 380, 21, { min: 5.5, max: 45, ground: true, bias: 1 })
    const pos = new Float32Array(spots.length * 3)
    const seed = new Float32Array(spots.length)
    spots.forEach((s, i) => {
      pos.set([s.x, s.y + 0.6 + s.r * 3.2, s.z], i * 3)
      seed[i] = s.r + i * 0.013
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: fireflyVert,
      fragmentShader: fireflyFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 } },
    })
    return { geometry: g, material: m }
  }, [])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export function Forest() {
  const data = useMemo(() => {
    const toInst = (s: { x: number; y: number; z: number; yaw: number; r: number }, base = 1, vary = 0.6): Inst => ({
      p: [s.x, s.y - 0.3, s.z],
      yaw: s.yaw,
      s: base + s.r * vary,
    })
    const pines = scatter(1, 300, 31, { min: 7, max: 150, bias: 1.6 }).map((s) => toInst(s, 0.9, 0.9))
    const round = scatter(1, 120, 32, { min: 8, max: 120 }).map((s) => toInst(s, 0.8, 0.6))
    const rocks = scatter(1, 60, 33, { min: 6.5, max: 60 }).map((s) => ({ ...toInst(s, 0.6, 1.2), p: [s.x, s.y - 0.2, s.z] as [number, number, number] }))
    const shrooms = scatter(1, 34, 34, { min: 5.6, max: 11, clearance: 5.4 }).map((s) => toInst(s, 0.8, 1.0))
    const logs = scatter(1, 12, 35, { min: 6.5, max: 20 }).map((s) => toInst(s, 0.8, 0.4))
    // a few big pines close to the road for depth
    const giants = scatter(1, 24, 36, { min: 7, max: 14 }).map((s) => toInst(s, 1.5, 0.6))
    return { pines: [...pines, ...giants], round, rocks, shrooms, logs }
  }, [])
  return (
    <ZoneGroup zone={1}>
      <Instanced geometry={pineGeo()} material={vertexColorMat} items={data.pines} castShadow />
      <Instanced geometry={roundTreeGeo('#3f8a3a', '#4fa046')} material={vertexColorMat} items={data.round} castShadow />
      <Instanced geometry={rockGeo('#7d8580')} material={vertexColorMat} items={data.rocks} castShadow />
      <Instanced geometry={mushroomGeo()} material={vertexColorMat} items={data.shrooms} />
      <Instanced geometry={logGeo()} material={vertexColorMat} items={data.logs} castShadow />
      <Fireflies />
    </ZoneGroup>
  )
}

