import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CHAR_SCALE, live } from '../lib/journey'
import { mat } from './materials'
import { canvasTexture, plaidTexture, TITLE_FONT } from './textures'
import { B } from './geo'

const SKIN = '#7b4a2d'
const HAIR = '#15100c'
const JEANS = '#2c3e5c'
const SHOE = '#f2f2f2'

// curly hair blobs: [x, y, z, radius]
const CURLS: [number, number, number, number][] = [
  [0, 0.4, 0.02, 0.15],
  [0.1, 0.38, 0.08, 0.11],
  [-0.1, 0.39, 0.07, 0.11],
  [0.13, 0.33, -0.06, 0.11],
  [-0.13, 0.34, -0.07, 0.11],
  [0.02, 0.37, -0.12, 0.12],
  [0.06, 0.43, -0.03, 0.1],
  [-0.06, 0.44, 0.04, 0.1],
  [0.16, 0.25, -0.02, 0.08],
  [-0.16, 0.25, -0.02, 0.08],
  [0, 0.28, -0.16, 0.11],
  [0.04, 0.4, 0.14, 0.08],
]

const EMOTES = ['', 'Off-road time!', 'Vroom vroom!', 'Hover mode!', "Let's fly!", 'Brrr… snow!', 'To Mars!', 'To space!']
const PIVOT = 0.95 * CHAR_SCALE

function bubbleTexture(text: string) {
  return canvasTexture(512, 200, (ctx) => {
    ctx.clearRect(0, 0, 512, 200)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#11131c'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.roundRect(12, 12, 488, 132, 40)
    ctx.moveTo(220, 140)
    ctx.lineTo(256, 190)
    ctx.lineTo(292, 140)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(224, 132, 64, 14)
    ctx.fillStyle = '#11131c'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = 62
    ctx.font = `${size}px ${TITLE_FONT}`
    while (ctx.measureText(text).width > 440 && size > 20) {
      size -= 2
      ctx.font = `${size}px ${TITLE_FONT}`
    }
    ctx.fillText(text, 256, 80)
  })
}

