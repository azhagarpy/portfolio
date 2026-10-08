import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { live, ROAD_LENGTH } from '../lib/journey'
import { smoothstep } from '../lib/math'
import { additive, glass, glow, mat } from './materials'
import { B, Cyl, Wheel } from './geo'
import { verticalLabel } from './textures'

function VehicleRig({ v, children }: { v: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(() => {
    const s = live.vehicles[v]
    const g = ref.current
    g.visible = Math.abs(s.u - live.focusU) * ROAD_LENGTH < 420
    g.position.copy(s.pos)
    g.rotation.set(s.pitch, s.yaw, s.roll, 'YXZ')
  })
  return <group ref={ref}>{children}</group>
}

const PI2 = Math.PI / 2

/** Headlights, tail lights and glow strips: on only while the engine runs */
function Lights({ v, children }: { v: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(() => {
    ref.current.visible = live.vehicles[v].power > 0.5
  })
  return <group ref={ref}>{children}</group>
}

function Headlight({ p, color = '#fff4c8', r = 0.12 }: { p: [number, number, number]; color?: string; r?: number }) {
  return (
    <mesh position={p} rotation={[PI2, 0, 0]} material={glow(color, 3)}>
      <cylinderGeometry args={[r, r, 0.06, 12]} />
    </mesh>
  )
}

function AutoRickshaw() {
  const yellow = '#f6c90e'
  const black = '#171717'
  return (
    <VehicleRig v={0}>
      <B s={[1.3, 0.16, 2.5]} p={[0, 0.42, -0.05]} c={black} />
      <B s={[1.42, 0.62, 1.6]} p={[0, 0.82, -0.5]} c={yellow} />
      <B s={[1.44, 0.08, 1.62]} p={[0, 0.86, -0.5]} c="#2e7d32" />
      <B s={[0.85, 1.0, 0.5]} p={[0, 0.95, 1.05]} c={yellow} />
      <B s={[0.5, 0.25, 0.5]} p={[0, 0.5, 1.32]} c={black} />
      <B s={[0.9, 0.55, 0.04]} p={[0, 1.8, 1.16]} r={[-0.12, 0, 0]} m={glass} cast={false} />
      <B s={[1.52, 0.12, 2.4]} p={[0, 2.3, -0.12]} c={black} />
      <B s={[1.44, 1.2, 0.1]} p={[0, 1.68, -1.27]} c={black} />
      <B s={[0.06, 1.12, 0.06]} p={[0.7, 1.7, 1.04]} c={black} />
      <B s={[0.06, 1.12, 0.06]} p={[-0.7, 1.7, 1.04]} c={black} />
      <B s={[1.25, 0.35, 0.55]} p={[0, 1.25, -0.9]} c="#2b2b2b" />
      <B s={[0.5, 0.12, 0.45]} p={[0, 0.9, 0.32]} c="#2b2b2b" />
      <B s={[0.85, 0.05, 0.05]} p={[0, 1.36, 0.82]} c="#444" />
      <Lights v={0}>
        <Headlight p={[0, 1.25, 1.31]} />
        <B s={[0.16, 0.1, 0.04]} p={[0.55, 0.8, -1.31]} m={glow('#ff3030', 2)} cast={false} />
        <B s={[0.16, 0.1, 0.04]} p={[-0.55, 0.8, -1.31]} m={glow('#ff3030', 2)} cast={false} />
      </Lights>
      <Wheel v={0} r={0.33} w={0.18} p={[0, 0.33, 1.25]} />
      <Wheel v={0} r={0.33} w={0.2} p={[0.74, 0.33, -0.85]} />
      <Wheel v={0} r={0.33} w={0.2} p={[-0.74, 0.33, -0.85]} />
    </VehicleRig>
  )
}

function Jeep() {
  const body = '#e2572b'
  const dark = '#1d1d1f'
  return (
    <VehicleRig v={1}>
      <B s={[1.9, 0.3, 3.6]} p={[0, 0.78, 0]} c={dark} />
      <B s={[2.0, 0.75, 3.7]} p={[0, 1.18, 0]} c={body} />
      <B s={[1.86, 0.2, 1.25]} p={[0, 1.62, 1.15]} c="#c94a20" />
      <B s={[1.5, 0.55, 0.1]} p={[0, 1.22, 1.88]} c={dark} />
      <Lights v={1}>
        <Headlight p={[0.62, 1.32, 1.94]} r={0.15} />
        <Headlight p={[-0.62, 1.32, 1.94]} r={0.15} />
      </Lights>
      <B s={[1.9, 0.7, 0.06]} p={[0, 1.95, 0.48]} r={[-0.25, 0, 0]} m={glass} cast={false} />
      <B s={[1.96, 0.08, 0.08]} p={[0, 2.29, 0.4]} c={dark} />
      <B s={[0.1, 1.0, 0.1]} p={[0.92, 2.02, -0.95]} c={dark} />
      <B s={[0.1, 1.0, 0.1]} p={[-0.92, 2.02, -0.95]} c={dark} />
      <B s={[1.94, 0.1, 0.1]} p={[0, 2.52, -0.95]} c={dark} />
      <B s={[0.1, 0.1, 1.4]} p={[0.92, 2.52, -1.6]} r={[-0.5, 0, 0]} c={dark} />
      <B s={[0.1, 0.1, 1.4]} p={[-0.92, 2.52, -1.6]} r={[-0.5, 0, 0]} c={dark} />
      <B s={[0.6, 0.18, 0.6]} p={[0.45, 1.6, -0.2]} c="#3b2a20" />
      <B s={[0.6, 0.18, 0.6]} p={[-0.45, 1.6, -0.2]} c="#3b2a20" />
      <B s={[0.6, 0.7, 0.14]} p={[0.45, 1.9, -0.55]} c="#3b2a20" />
      <B s={[0.6, 0.7, 0.14]} p={[-0.45, 1.9, -0.55]} c="#3b2a20" />
      <mesh position={[0.45, 1.88, 0.32]} rotation={[-0.9, 0, 0]} material={mat(dark)}>
        <torusGeometry args={[0.2, 0.035, 6, 14]} />
      </mesh>
      <Cyl a={[0.48, 0.48, 0.3, 14]} p={[0, 1.35, -2.0]} r={[PI2, 0, 0]} c={dark} />
      {[1, -1].map((sx) =>
        [1.25, -1.25].map((z) => (
          <B key={`${sx}${z}`} s={[0.52, 0.12, 1.25]} p={[sx * 1.0, 1.18, z]} c={dark} />
        )),
      )}
      <Wheel v={1} r={0.55} w={0.44} p={[1.0, 0.55, 1.25]} hub="#9a9a9a" />
      <Wheel v={1} r={0.55} w={0.44} p={[-1.0, 0.55, 1.25]} hub="#9a9a9a" />
      <Wheel v={1} r={0.55} w={0.44} p={[1.0, 0.55, -1.25]} hub="#9a9a9a" />
      <Wheel v={1} r={0.55} w={0.44} p={[-1.0, 0.55, -1.25]} hub="#9a9a9a" />
    </VehicleRig>
  )
}

function Roadster() {
  const paint = mat('#1f6bff', { metal: 0.45, rough: 0.3 })
  const dark = '#141418'
  return (
    <VehicleRig v={2}>
      <B s={[1.9, 0.45, 4.3]} p={[0, 0.58, 0]} m={paint} />
      <B s={[1.8, 0.25, 1.1]} p={[0, 0.82, 1.55]} r={[0.1, 0, 0]} m={paint} />
      <B s={[1.8, 0.32, 1.3]} p={[0, 0.92, -1.4]} m={paint} />
      <B s={[1.94, 0.14, 4.0]} p={[0, 0.4, 0]} c={dark} />
      <B s={[1.6, 0.5, 0.05]} p={[0, 1.08, 0.55]} r={[-0.6, 0, 0]} m={glass} cast={false} />
      <B s={[0.55, 0.3, 0.55]} p={[0.42, 0.9, -0.42]} c={dark} />
      <B s={[0.55, 0.3, 0.55]} p={[-0.42, 0.9, -0.42]} c={dark} />
      <B s={[0.55, 0.6, 0.12]} p={[0.42, 1.12, -0.72]} r={[-0.15, 0, 0]} c={dark} />
      <B s={[0.55, 0.6, 0.12]} p={[-0.42, 1.12, -0.72]} r={[-0.15, 0, 0]} c={dark} />
      <mesh position={[0.42, 1.12, 0.12]} rotation={[-1.0, 0, 0]} material={mat(dark)}>
        <torusGeometry args={[0.19, 0.035, 6, 14]} />
      </mesh>
      <Lights v={2}>
        <B s={[1.5, 0.07, 0.05]} p={[0, 0.78, 2.16]} m={glow('#e9f4ff', 3.5)} cast={false} />
        <B s={[1.6, 0.08, 0.05]} p={[0, 0.92, -2.07]} m={glow('#ff2a2a', 3)} cast={false} />
      </Lights>
      <B s={[1.75, 0.06, 0.38]} p={[0, 1.32, -1.88]} c={dark} />
      <B s={[0.06, 0.32, 0.12]} p={[0.6, 1.14, -1.88]} c={dark} />
      <B s={[0.06, 0.32, 0.12]} p={[-0.6, 1.14, -1.88]} c={dark} />
      <Lights v={2}>
        <B s={[0.02, 0.06, 3.6]} p={[0.96, 0.66, 0]} m={glow('#5fd0ff', 2.2)} cast={false} />
        <B s={[0.02, 0.06, 3.6]} p={[-0.96, 0.66, 0]} m={glow('#5fd0ff', 2.2)} cast={false} />
      </Lights>
      <Wheel v={2} r={0.38} w={0.3} p={[0.93, 0.38, 1.4]} />
      <Wheel v={2} r={0.38} w={0.3} p={[-0.93, 0.38, 1.4]} />
      <Wheel v={2} r={0.38} w={0.3} p={[0.93, 0.38, -1.4]} />
      <Wheel v={2} r={0.38} w={0.3} p={[-0.93, 0.38, -1.4]} />
    </VehicleRig>
  )
}

function Hoverbike() {
  const body = mat('#1b1a2e', { metal: 0.6, rough: 0.3 })
  return (
    <VehicleRig v={3}>
      <mesh position={[0, 0.15, 0]} rotation={[PI2, 0, 0]} material={body} castShadow>
        <capsuleGeometry args={[0.38, 1.9, 6, 12]} />
      </mesh>
      <Cyl a={[0, 0.36, 0.9, 10]} p={[0, 0.2, 1.65]} r={[PI2, 0, 0]} m={body} />
      <B s={[0.5, 0.16, 0.95]} p={[0, 0.6, -0.3]} c="#2b2a45" />
      <B s={[0.9, 0.06, 0.06]} p={[0, 0.78, 0.68]} c="#555" />
      <B s={[0.5, 0.35, 0.05]} p={[0, 0.72, 0.95]} r={[-0.6, 0, 0]} m={glass} cast={false} />
      {[0.95, -0.95].map((z) => (
        <group key={z} position={[0, -0.32, z]}>
          <mesh rotation={[PI2, 0, 0]} material={mat('#2a2a3a', { metal: 0.6, rough: 0.4 })}>
            <torusGeometry args={[0.42, 0.06, 8, 22]} />
          </mesh>
          <Cyl a={[0.38, 0.38, 0.14, 16]} p={[0, 0, 0]} c="#0f0f1a" cast={false} />
        </group>
      ))}
      <Lights v={3}>
        {[0.95, -0.95].map((z) => (
          <mesh key={z} position={[0, -0.32, z]} rotation={[PI2, 0, 0]} material={glow('#19f0ff', 3)}>
            <torusGeometry args={[0.43, 0.065, 8, 22]} />
          </mesh>
        ))}
        <B s={[0.03, 0.07, 1.9]} p={[0.39, 0.16, 0]} m={glow('#ff3ec8', 3)} cast={false} />
        <B s={[0.03, 0.07, 1.9]} p={[-0.39, 0.16, 0]} m={glow('#ff3ec8', 3)} cast={false} />
        <B s={[0.4, 0.08, 0.04]} p={[0, 0.25, -1.36]} m={glow('#ff2a5a', 3)} cast={false} />
        <mesh position={[0, -0.88, 0]} rotation={[-PI2, 0, 0]} material={additive('#ff3ec8', 0.55)}>
          <planeGeometry args={[1.6, 3.4]} />
        </mesh>
        <Headlight p={[0, 0.22, 2.1]} color="#bff8ff" r={0.1} />
      </Lights>
    </VehicleRig>
  )
}

function Seaplane() {
  const white = '#f1f4f7'
  const orange = '#ff7a2f'
  const prop = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    prop.current.rotation.z += live.vehicles[4].power * 38 * Math.min(dt, 0.05)
  })
  return (
    <VehicleRig v={4}>
      {[1.15, -1.15].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.32, 0.1]} rotation={[PI2, 0, 0]} material={mat(white)} castShadow>
            <capsuleGeometry args={[0.28, 3.4, 4, 10]} />
          </mesh>
          <B s={[0.08, 1.05, 0.08]} p={[x * 0.82, 0.92, 0.9]} r={[0, 0, x > 0 ? 0.4 : -0.4]} c="#888" />
          <B s={[0.08, 1.05, 0.08]} p={[x * 0.82, 0.92, -0.6]} r={[0, 0, x > 0 ? 0.4 : -0.4]} c="#888" />
        </group>
      ))}
      <Cyl a={[0.62, 0.5, 3.4, 14]} p={[0, 1.65, 0.2]} r={[PI2, 0, 0]} c={white} />
      <Cyl a={[0.12, 0.5, 2.2, 12]} p={[0, 1.78, -2.6]} r={[-PI2, 0, 0]} c={white} />
      <Cyl a={[0.3, 0.62, 0.5, 14]} p={[0, 1.65, 2.15]} r={[PI2, 0, 0]} c={orange} />
      <Cyl a={[0.56, 0.54, 0.35, 14]} p={[0, 1.66, -0.9]} r={[PI2, 0, 0]} c={orange} />
      <Cyl a={[0, 0.22, 0.4, 10]} p={[0, 1.65, 2.6]} r={[PI2, 0, 0]} c="#333" />
      <group ref={prop} position={[0, 1.65, 2.5]}>
        <B s={[0.16, 2.6, 0.05]} p={[0, 0, 0]} c="#2a2a2a" />
        <B s={[2.6, 0.16, 0.05]} p={[0, 0, 0]} c="#2a2a2a" />
      </group>
      <B s={[0.8, 0.36, 0.05]} p={[0, 2.32, 1.12]} r={[-0.55, 0, 0]} m={glass} cast={false} />
      <B s={[8.4, 0.14, 1.5]} p={[0, 3.02, 0.4]} c={white} />
      <B s={[0.6, 0.15, 1.52]} p={[3.95, 3.02, 0.4]} c={orange} />
      <B s={[0.6, 0.15, 1.52]} p={[-3.95, 3.02, 0.4]} c={orange} />
      <B s={[0.07, 2.25, 0.1]} p={[1.47, 2.33, 0.4]} r={[0, 0, -0.98]} c="#888" />
      <B s={[0.07, 2.25, 0.1]} p={[-1.47, 2.33, 0.4]} r={[0, 0, 0.98]} c="#888" />
      <B s={[0.07, 0.6, 0.07]} p={[0.32, 2.66, 0.95]} c="#888" />
      <B s={[0.07, 0.6, 0.07]} p={[-0.32, 2.66, 0.95]} c="#888" />
      <B s={[0.08, 1.25, 1.0]} p={[0, 2.45, -3.35]} c={orange} />
      <B s={[2.7, 0.08, 0.7]} p={[0, 1.9, -3.45]} c={white} />
      <Lights v={4}>
        <B s={[0.1, 0.06, 0.06]} p={[4.25, 3.02, 0.4]} m={glow('#33ff66', 3)} cast={false} />
        <B s={[0.1, 0.06, 0.06]} p={[-4.25, 3.02, 0.4]} m={glow('#ff3333', 3)} cast={false} />
      </Lights>
    </VehicleRig>
  )
}

