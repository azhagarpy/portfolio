import * as THREE from 'three'
import { angleDiff, clamp, easeInOut, lerp, mulberry32, remap, smoothstep } from './math'
import type { StepKind } from './store'

/* ------------------------------------------------------------------ */
/*  Road                                                               */
/* ------------------------------------------------------------------ */

export const ZONES = 7
export const ZONE_SPAN = 220
export const ROAD_HALF = 4.6

// how much the road meanders inside each zone (city & neon are straighter)
const AMPS = [14, 30, 6, 10, 16, 28, 18]
function ampAt(d: number) {
  const f = clamp(d / ZONE_SPAN - 0.5, 0, ZONES - 1)
  const i = Math.floor(f)
  const j = Math.min(i + 1, ZONES - 1)
  return lerp(AMPS[i], AMPS[j], smoothstep(0, 1, f - i))
}

const ctrl: THREE.Vector3[] = []
for (let d = 0; d <= ZONES * ZONE_SPAN + 0.1; d += 20) {
  const x = Math.sin(d * 0.0165) * ampAt(d) + (Math.sin(d * 0.0052 + 1.3) - Math.sin(1.3)) * 9
  ctrl.push(new THREE.Vector3(x, 0, -d))
}
const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5)
curve.arcLengthDivisions = 3000
export const ROAD_LENGTH = curve.getLength()

const LUT_N = 4096
const lutP = new Float32Array((LUT_N + 1) * 3)
const lutT = new Float32Array((LUT_N + 1) * 3)
{
  const p = new THREE.Vector3()
  const t = new THREE.Vector3()
  for (let i = 0; i <= LUT_N; i++) {
    const u = i / LUT_N
    curve.getPointAt(u, p)
    curve.getTangentAt(u, t)
    t.y = 0
    t.normalize()
    lutP.set([p.x, p.y, p.z], i * 3)
    lutT.set([t.x, t.y, t.z], i * 3)
  }
}

function lutLerp(arr: Float32Array, u: number, out: THREE.Vector3) {
  const f = clamp(u) * LUT_N
  const i = Math.min(Math.floor(f), LUT_N - 1)
  const a = f - i
  const k = i * 3
  return out.set(
    arr[k] + (arr[k + 3] - arr[k]) * a,
    arr[k + 1] + (arr[k + 4] - arr[k + 1]) * a,
    arr[k + 2] + (arr[k + 5] - arr[k + 2]) * a,
  )
}

/** Point on the road centre line. u outside 0..1 extrapolates along the end tangents. */
export function roadPoint(u: number, out = new THREE.Vector3()) {
  if (u > 1 || u < 0) {
    const end = u > 1 ? 1 : 0
    lutLerp(lutP, end, out)
    const k = (u - end) * ROAD_LENGTH
    const ti = end * LUT_N * 3
    out.x += lutT[ti] * k
    out.z += lutT[ti + 2] * k
    return out
  }
  return lutLerp(lutP, u, out)
}

export function roadDir(u: number, out = new THREE.Vector3()) {
  return lutLerp(lutT, u, out).normalize()
}

const _d = new THREE.Vector3()
export function roadYaw(u: number) {
  roadDir(u, _d)
  return Math.atan2(_d.x, _d.z)
}

/** Unit vector pointing to the right of the travel direction */
export function roadRight(u: number, out = new THREE.Vector3()) {
  roadDir(u, out)
  return out.set(-out.z, 0, out.x)
}

const _r = new THREE.Vector3()
/** Position beside the road. offset > 0 = right of travel direction. */
export function alongRoad(u: number, offset: number, y = 0, out = new THREE.Vector3()) {
  roadPoint(u, out)
  roadRight(clamp(u), _r)
  out.x += _r.x * offset
  out.z += _r.z * offset
  out.y = y
  return out
}

/** Yaw for an object (front = +Z) beside the road so it faces approaching traffic */
export function faceRoadYaw(u: number, offset: number, back = 0.9) {
  roadDir(u, _d)
  const s = Math.sign(offset) || 1
  const dx = _d.z * s - _d.x * back
  const dz = -_d.x * s - _d.z * back
  return Math.atan2(dx, dz)
}