export function Character() {
  const root = useRef<THREE.Group>(null!)
  const pivot = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const hipL = useRef<THREE.Group>(null!)
  const hipR = useRef<THREE.Group>(null!)
  const kneeL = useRef<THREE.Group>(null!)
  const kneeR = useRef<THREE.Group>(null!)
  const shL = useRef<THREE.Group>(null!)
  const shR = useRef<THREE.Group>(null!)
  const elL = useRef<THREE.Group>(null!)
  const elR = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const bubble = useRef<THREE.Sprite>(null!)

  const shirt = useMemo(() => new THREE.MeshStandardMaterial({ map: plaidTexture(), roughness: 0.9 }), [])
  const skin = mat(SKIN, { rough: 0.7 })
  const hair = mat(HAIR, { rough: 1 })
  const jeans = mat(JEANS, { rough: 0.9 })
  const bubbles = useMemo(() => EMOTES.map((t) => (t ? bubbleTexture(t) : null)), [])
  const bubbleMat = useMemo(
    () => new THREE.SpriteMaterial({ map: bubbles[1], transparent: true, depthWrite: false, toneMapped: false, fog: false }),
    [bubbles],
  )

  useFrame(({ clock }) => {
    const c = live.char
    const g = root.current
    const t = clock.elapsedTime
    g.visible = c.visible
    if (!c.visible) return
    g.position.copy(c.pos)
    g.rotation.set(c.pitch, c.yaw + c.spin, c.roll, 'YXZ')
    pivot.current.rotation.x = c.flip + c.lean

    const sit = c.sit
    const stand = 1 - sit
    const run = c.run
    const crouch = c.crouch
    const ph = c.walk * Math.PI
    const moving = c.walk > 0 ? 1 : 0
    const swing = Math.sin(ph)

    // legs: walk / run cycle, sitting, crouch-and-tuck
    const legAmp = (0.6 + 0.45 * run) * moving * stand
    const kneeAmp = (0.7 + 0.6 * run) * moving * stand
    hipL.current.rotation.x = legAmp * swing - sit * 1.45 - crouch * 0.95
    hipR.current.rotation.x = -legAmp * swing - sit * 1.45 - crouch * 0.95
    kneeL.current.rotation.x = kneeAmp * Math.max(0, -Math.cos(ph)) + sit * 1.45 + crouch * 1.7
    kneeR.current.rotation.x = kneeAmp * Math.max(0, Math.cos(ph)) + sit * 1.45 + crouch * 1.7
    hipL.current.rotation.z = sit * 0.12
    hipR.current.rotation.z = -sit * 0.12

    // arms: swing, steering wheel, arms-up jumps, waving
    const hop = c.hop
    const armAmp = (0.5 + 0.4 * run) * moving * stand
    const steer = c.steer * 0.35 * sit
    shL.current.rotation.x = -armAmp * swing - sit * 0.95 - hop * 2.2 + steer
    shL.current.rotation.z = 0.08 + hop * 0.3 + crouch * 0.2
    const rx = armAmp * swing - sit * 0.95 - hop * 2.2 - steer
    const rz = -0.08 - hop * 0.3 - crouch * 0.2
    shR.current.rotation.x = THREE.MathUtils.lerp(rx, -2.7, c.wave)
    shR.current.rotation.z = THREE.MathUtils.lerp(rz, -0.35 + Math.sin(t * 14) * 0.45, c.wave)
    const elbow = -0.25 * stand - sit * 0.55 - run * 1.2 * stand
    elL.current.rotation.x = elbow
    elR.current.rotation.x = THREE.MathUtils.lerp(elbow, -0.35, c.wave)

    const bob = stand * moving * Math.abs(Math.sin(ph)) * (0.05 + 0.07 * run)
    body.current.position.y = -PIVOT + CHAR_SCALE * (bob - crouch * 0.28)
    head.current.rotation.y = c.look + Math.sin(t * 0.7) * 0.15 * sit
    head.current.rotation.x = -0.05 + run * 0.15

    // speech bubble
    const b = bubble.current
    b.visible = c.emote > 0.01
    if (b.visible) {
      const tex = bubbles[c.emoteId]
      if (tex && bubbleMat.map !== tex) {
        bubbleMat.map = tex
        bubbleMat.needsUpdate = true
      }
      const pop = c.emote * (1 + Math.sin(t * 6) * 0.04)
      b.scale.set(2.5 * pop, 0.98 * pop, 1)
      bubbleMat.opacity = Math.min(1, c.emote * 1.5)
    }
  })

  return (
    <group ref={root}>
      <sprite ref={bubble} material={bubbleMat} position={[0, 2.55, 0]} visible={false} />
      <group ref={pivot} position={[0, PIVOT, 0]}>
        <group ref={body} position={[0, -PIVOT, 0]} scale={CHAR_SCALE}>
          {/* legs */}
          {([
            [hipL, kneeL, 0.13],
            [hipR, kneeR, -0.13],
          ] as const).map(([hip, knee, x], i) => (
            <group key={i} ref={hip} position={[x, 0.95, 0]}>
              <mesh position={[0, -0.23, 0]} material={jeans} castShadow>
                <boxGeometry args={[0.2, 0.48, 0.22]} />
              </mesh>
              <group ref={knee} position={[0, -0.46, 0]}>
                <mesh position={[0, -0.21, 0]} material={jeans} castShadow>
                  <boxGeometry args={[0.18, 0.44, 0.2]} />
                </mesh>
                <B s={[0.2, 0.12, 0.32]} p={[0, -0.44, 0.05]} c={SHOE} />
              </group>
            </group>
          ))}

          {/* hips & torso */}
          <mesh position={[0, 0.99, 0]} material={jeans} castShadow>
            <boxGeometry args={[0.46, 0.2, 0.26]} />
          </mesh>
          <mesh position={[0, 1.36, 0]} material={shirt} castShadow>
            <boxGeometry args={[0.52, 0.6, 0.29]} />
          </mesh>
          {/* collar + open neck */}
          <B s={[0.36, 0.06, 0.3]} p={[0, 1.66, 0]} m={shirt} />
          <B s={[0.12, 0.12, 0.02]} p={[0, 1.6, 0.147]} m={skin} cast={false} />
          {/* buttons */}
          <B s={[0.02, 0.4, 0.01]} p={[0, 1.33, 0.148]} c="#c9d3e3" cast={false} />

          {/* arms */}
          {([
            [shL, elL, 0.335],
            [shR, elR, -0.335],
          ] as const).map(([sh, el, x], i) => (
            <group key={i} ref={sh} position={[x, 1.6, 0]}>
              <mesh position={[0, -0.16, 0]} material={shirt} castShadow>
                <boxGeometry args={[0.15, 0.34, 0.16]} />
              </mesh>
              <group ref={el} position={[0, -0.33, 0]}>
                <mesh position={[0, -0.14, 0]} material={shirt} castShadow>
                  <boxGeometry args={[0.14, 0.3, 0.15]} />
                </mesh>
                <B s={[0.11, 0.12, 0.12]} p={[0, -0.34, 0]} m={skin} />
              </group>
            </group>
          ))}

          {/* neck + head */}
          <mesh position={[0, 1.71, 0]} material={skin}>
            <cylinderGeometry args={[0.075, 0.085, 0.12, 8]} />
          </mesh>
          <group ref={head} position={[0, 1.76, 0]}>
            <mesh position={[0, 0.2, 0]} scale={[0.86, 1.05, 0.92]} material={skin} castShadow>
              <icosahedronGeometry args={[0.2, 1]} />
            </mesh>
            {CURLS.map(([x, y, z, r], i) => (
              <mesh key={i} position={[x, y, z]} material={hair} castShadow>
                <icosahedronGeometry args={[r, 0]} />
              </mesh>
            ))}
            {/* beard + moustache */}
            <B s={[0.2, 0.08, 0.08]} p={[0, 0.03, 0.14]} m={hair} cast={false} />
            <B s={[0.13, 0.025, 0.03]} p={[0, 0.12, 0.18]} m={hair} cast={false} />
            {/* eyes, brows, nose, ears */}
            <B s={[0.045, 0.03, 0.02]} p={[0.068, 0.22, 0.175]} c="#0d0d0d" cast={false} />
            <B s={[0.045, 0.03, 0.02]} p={[-0.068, 0.22, 0.175]} c="#0d0d0d" cast={false} />
            <B s={[0.07, 0.018, 0.02]} p={[0.068, 0.265, 0.17]} m={hair} cast={false} />
            <B s={[0.07, 0.018, 0.02]} p={[-0.068, 0.265, 0.17]} m={hair} cast={false} />
            <B s={[0.05, 0.08, 0.05]} p={[0, 0.16, 0.19]} m={skin} cast={false} />
            <B s={[0.04, 0.08, 0.06]} p={[0.17, 0.19, 0]} m={skin} cast={false} />
            <B s={[0.04, 0.08, 0.06]} p={[-0.17, 0.19, 0]} m={skin} cast={false} />
          </group>
        </group>
      </group>
    </group>
  )
}
