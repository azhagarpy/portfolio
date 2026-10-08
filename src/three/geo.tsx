import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { live, ROAD_LENGTH, ZONES } from '../lib/journey'
import { mat } from './materials'

type V3 = [number, number, number]

/** Bake a coloured, transformed copy of a geometry for merging */
export function part(g: THREE.BufferGeometry, color: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
  const geo = g.index ? g.toNonIndexed() : g.clone()
  geo.deleteAttribute('uv')
  geo.deleteAttribute('normal')
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  )
  geo.applyMatrix4(m)
  const c = new THREE.Color(color)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

export function merged(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts)!
  g.computeVertexNormals()
  return g
}

export interface Inst {
  p: V3
  yaw?: number
  r?: V3
  s?: number | V3
  c?: string
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

export function writeInstance(mesh: THREE.InstancedMesh, i: number, it: Inst) {
  _p.set(...it.p)
  if (it.r) _e.set(...it.r)
  else _e.set(0, it.yaw ?? 0, 0)
  _q.setFromEuler(_e)
  if (typeof it.s === 'number') _s.setScalar(it.s)
  else if (it.s) _s.set(...it.s)
  else _s.setScalar(1)
  _m.compose(_p, _q, _s)
  mesh.setMatrixAt(i, _m)
  if (it.c) mesh.setColorAt(i, _c.set(it.c))
}

/** Static instanced mesh from a list of transforms */
export function Instanced({
  geometry,
  material,
  items,
  castShadow = false,
  receiveShadow = false,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Inst[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const mesh = ref.current
    items.forEach((it, i) => writeInstance(mesh, i, it))
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  if (items.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

/** Hides a zone's content when the player is far away */
export function ZoneGroup({ zone, children }: { zone: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(() => {
    const zf = live.focusU * ZONES
    ref.current.visible = zf > zone - 1.2 && zf < zone + 2.2
  })
  return <group ref={ref}>{children}</group>
}

/* Small JSX helpers for hand-built models */

export function B({
  s,
  p,
  r,
  c,
  m,
  cast = true,
}: {
  s: V3
  p: V3
  r?: V3
  c?: string
  m?: THREE.Material
  cast?: boolean
}) {
  return (
    <mesh position={p} rotation={r} material={m ?? mat(c ?? '#ffffff')} castShadow={cast}>
      <boxGeometry args={s} />
    </mesh>
  )
}

export function Cyl({
  a,
  p,
  r,
  c,
  m,
  cast = true,
}: {
  a: [number, number, number, number?]
  p: V3
  r?: V3
  c?: string
  m?: THREE.Material
  cast?: boolean
}) {
  return (
    <mesh position={p} rotation={r} material={m ?? mat(c ?? '#ffffff')} castShadow={cast}>
      <cylinderGeometry args={[a[0], a[1], a[2], a[3] ?? 12]} />
    </mesh>
  )
}

/** Wheel that spins with distance travelled by vehicle v */
export function Wheel({ v, r, w, p, color = '#1c1c1f', hub = '#c9ccd2' }: { v: number; r: number; w: number; p: V3; color?: string; hub?: string }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(() => {
    ref.current.rotation.x = (live.vehicles[v].u * ROAD_LENGTH) / r
  })
  return (
    <group position={p}>
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mat(color, { rough: 0.95 })} castShadow>
          <cylinderGeometry args={[r, r, w, 14]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mat(hub, { metal: 0.5, rough: 0.4 })}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, w + 0.03, 7]} />
        </mesh>
        <mesh material={mat('#2a2a2e')}>
          <boxGeometry args={[w + 0.05, r * 1.05, 0.1]} />
        </mesh>
      </group>
    </group>
  )
}
