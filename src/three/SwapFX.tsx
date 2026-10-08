import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { zones } from '../data/portfolio'
import { GANTRY_X, live, PAD_POS, PAD_TOP, PAD_YAW, STEPS } from '../lib/journey'
import { remap, smoothstep } from '../lib/math'

/**
 * Game-style swap effects: a floating mission marker over the vehicle you
 * are running to, and a ground pulse when its engine fires up.
 */
export function SwapFX() {
  const marker = useRef<THREE.Group>(null!)
  const beam = useRef<THREE.Mesh>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const accents = useMemo(() => zones.map((z) => new THREE.Color(z.accent)), [])
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const fxMat = () =>
    new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
  const beamMat = useMemo(fxMat, [])
  const ringMat = useMemo(fxMat, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const swap = live.kind === 'swap'
    const st = live.t
    const b = STEPS[live.stepIndex].vehicle + 1
    const rocket = b === 7
    const accent = accents[Math.min(b, 6)]

    // mission marker above the next vehicle
    const show = swap
      ? smoothstep(0.04, 0.12, st) * (1 - smoothstep(rocket ? 0.42 : 0.8, rocket ? 0.5 : 0.88, st))
      : 0
    const g = marker.current
    g.visible = show > 0.01
    beam.current.visible = g.visible
    if (g.visible) {
      let x: number
      let z: number
      let ground: number
      let h = 4.6
      if (rocket) {
        x = PAD_POS.x + GANTRY_X * Math.cos(PAD_YAW)
        z = PAD_POS.z - GANTRY_X * Math.sin(PAD_YAW)
        ground = PAD_TOP
        h = 4.2
      } else {
        const v = live.vehicles[b]
        x = v.pos.x
        z = v.pos.z
        ground = v.ground
        if (b === 4) h = 5.8
      }
      g.position.set(x, ground + h + Math.sin(t * 3) * 0.25, z)
      g.rotation.y = t * 2.2
      g.scale.setScalar(show)
      markerMat.color.copy(accent).multiplyScalar(2.6)
      beam.current.position.set(x, ground + h / 2, z)
      beam.current.scale.set(show, h, show)
      beamMat.color.copy(accent)
      beamMat.opacity = 0.22 + Math.sin(t * 6) * 0.05
    }

    // shock ring when the new engine starts
    const k = swap && !rocket ? remap(st, 0.9, 1) : 0
    ring.current.visible = k > 0 && k < 1
    if (ring.current.visible) {
      const v = live.vehicles[b]
      ring.current.position.set(v.pos.x, v.ground + 0.12, v.pos.z)
      ring.current.scale.setScalar(1 + k * 7)
      ringMat.color.copy(accent).multiplyScalar(2)
      ringMat.opacity = (1 - k) * 0.9
    }
  })

  return (
    <>
      <group ref={marker} visible={false}>
        <mesh rotation={[Math.PI, 0, 0]} material={markerMat}>
          <coneGeometry args={[0.55, 1.1, 4]} />
        </mesh>
        <mesh position={[0, 0.85, 0]} material={markerMat}>
          <octahedronGeometry args={[0.26, 0]} />
        </mesh>
      </group>
      <mesh ref={beam} material={beamMat} visible={false}>
        <cylinderGeometry args={[0.32, 0.32, 1, 12, 1, true]} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} material={ringMat} visible={false}>
        <ringGeometry args={[0.85, 1, 48]} />
      </mesh>
    </>
  )
}