/** Closest road sample for a world xz position */
export const nearest = { u: 0, dist: 0, side: 0 }
export function nearestRoad(x: number, z: number) {
  let lo = 0
  let hi = LUT_N
  if (z >= lutP[2]) hi = 1
  else if (z <= lutP[LUT_N * 3 + 2]) lo = LUT_N - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (lutP[mid * 3 + 2] > z) lo = mid
    else hi = mid
  }
  const W = 280
  let best = lo
  let bestD = Infinity
  for (let i = Math.max(0, lo - W); i <= Math.min(LUT_N, lo + W); i += 4) {
    const dx = lutP[i * 3] - x
    const dz = lutP[i * 3 + 2] - z
    const d = dx * dx + dz * dz
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  for (let i = Math.max(0, best - 4); i <= Math.min(LUT_N, best + 4); i++) {
    const dx = lutP[i * 3] - x
    const dz = lutP[i * 3 + 2] - z
    const d = dx * dx + dz * dz
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  const k = best * 3
  nearest.u = best / LUT_N
  nearest.dist = Math.sqrt(bestD)
  // signed side: + right, - left
  nearest.side = Math.sign((x - lutP[k]) * -lutT[k + 2] + (z - lutP[k + 2]) * lutT[k]) || 1
  return nearest
}

export const boundaryU = (k: number) => k / ZONES
export const zoneU = (zone: number, frac: number) => (zone + frac) / ZONES

/** Partition-of-unity weights for each zone at continuous zone coordinate zf */
export function zoneWeights(zf: number, tw: number, out: number[]) {
  for (let i = 0; i < ZONES; i++) {
    const lower = i === 0 ? 1 : smoothstep(i - tw, i + tw, zf)
    const upper = i === ZONES - 1 ? 1 : 1 - smoothstep(i + 1 - tw, i + 1 + tw, zf)
    out[i] = lower * upper
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Vehicles                                                           */
/* ------------------------------------------------------------------ */

export const GAP = 7.5 / ROAD_LENGTH
export const START_U = 0.004
const ROVER_END = 1 - 6 / ROAD_LENGTH
export const PAD_U = 1 + 24 / ROAD_LENGTH
export const PAD_TOP = 1.6
export const PAD_POS = roadPoint(PAD_U)
export const PAD_YAW = roadYaw(1)
export const GANTRY_X = 6.4
export const ARM_Y = 16
export const HATCH_X = 1.7
export const CRUISE_ALT = 17
export const CHAR_SCALE = 0.86
export const HIP = 0.95 * CHAR_SCALE

/** Lane spacing per vehicle (the seaplane stays between the bridge cables) */
export const LANE_W = [2.5, 2.6, 2.6, 2.6, 1.6, 2.5, 2.5]
/** Top speed per vehicle, in road units (about metres) per second */
export const MAX_SPEED = [19, 23, 30, 34, 42, 25, 21]
export const SWAP_SECONDS = 4.8
export const ROCKET_SWAP_SECONDS = 12
export const LAUNCH_SECONDS = 10

interface VehicleSpec {
  seat: [number, number, number] // hip position, vehicle-local
  board: [number, number, number] // where the driver stands to get in, vehicle-local
  cam: [number, number, number] // chase camera offset, vehicle-local
  look: number
  lean: number
}

export const SPECS: VehicleSpec[] = [
  { seat: [0, 0.98, 0.32], board: [2.1, 0, 0.2], cam: [3.4, 3.7, -9.8], look: 7, lean: 5 },
  { seat: [0.45, 1.72, -0.2], board: [2.5, 0, -0.2], cam: [3.6, 4.3, -11], look: 7, lean: 3 },
  { seat: [0.42, 1.05, -0.42], board: [2.4, 0, -0.4], cam: [3.4, 3.4, -10.5], look: 8, lean: 2 },
  { seat: [0, 0.72, -0.3], board: [2.0, 0, -0.3], cam: [3.2, 3.4, -9.8], look: 8, lean: 22 },
  { seat: [0, 1.75, 0.55], board: [2.9, 0, 0.55], cam: [0, 6.5, -19], look: 12, lean: 55 },
  { seat: [0, 1.2, -0.45], board: [2.0, 0, -0.4], cam: [3.2, 3.5, -9.8], look: 7, lean: 12 },
  { seat: [0.5, 1.5, 0.05], board: [2.7, 0, 0.05], cam: [3.8, 4.3, -11.5], look: 7, lean: 3 },
  { seat: [HATCH_X, ARM_Y, 0], board: [GANTRY_X, 0, 0], cam: [0, 0, 0], look: 0, lean: 0 },
]

export const RANGES: [number, number][] = Array.from({ length: 7 }, (_, v) => [
  v === 0 ? START_U : boundaryU(v) + GAP,
  v === 6 ? ROVER_END : boundaryU(v + 1) - GAP,
])

export function altitude(frac: number) {
  return CRUISE_ALT * smoothstep(0.08, 0.32, frac) * (1 - smoothstep(0.68, 0.92, frac))
}

/* ------------------------------------------------------------------ */
/*  Scroll timeline                                                    */
/* ------------------------------------------------------------------ */

export interface Step {
  kind: StepKind
  vehicle: number
  zone: number
  start: number
  end: number
}

const DRIVE_W = [1.0, 1.1, 1.25, 1.2, 1.9, 1.15, 1.05]
const SWAP_W = 0.5
const LAUNCH_W = 1.5

export const STEPS: Step[] = []
{
  let acc = 0
  const push = (kind: StepKind, vehicle: number, zone: number, w: number) => {
    STEPS.push({ kind, vehicle, zone, start: acc, end: acc + w })
    acc += w
  }
  for (let v = 0; v < 7; v++) {
    push('drive', v, v, DRIVE_W[v])
    push('swap', v, Math.min(v + 1, 6), SWAP_W)
  }
  push('launch', 7, 6, LAUNCH_W)
  for (const s of STEPS) {
    s.start /= acc
    s.end /= acc
  }
}
export const DRIVE_STEP = [0, 2, 4, 6, 8, 10, 12]
export const ROCKET_SWAP_STEP = 13
export const LAUNCH_STEP = 14

/** Scroll progress at which a zone's drive begins (for fast travel) */
export const zoneStartProgress = (zone: number) => STEPS[DRIVE_STEP[zone]].start + (zone === 0 ? 0 : 0.002)

export function locate(p: number) {
  for (let i = 0; i < STEPS.length; i++) {
    if (p <= STEPS[i].end || i === STEPS.length - 1) {
      return { index: i, t: remap(p, STEPS[i].start, STEPS[i].end) }
    }
  }
  return { index: 0, t: 0 }
}

/** Road units travelled per unit of journey progress at p (0 outside drive steps) */
export function unitsPerProgress(p: number) {
  const s = STEPS[locate(p).index]
  if (s.kind !== 'drive') return 0
  const [u0, u1] = RANGES[s.vehicle]
  return ((u1 - u0) * ROAD_LENGTH) / (s.end - s.start)
}

/** Journey progress at which vehicle v's drive reaches road position u */
function progressForU(v: number, u: number) {
  const [u0, u1] = RANGES[v]
  const s = STEPS[DRIVE_STEP[v]]
  return s.start + clamp((u - u0) / (u1 - u0)) * (s.end - s.start)
}

/* ------------------------------------------------------------------ */
/*  Collectible coins (in lanes) and pedestrian crossings              */
/* ------------------------------------------------------------------ */

export interface Coin {
  u: number
  v: number
  lane: number
  pos: THREE.Vector3
}
export const COINS: Coin[] = []
for (let v = 0; v < 7; v++) {
  const rnd = mulberry32(300 + v * 17)
  const [u0, u1] = RANGES[v]
  const span = (u1 - u0) * ROAD_LENGTH
  let d = span * 0.1
  let lane = rnd() < 0.5 ? -1 : 1
  while (d < span * 0.86) {
    for (let k = 0; k < 5 && d < span * 0.86; k++) {
      const u = u0 + d / ROAD_LENGTH
      const frac = d / span
      const pos = alongRoad(u, lane * LANE_W[v])
      pos.y = 1.5 + (v === 4 ? altitude(frac) + 0.6 : v === 3 ? 1.0 : 0)
      COINS.push({ u, v, lane, pos })
      d += 6.5
    }
    d += 15
    const options = [-1, 0, 1].filter((l) => l !== lane)
    lane = options[Math.floor(rnd() * options.length)]
  }
}

export type CrossKind = 'people' | 'cows'
export interface CrossingDef {
  zone: number
  kind: CrossKind
  u: number // crosswalk centre
  lineU: number // stop line
  stopU: number // where the vehicle centre stops
  approachU: number // where the light changes
  pStop: number // scroll progress of the stop point
}
/** Half-width of the crossing path, kerb to kerb */
export const CROSS_HALF = ROAD_HALF + 2.4
export const CROSSINGS: CrossingDef[] = (
  [
    [0, 0.56, 'cows'],
    [2, 0.33, 'people'],
    [2, 0.71, 'people'],
    [3, 0.46, 'people'],
  ] as const
).map(([zone, frac, kind]) => {
  const u = zoneU(zone, frac)
  const stopU = u - 9.5 / ROAD_LENGTH
  return {
    zone,
    kind,
    u,
    lineU: u - 4.4 / ROAD_LENGTH,
    stopU,
    approachU: stopU - 55 / ROAD_LENGTH,
    pStop: progressForU(zone, stopU),
  }
})

/* ------------------------------------------------------------------ */
/*  Per-frame live state (read by the 3D scene)                        */
/* ------------------------------------------------------------------ */

export interface VehicleLive {
  pos: THREE.Vector3
  yaw: number
  pitch: number
  roll: number
  u: number
  frac: number
  moving: number
  ground: number
  power: number
  lateral: number
  steer: number
}

export const live = {
  progress: 0,
  target: 0,
  time: 0,
  stepIndex: 0,
  kind: 'drive' as StepKind,
  t: 0,
  zone: 0,
  vehicle: 0,
  focusU: START_U,
  speed: 0,
  coins: 0,
  launch: 0,
  space: 0,
  elevator: 0,
  armOpen: 0,
  panel: 1,
  bloom: 0.6,
  laneX: 0,
  laneVel: 0,
  velocity: 0, // road units per second, negative when reversing
  accel: 0,
  hero: 1, // 1 = opening shot in front of the auto, 0 = chase cam
  snap: false,
  vehicles: Array.from(
    { length: 8 },
    (): VehicleLive => ({
      pos: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      u: 0,
      frac: 0,
      moving: 0,
      ground: 0,
      power: 0,
      lateral: 0,
      steer: 0,
    }),
  ),
  char: {
    pos: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    sit: 1,
    walk: 0,
    run: 0,
    hop: 0,
    crouch: 0,
    wave: 0,
    flip: 0,
    spin: 0,
    lean: 0,
    look: 0,
    steer: 0,
    emote: 0,
    emoteId: 1,
    visible: true,
  },
  cam: { pos: new THREE.Vector3(0, 5, 10), target: new THREE.Vector3(), shake: 0 },
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ')
const _v = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _s = new THREE.Vector3()
const _f = new THREE.Vector3()
const _rr = new THREE.Vector3()

function rotY(x: number, y: number, z: number, yaw: number, out: THREE.Vector3) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return out.set(x * c + z * s, y, -x * s + z * c)
}

/** World position of a vehicle-local point (full rotation) */
function vehicleLocal(v: number, x: number, y: number, z: number, out: THREE.Vector3) {
  const s = live.vehicles[v]
  _e.set(s.pitch, s.yaw, s.roll, 'YXZ')
  return out.set(x, y, z).applyEuler(_e).add(s.pos)
}

/** Where the character's feet go when seated */
function seatRoot(v: number, out: THREE.Vector3) {
  const [x, y, z] = SPECS[v].seat
  return v === 7 ? vehicleLocal(v, x, y, z, out) : vehicleLocal(v, x, y - HIP, z, out)
}

function boardPoint(v: number, out: THREE.Vector3) {
  const s = live.vehicles[v]
  const [x, , z] = SPECS[v].board
  rotY(x, 0, z, s.yaw, out)
  out.x += s.pos.x
  out.z += s.pos.z
  out.y = s.ground
  return out
}

function lerpAngle(a: number, b: number, t: number) {
  return a + angleDiff(b, a) * t
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t))

function updateVehicles(index: number, t: number, time: number) {
  const step = STEPS[index]
  for (let v = 0; v < 7; v++) {
    const di = DRIVE_STEP[v]
    let frac = 0
    let moving = 0
    if (index > di) frac = 1
    else if (index === di) {
      frac = t
      moving = clamp(Math.abs(live.velocity) / MAX_SPEED[v])
    }
    const [u0, u1] = RANGES[v]
    const u = lerp(u0, u1, frac)
    const s = live.vehicles[v]

    // engine: on while driving, off once you hop out, on again when you hop in
    let power = 0
    if (index === di) power = 1
    else if (step.kind === 'swap' && step.vehicle === v) power = 1 - smoothstep(0.03, 0.08, t)
    else if (step.kind === 'swap' && step.vehicle + 1 === v) power = smoothstep(0.9, 0.95, t)
    s.power = power

    // lane offset: free while driving, eased back to the centre when parking at the next gate
    const env = index === di ? smoothstep(1.5, 9, (u1 - u) * ROAD_LENGTH) : 0
    s.lateral = live.laneX * env
    roadPoint(u, s.pos)
    roadRight(u, _rr)
    s.pos.x += _rr.x * s.lateral
    s.pos.z += _rr.z * s.lateral
    s.ground = s.pos.y
    s.u = u
    s.frac = frac
    s.moving = moving

    const du = 2 / ROAD_LENGTH
    const curv = angleDiff(roadYaw(Math.min(1, u + du)), roadYaw(Math.max(0, u - du))) / 4
    s.yaw = roadYaw(u) + clamp(-live.laneVel * 0.07, -0.3, 0.3) * env
    const laneLean = clamp(live.laneVel * 0.025 * (v === 3 || v === 5 ? 2.5 : v === 4 ? 4 : 1), -0.5, 0.5) * env
    s.roll = -curv * SPECS[v].lean * moving + laneLean
    s.steer = clamp(-curv * 25 * moving - live.laneVel * 0.12 * env, -0.7, 0.7)
    s.pitch = 0

    // suspension: squat when accelerating, dive when braking, settle, hop on engine start
    if (v !== 3 && v !== 4 && index === di) s.pitch += clamp(-live.accel * 0.0035, -0.045, 0.055)
    if (step.kind === 'swap' && step.vehicle === v && t < 0.1) {
      const k = t / 0.1
      s.pitch += 0.05 * Math.sin(k * Math.PI * 2) * (1 - k)
    }
    if (step.kind === 'swap' && step.vehicle + 1 === v && t > 0.92) {
      const k = (t - 0.92) / 0.08
      s.pos.y += 0.22 * Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k)
    }

    if (v === 4) {
      const alt = altitude(frac)
      s.pos.y += alt
      const span = (u1 - u0) * ROAD_LENGTH
      const slope = (altitude(frac + 0.01) - altitude(frac - 0.01)) / (0.02 * span)
      s.pitch = alt > 0.05 ? -Math.atan(slope) : s.pitch
      s.roll = clamp(s.roll, -0.7, 0.7) * smoothstep(0.5, 4, alt)
    }
    // hoverbike rests on its pods when parked and lifts off when the engine starts
    if (v === 3) s.pos.y += lerp(0.42, 0.95, power) + Math.sin(time * 2.2) * 0.08 * power
  }

  // rocket
  const lt = index === LAUNCH_STEP ? t : index > LAUNCH_STEP ? 1 : 0
  const r = live.vehicles[7]
  const rise = 900 * Math.pow(lt, 2.4)
  roadDir(1, _f)
  r.pos.copy(PAD_POS).addScaledVector(_f, 240 * Math.pow(lt, 2.6))
  r.pos.y = PAD_TOP + rise
  r.yaw = PAD_YAW
  r.pitch = 0.42 * Math.pow(lt, 1.6)
  r.roll = 0
  r.u = PAD_U
  r.ground = PAD_TOP
  r.moving = lt > 0 ? 1 : 0
  r.power = lt > 0 ? 1 : 0
  live.launch = lt
  live.space = smoothstep(0.18, 0.62, lt)
  live.armOpen = smoothstep(0, 0.04, lt)
}

function resetPose() {
  const c = live.char
  c.sit = 0
  c.walk = 0
  c.run = 0
  c.hop = 0
  c.crouch = 0
  c.wave = 0
  c.flip = 0
  c.spin = 0
  c.lean = 0
  c.look = 0
  c.steer = 0
  c.emote = 0
  c.pitch = 0
  c.roll = 0
  c.visible = true
}

function seatCharacter(v: number) {
  const c = live.char
  const s = live.vehicles[v]
  resetPose()
  seatRoot(v, c.pos)
  c.yaw = s.yaw
  c.pitch = s.pitch
  c.roll = s.roll
  c.sit = 1
  c.steer = s.steer
  c.look = s.steer * 0.4
}

/**
 * Vehicle swap cutscene: stand up, jump out with a twirl, land, wave,
 * sprint to the next vehicle and front-flip into the seat.
 */
function updateCharacter(step: Step, t: number) {
  const c = live.char
  live.elevator = live.stepIndex > ROCKET_SWAP_STEP ? ARM_Y : 0
  if (step.kind === 'drive') {
    seatCharacter(step.vehicle)
    return
  }
  if (step.kind === 'launch') {
    c.visible = false
    return
  }
  const a = step.vehicle
  const b = a + 1
  const rocket = b === 7
  const sa = live.vehicles[a]
  const sb = live.vehicles[b]
  c.emoteId = b
  boardPoint(a, _a)
  boardPoint(b, _b)
  const runYaw = Math.atan2(_b.x - _a.x, _b.z - _a.z)
  const P = rocket
    ? { stand: 0.04, jump: 0.08, land: 0.16, run: 0.22, runEnd: 0.45 }
    : { stand: 0.06, jump: 0.13, land: 0.27, run: 0.42, runEnd: 0.78 }

  if (t < P.stand) {
    seatCharacter(a)
    c.look = 0.7 * smoothstep(0.01, P.stand, t)
    return
  }
  seatRoot(a, _c)
  _s.copy(_c)
  _s.y += HIP * 0.9 // standing on the seat
  if (t < P.jump) {
    const s = remap(t, P.stand, P.jump)
    resetPose()
    c.pos.lerpVectors(_c, _s, easeInOut(s))
    c.yaw = sa.yaw
    c.sit = 1 - easeInOut(s)
    c.crouch = smoothstep(0.5, 1, s) * 0.8
    c.hop = -0.5 * s
    c.look = 0.7 * (1 - s)
    return
  }
  if (t < P.land) {
    const s = remap(t, P.jump, P.land)
    resetPose()
    c.pos.lerpVectors(_s, _a, easeOut(s))
    c.pos.y += Math.sin(Math.PI * s) * 1.7
    c.spin = Math.PI * 2 * easeInOut(s)
    c.yaw = lerpAngle(sa.yaw, runYaw, s)
    c.hop = Math.sin(Math.PI * s)
    c.crouch = Math.sin(Math.PI * s) * 0.55
    return
  }
  if (t < P.run) {
    const s = remap(t, P.land, P.run)
    resetPose()
    c.pos.copy(_a)
    const turn = Math.sin(Math.PI * smoothstep(0.05, 0.95, s))
    c.yaw = lerpAngle(runYaw, runYaw + 1.9, turn)
    c.crouch = 0.9 * (1 - smoothstep(0, 0.35, s))
    c.wave = turn
    c.emote = smoothstep(0.05, 0.3, s)
    return
  }
  if (t < P.runEnd) {
    const s = remap(t, P.run, P.runEnd)
    resetPose()
    const e = sine(s)
    c.pos.lerpVectors(_a, _b, e)
    c.yaw = runYaw
    c.run = 1
    c.walk = (e * _a.distanceTo(_b)) / 1.05
    c.lean = 0.24 * Math.min(1, s * 6, (1 - s) * 6)
    c.emote = 1 - smoothstep(0.35, 0.6, s)
    return
  }

  if (rocket) {
    // ride the gantry elevator, cross the access arm, salute, hop into the hatch
    const top = vehicleLocal(7, GANTRY_X, ARM_Y, 0, _c)
    const faceIn = sb.yaw - Math.PI / 2
    const faceCam = PAD_YAW + Math.atan2(34, -24)
    resetPose()
    if (t < 0.66) {
      const s = easeInOut(remap(t, P.runEnd, 0.66))
      c.pos.copy(_b)
      c.pos.y = lerp(_b.y, top.y, s)
      live.elevator = ARM_Y * s
      c.yaw = faceCam
      c.wave = Math.sin(Math.PI * remap(t, 0.5, 0.63))
      return
    }
    live.elevator = ARM_Y
    seatRoot(7, _s)
    if (t < 0.78) {
      const s = remap(t, 0.66, 0.78)
      c.pos.lerpVectors(top, _s, s)
      c.yaw = faceIn
      c.walk = (s * (GANTRY_X - HATCH_X)) / 0.62
      return
    }
    if (t < 0.86) {
      const s = remap(t, 0.78, 0.86)
      c.pos.copy(_s)
      c.yaw = lerpAngle(faceIn, faceCam, smoothstep(0, 0.3, s))
      c.wave = Math.sin(Math.PI * s)
      c.emote = Math.sin(Math.PI * s)
      return
    }
    const s = remap(t, 0.86, 0.9)
    vehicleLocal(7, HATCH_X - 1.3, ARM_Y + 0.2, 0, _c)
    c.pos.lerpVectors(_s, _c, s)
    c.pos.y += Math.sin(Math.PI * s) * 0.5
    c.yaw = faceIn
    c.crouch = Math.sin(Math.PI * s)
    c.visible = t < 0.9
    return
  }

  if (t < 0.92) {
    const s = remap(t, P.runEnd, 0.92)
    resetPose()
    seatRoot(b, _c)
    c.pos.lerpVectors(_b, _c, easeInOut(s))
    c.pos.y += Math.sin(Math.PI * s) * 2.1
    c.flip = Math.PI * 2 * easeInOut(s)
    c.crouch = Math.sin(Math.PI * s) * 0.8
    c.sit = smoothstep(0.7, 1, s)
    c.yaw = lerpAngle(runYaw, sb.yaw, smoothstep(0, 0.5, s))
    c.hop = 0.3 * Math.sin(Math.PI * s)
    return
  }
  seatCharacter(b)
  c.hop = Math.sin(Math.PI * remap(t, 0.92, 1)) * 0.75
}

/** Chase camera, using the road heading so lane changes do not swing it around */
function chaseCam(v: number, pos: THREE.Vector3, target: THREE.Vector3) {
  const s = live.vehicles[v]
  const yaw = roadYaw(s.u)
  const [x, y, z] = SPECS[v].cam
  rotY(x, y, z, yaw, pos).add(s.pos)
  roadRight(s.u, _rr)
  pos.addScaledVector(_rr, -s.lateral * 0.45)
  if (v === 3) pos.y = s.ground + y + (s.pos.y - s.ground) * 0.3
  target.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(SPECS[v].look).add(s.pos)
  target.addScaledVector(_rr, -s.lateral * 0.3)
  target.y = (v === 3 ? s.ground + 1 : s.pos.y) + 1.3
}

const _cp = new THREE.Vector3()
const _ct = new THREE.Vector3()

function updateCamera(step: Step, index: number, t: number) {
  const cam = live.cam
  cam.shake = 0
  if (step.kind === 'drive') {
    chaseCam(step.vehicle, cam.pos, cam.target)
    if (index === 0 && live.hero > 0.001) {
      // opening shot in front of the auto: orbit round to the chase cam once you drive off
      const s = live.vehicles[0]
      const w = easeInOut(live.hero)
      const [cx, cy, cz] = SPECS[0].cam
      const angle = lerp(Math.atan2(cx, cz), Math.atan2(-4.4, 6.6), w)
      const radius = lerp(Math.hypot(cx, cz), Math.hypot(4.4, 6.6), w)
      _cp.set(Math.sin(angle) * radius, lerp(cy, 2.0, w), Math.cos(angle) * radius)
      rotY(_cp.x, _cp.y, _cp.z, roadYaw(s.u), _cp).add(s.pos)
      _ct.copy(s.pos)
      _ct.y += 1.35
      cam.pos.lerp(_cp, Math.min(1, w * 4))
      cam.target.lerp(_ct, w)
    }
    return
  }
  if (step.kind === 'swap') {
    const a = step.vehicle
    const b = a + 1
    const w = smoothstep(0.02, 0.2, t) * (1 - smoothstep(0.84, 0.99, t))
    if (b === 7) {
      const wIn = smoothstep(0.02, 0.22, t)
      chaseCam(a, cam.pos, cam.target)
      rotY(34, 10, -24, PAD_YAW, _cp).add(PAD_POS)
      _ct.copy(live.char.pos).lerp(PAD_POS, 0.45)
      _ct.y = lerp(live.char.pos.y + 1.2, 11, 0.5)
      cam.pos.lerp(_cp, wIn)
      cam.target.lerp(_ct, wIn)
      return
    }
    chaseCam(t < 0.5 ? a : b, cam.pos, cam.target)
    const bu = boundaryU(b)
    roadPoint(bu, _v)
    const yaw = roadYaw(bu)
    rotY(12, 8, -16, yaw, _cp).add(_v)
    _ct.copy(live.char.pos).lerp(_v, 0.3)
    _ct.y = live.char.pos.y + 1.1
    cam.pos.lerp(_cp, w)
    cam.target.lerp(_ct, w)
    return
  }
  // launch
  const lt = t
  const r = live.vehicles[7]
  rotY(34, 10, -24, PAD_YAW, cam.pos).add(PAD_POS)
  cam.target.copy(r.pos)
  cam.target.y += lerp(11, 9, smoothstep(0, 0.1, lt))
  rotY(20, -5, -26, PAD_YAW, _cp).add(r.pos)
  _ct.copy(r.pos)
  _ct.y += 12
  const k = smoothstep(0.04, 0.3, lt)
  cam.pos.lerp(_cp, k)
  cam.target.lerp(_ct, k)
  cam.shake = smoothstep(0, 0.02, lt) * (1 - smoothstep(0.12, 0.3, lt)) * 0.35
}

let lastFocus = START_U

/** Advance all derived state for scroll progress p */
export function computeFrame(p: number, time: number, dt: number) {
  const { index, t } = locate(p)
  const step = STEPS[index]
  live.progress = p
  live.time = time
  live.stepIndex = index
  live.kind = step.kind
  live.t = t
  live.zone = step.zone
  live.vehicle = step.kind === 'swap' ? (t < 0.5 ? step.vehicle : step.vehicle + 1) : step.vehicle

  updateVehicles(index, t, time)
  updateCharacter(step, t)
  updateCamera(step, index, t)

  // focus point along the road (atmosphere, minimap)
  if (step.kind === 'drive') live.focusU = live.vehicles[step.vehicle].u
  else if (step.kind === 'swap') {
    const a = live.vehicles[step.vehicle].u
    const b = live.vehicles[step.vehicle + 1].u
    live.focusU = lerp(a, Math.min(b, 1), smoothstep(0.15, 0.85, t))
  } else live.focusU = 1

  const ds = Math.abs(live.focusU - lastFocus) * ROAD_LENGTH
  lastFocus = live.focusU
  if (live.snap) {
    live.speed = 0
    return
  }
  const inst = dt > 0 && step.kind === 'drive' ? ds / dt : 0
  const launchSpeed = step.kind === 'launch' ? t * 300 : 0
  live.speed = lerp(live.speed, Math.min(inst, 200) + launchSpeed, 1 - Math.exp(-6 * dt))
}

export function uiSnapshot() {
  const step = STEPS[live.stepIndex]
  let project = 0
  if (step.kind === 'drive' && step.vehicle === 4) {
    const f = live.vehicles[4].frac
    project = f < 0.3 ? 0 : f < 0.55 ? 1 : 2
  }
  let countdown = 10
  if (live.stepIndex === ROCKET_SWAP_STEP) countdown = Math.max(1, Math.ceil(10 * (1 - remap(live.t, 0.3, 0.97))))
  if (live.stepIndex === LAUNCH_STEP) countdown = 0
  return {
    stepIndex: live.stepIndex,
    kind: live.kind,
    zone: live.zone,
    vehicle: live.vehicle,
    nextVehicle: Math.min(step.vehicle + 1, 7),
    project,
    countdown,
    launchDone: live.stepIndex === LAUNCH_STEP && live.t > 0.42,
    coins: live.coins,
  }
}
