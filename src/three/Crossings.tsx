import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { game, type CrossingState, type Walker } from '../lib/game'
import { alongRoad, CROSS_HALF, ROAD_HALF, ROAD_LENGTH, roadPoint, roadYaw } from '../lib/journey'
import { mulberry32 } from '../lib/math'
import { glow, mat } from './materials'
import { ROAD_Y } from './Road'
import { canvasTexture, signTexture } from './textures'
import { B, ZoneGroup } from './geo'

const SHIRTS = ['#e63946', '#f4a261', '#2a9d8f', '#3a86ff', '#e9c46a', '#8338ec', '#ff006e', '#06d6a0']
const PANTS = ['#1d3557', '#2b2d42', '#6c757d', '#3d405b', '#5e503f']
const SKINS = ['#8d5524', '#c68642', '#5c3a21', '#a0522d', '#e0ac69']
const HAIRS = ['#1b1209', '#3b2314', '#0d0d0d', '#6b4423']
const COWS = ['#f2efe9', '#9a6a3a', '#e9e4da']

const _p = new THREE.Vector3()

/** Where a crossing walker stands right now */
function place(c: CrossingState, w: Walker, out: THREE.Vector3) {
  const lateral = w.side * (CROSS_HALF + 0.4) * (1 - 2 * w.prog)
  const u = c.def.u + w.along / ROAD_LENGTH
  alongRoad(u, lateral, 0, out)
  const onKerb = Math.abs(lateral) > ROAD_HALF
  out.y = onKerb ? (c.def.zone === 0 ? 0 : 0.16) : ROAD_Y
  return roadYaw(u) + (w.side > 0 ? Math.PI / 2 : -Math.PI / 2)
}

function Person({ c, w }: { c: CrossingState; w: Walker }) {
  const ref = useRef<THREE.Group>(null!)
  const legs = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)]
  const arms = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)]
  const look = useMemo(() => {
    const r = mulberry32(Math.floor(w.seed * 1e6))
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
    return { shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS), h: 0.9 + r() * 0.15 }
  }, [w.seed])
  useFrame(({ clock }) => {
    const yaw = place(c, w, _p)
    ref.current.position.copy(_p)
    ref.current.rotation.y = yaw
    const walking = c.phase === 'red' && w.prog > 0 && w.prog < 1
    const ph = clock.elapsedTime * w.speed * 3.4
    const sw = walking ? Math.sin(ph) * 0.65 : 0
    legs[0].current.rotation.x = sw
    legs[1].current.rotation.x = -sw
    arms[0].current.rotation.x = -sw * 0.8
    arms[1].current.rotation.x = sw * 0.8
    ref.current.position.y += walking ? Math.abs(Math.cos(ph)) * 0.05 : 0
  })
  return (
    <group ref={ref} scale={look.h}>
      {[0.1, -0.1].map((x, i) => (
        <group key={x} ref={legs[i]} position={[x, 0.82, 0]}>
          <B s={[0.15, 0.8, 0.17]} p={[0, -0.4, 0]} c={look.pants} />
        </group>
      ))}
      <B s={[0.4, 0.58, 0.24]} p={[0, 1.12, 0]} c={look.shirt} />
      {[0.26, -0.26].map((x, i) => (
        <group key={x} ref={arms[i]} position={[x, 1.38, 0]}>
          <B s={[0.11, 0.56, 0.13]} p={[0, -0.27, 0]} c={look.shirt} />
        </group>
      ))}
      <mesh position={[0, 1.6, 0]} material={mat(look.skin)} castShadow>
        <icosahedronGeometry args={[0.16, 1]} />
      </mesh>
      <mesh position={[0, 1.7, -0.02]} scale={[1, 0.6, 1]} material={mat(look.hair)}>
        <icosahedronGeometry args={[0.165, 1]} />
      </mesh>
    </group>
  )
}

function Cow({ c, w }: { c: CrossingState; w: Walker }) {
  const ref = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const legs = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)]
  const color = COWS[Math.floor(w.seed * COWS.length)]
  useFrame(({ clock }) => {
    const yaw = place(c, w, _p)
    ref.current.position.copy(_p)
    ref.current.rotation.y = yaw
    const walking = c.phase === 'red' && w.prog > 0 && w.prog < 1
    const hurry = clock.elapsedTime < game.honkUntil ? 2 : 1
    const ph = clock.elapsedTime * 4.2 * hurry + w.seed * 10
    legs.forEach((l, i) => {
      l.current.rotation.x = walking ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.45 : 0
    })
    head.current.rotation.x = walking ? Math.sin(ph * 2) * 0.08 : Math.sin(clock.elapsedTime + w.seed * 9) * 0.15 + 0.25
  })
  return (
    <group ref={ref}>
      <B s={[0.85, 0.8, 1.8]} p={[0, 1.08, 0]} c={color} />
      <B s={[0.5, 0.5, 0.6]} p={[0.25, 1.2, -0.2]} c="#3b2a1e" />
      <group ref={head} position={[0, 1.3, 0.95]}>
        <B s={[0.46, 0.46, 0.55]} p={[0, 0, 0.2]} c={color} />
        <B s={[0.4, 0.22, 0.12]} p={[0, -0.12, 0.5]} c="#e7a9a0" />
        <mesh position={[0.18, 0.3, 0.1]} rotation={[0, 0, -0.5]} material={mat('#e8dcc0')}>
          <coneGeometry args={[0.05, 0.28, 5]} />
        </mesh>
        <mesh position={[-0.18, 0.3, 0.1]} rotation={[0, 0, 0.5]} material={mat('#e8dcc0')}>
          <coneGeometry args={[0.05, 0.28, 5]} />
        </mesh>
        <B s={[0.12, 0.08, 0.2]} p={[0.28, 0.12, 0.05]} c={color} />
        <B s={[0.12, 0.08, 0.2]} p={[-0.28, 0.12, 0.05]} c={color} />
      </group>
      {(
        [
          [0.3, 0.7],
          [-0.3, 0.7],
          [0.3, -0.7],
          [-0.3, -0.7],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} ref={legs[i]} position={[x, 0.78, z]}>
          <B s={[0.17, 0.78, 0.17]} p={[0, -0.39, 0]} c={color} />
        </group>
      ))}
      <B s={[0.06, 0.6, 0.06]} p={[0, 1.0, -0.95]} r={[0.3, 0, 0]} c="#3b2a1e" />
    </group>
  )
}