function Snowmobile() {
  const red = '#d7263d'
  const dark = '#1b1b1d'
  return (
    <VehicleRig v={5}>
      {[0.62, -0.62].map((x) => (
        <group key={x}>
          <B s={[0.24, 0.06, 1.7]} p={[x, 0.05, 0.95]} c={dark} />
          <B s={[0.24, 0.06, 0.42]} p={[x, 0.17, 1.9]} r={[0.6, 0, 0]} c={dark} />
          <B s={[0.08, 0.55, 0.08]} p={[x, 0.33, 1.0]} c="#555" />
        </group>
      ))}
      <B s={[0.85, 0.42, 1.7]} p={[0, 0.3, -0.55]} c={dark} />
      <B s={[1.1, 0.45, 2.6]} p={[0, 0.72, 0.1]} c={red} />
      <B s={[1.12, 0.08, 1.8]} p={[0, 0.76, -0.1]} c="#ffffff" />
      <B s={[1.05, 0.42, 0.9]} p={[0, 0.98, 1.05]} r={[0.35, 0, 0]} c={red} />
      <B s={[0.9, 0.45, 0.05]} p={[0, 1.38, 0.75]} r={[-0.45, 0, 0]} m={glass} cast={false} />
      <B s={[0.6, 0.24, 1.2]} p={[0, 1.06, -0.55]} c={dark} />
      <B s={[0.95, 0.06, 0.06]} p={[0, 1.32, 0.45]} c="#555" />
      <Lights v={5}>
        <Headlight p={[0, 1.0, 1.52]} r={0.13} />
        <B s={[0.5, 0.08, 0.04]} p={[0, 0.85, -1.21]} m={glow('#ff2a2a', 3)} cast={false} />
      </Lights>
    </VehicleRig>
  )
}

function Rover() {
  const white = '#e9e9ea'
  return (
    <VehicleRig v={6}>
      <B s={[2.2, 0.35, 3.0]} p={[0, 1.05, 0]} c={white} />
      <B s={[1.2, 0.5, 0.9]} p={[0, 1.45, -1.0]} m={mat('#d4a537', { metal: 0.7, rough: 0.3 })} />
      <B s={[2.5, 0.06, 1.25]} p={[0, 1.88, -1.15]} m={mat('#1d3a7a', { metal: 0.5, rough: 0.3 })} />
      <Cyl a={[0.06, 0.06, 1.5, 6]} p={[-0.75, 1.95, 1.05]} c="#888" />
      <B s={[0.5, 0.26, 0.28]} p={[-0.75, 2.75, 1.05]} c={white} />
      <Lights v={6}>
        <B s={[0.12, 0.12, 0.03]} p={[-0.65, 2.75, 1.2]} m={glow('#5fd0ff', 3)} cast={false} />
      </Lights>
      <mesh position={[0.65, 2.25, -1.55]} rotation={[-0.7, 0, 0]} material={mat('#f2f2f2', { side: THREE.DoubleSide })}>
        <sphereGeometry args={[0.5, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
      </mesh>
      <B s={[0.08, 0.9, 0.08]} p={[0.95, 1.65, 0.65]} c="#555" />
      <B s={[0.08, 0.9, 0.08]} p={[0.05, 1.65, 0.65]} c="#555" />
      <B s={[1.0, 0.08, 0.08]} p={[0.5, 2.1, 0.65]} c="#555" />
      <B s={[0.6, 0.28, 0.6]} p={[0.5, 1.36, 0.05]} c="#ff7a45" />
      <B s={[0.6, 0.6, 0.12]} p={[0.5, 1.62, -0.28]} c="#ff7a45" />
      <B s={[0.12, 0.12, 2.9]} p={[1.15, 0.78, 0]} c="#666" />
      <B s={[0.12, 0.12, 2.9]} p={[-1.15, 0.78, 0]} c="#666" />
      <Lights v={6}>
        <B s={[2.0, 0.1, 0.05]} p={[0, 1.1, 1.52]} m={glow('#fff4c8', 3)} cast={false} />
      </Lights>
      {[1.32, -1.32].map((x) =>
        [-1.15, 0, 1.15].map((z) => <Wheel key={`${x}${z}`} v={6} r={0.45} w={0.36} p={[x, 0.45, z]} color="#3a3a3a" hub="#d0d0d0" />),
      )}
    </VehicleRig>
  )
}

function Rocket() {
  const flame = useRef<THREE.Group>(null!)
  const light = useRef<THREE.PointLight>(null!)
  const label = useMemo(() => verticalLabel('AZHAGAR', '#d4382a'), [])
  const red = '#e2412b'
  const white = '#f4f4f4'
  useFrame(({ clock }) => {
    const lt = live.launch
    const thrust = smoothstep(0, 0.008, lt) * (lt < 1 ? 1 : 0.9)
    const f = flame.current
    f.visible = thrust > 0.01
    const flick = 1 + Math.sin(clock.elapsedTime * 50) * 0.08 + Math.sin(clock.elapsedTime * 31) * 0.06
    f.scale.set(thrust * flick, thrust * (1 + lt * 1.6) * flick, thrust * flick)
    light.current.intensity = thrust * 400
  })
  return (
    <VehicleRig v={7}>
      <Cyl a={[0.75, 1.15, 1.2, 16]} p={[0, 0.0, 0]} c="#3a3a3e" />
      <Cyl a={[1.45, 1.45, 14, 22]} p={[0, 7.6, 0]} c={white} />
      <Cyl a={[1.47, 1.47, 0.7, 22]} p={[0, 3.2, 0]} c={red} />
      <Cyl a={[1.47, 1.47, 0.4, 22]} p={[0, 9.4, 0]} c="#222" />
      <Cyl a={[1.47, 1.47, 0.5, 22]} p={[0, 13.0, 0]} c={red} />
      <Cyl a={[1.1, 1.45, 3.0, 22]} p={[0, 16.1, 0]} c={white} />
      <Cyl a={[0, 1.1, 3.0, 22]} p={[0, 19.1, 0]} c={red} />
      <B s={[0.14, 1.5, 0.95]} p={[1.24, 16.4, 0]} r={[0, 0, 0.12]} c="#2a2f3a" />
      <mesh position={[1.25, 17.4, 0.55]} rotation={[0, 0, PI2 + 0.12]} material={glow('#9fe6ff', 1.6)}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
      </mesh>
      <mesh position={[1.475, 6.8, 0]} rotation={[0, PI2, 0]}>
        <planeGeometry args={[1.2, 6.0]} />
        <meshStandardMaterial map={label} transparent />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2
        return <B key={i} s={[0.14, 2.8, 1.25]} p={[Math.sin(a) * 2.0, 1.3, Math.cos(a) * 2.0]} r={[0, a, 0]} c={red} />
      })}
      <group ref={flame} position={[0, -0.6, 0]}>
        <mesh position={[0, -4, 0]} material={additive('#ff7a1a', 0.75)}>
          <cylinderGeometry args={[1.1, 0.15, 8, 16, 1, true]} />
        </mesh>
        <mesh position={[0, -2.6, 0]} material={additive('#ffe9a0', 0.9)}>
          <cylinderGeometry args={[0.7, 0.1, 5.2, 16, 1, true]} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, -3, 0]} color="#ff9a40" intensity={0} distance={90} decay={1.6} />
    </VehicleRig>
  )
}

export function Vehicles() {
  return (
    <>
      <AutoRickshaw />
      <Jeep />
      <Roadster />
      <Hoverbike />
      <Seaplane />
      <Snowmobile />
      <Rover />
      <Rocket />
    </>
  )
}