function TrafficLight({ c }: { c: CrossingState }) {
  const red = useRef<THREE.Mesh>(null!)
  const amber = useRef<THREE.Mesh>(null!)
  const green = useRef<THREE.Mesh>(null!)
  const walk = useRef<THREE.Mesh>(null!)
  const off = mat('#2b2b2b')
  const on = { red: glow('#ff2d2d', 3.2), amber: glow('#ffb400', 3.2), green: glow('#2bff6a', 3.2) }
  useFrame(() => {
    const ph = c.phase
    red.current.material = ph === 'red' ? on.red : off
    amber.current.material = ph === 'yellow' ? on.amber : off
    green.current.material = ph === 'red' || ph === 'yellow' ? off : on.green
    walk.current.material = ph === 'red' ? on.green : on.red
  })
  const u = c.def.lineU
  const p = alongRoad(u, ROAD_HALF + 1.6)
  const pole = c.def.zone === 3 ? mat('#1c1830', { metal: 0.6, rough: 0.4 }) : mat('#2d3038')
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, roadYaw(u) + Math.PI, 0]}>
      <mesh position={[0, 3.4, 0]} material={pole} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 6.8, 8]} />
      </mesh>
      <mesh position={[-3.3, 6.5, 0]} material={pole} castShadow>
        <boxGeometry args={[6.6, 0.18, 0.18]} />
      </mesh>
      <mesh position={[-4.4, 5.75, 0]} material={mat('#1b1d22')} castShadow>
        <boxGeometry args={[0.6, 1.7, 0.5]} />
      </mesh>
      {(
        [
          [red, 6.27],
          [amber, 5.75],
          [green, 5.23],
        ] as const
      ).map(([ref, y], i) => (
        <mesh key={i} ref={ref} position={[-4.4, y, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={off}>
          <cylinderGeometry args={[0.17, 0.17, 0.05, 12]} />
        </mesh>
      ))}
      {/* pedestrian signal on the pole */}
      <mesh position={[0, 2.6, 0.2]} material={mat('#1b1d22')}>
        <boxGeometry args={[0.4, 0.5, 0.25]} />
      </mesh>
      <mesh ref={walk} position={[0, 2.6, 0.33]} material={off}>
        <planeGeometry args={[0.28, 0.36]} />
      </mesh>
    </group>
  )
}

function CattleSign({ c }: { c: CrossingState }) {
  const tex = useMemo(
    () => signTexture({ title: 'Cattle', kicker: 'Caution', lines: ['crossing ahead'], bg: '#ffcc33', fg: '#1b1b1b', accent: '#1b1b1b', w: 512, h: 512 }),
    [],
  )
  const u = c.def.lineU - 22 / ROAD_LENGTH
  const p = alongRoad(u, ROAD_HALF + 1.6)
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, roadYaw(u) + Math.PI, 0]}>
      <mesh position={[0, 1.4, -0.06]} material={mat('#8a8f99')}>
        <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  )
}

function Crossing({ c }: { c: CrossingState }) {
  const d = c.def
  const zebra = useMemo(
    () =>
      canvasTexture(256, 64, (ctx) => {
        ctx.clearRect(0, 0, 256, 64)
        ctx.fillStyle = '#f2f2f2'
        for (let i = 0; i < 9; i++) ctx.fillRect(8 + i * 28, 0, 16, 64)
      }),
    [],
  )
  const p = roadPoint(d.u)
  const lp = roadPoint(d.lineU)
  const yaw = roadYaw(d.u)
  const neon = d.zone === 3
  return (
    <group>
      {d.kind === 'people' && (
        <mesh position={[p.x, ROAD_Y + 0.012, p.z]} rotation={[-Math.PI / 2, 0, yaw]}>
          <planeGeometry args={[ROAD_HALF * 2, 3.4]} />
          {neon ? (
            <meshBasicMaterial map={zebra} transparent toneMapped={false} color={[0.4, 2.2, 2.6]} />
          ) : (
            <meshStandardMaterial map={zebra} transparent />
          )}
        </mesh>
      )}
      <mesh position={[lp.x, ROAD_Y + 0.013, lp.z]} rotation={[-Math.PI / 2, 0, yaw]} material={neon ? glow('#ffffff', 1.6) : mat('#f4f4f4')}>
        <planeGeometry args={[ROAD_HALF * 2, 0.45]} />
      </mesh>
      {d.kind === 'people' ? <TrafficLight c={c} /> : <CattleSign c={c} />}
      {c.walkers.map((w, i) => (w.kind === 'cow' ? <Cow key={i} c={c} w={w} /> : <Person key={i} c={c} w={w} />))}
    </group>
  )
}

export function Crossings() {
  return (
    <>
      {game.crossings.map((c, i) => (
        <ZoneGroup key={i} zone={c.def.zone}>
          <Crossing c={c} />
        </ZoneGroup>
      ))}
    </>
  )
}
