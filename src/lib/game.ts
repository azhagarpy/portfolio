import { clamp, damp, mulberry32 } from './math'
import {
  COINS,
  computeFrame,
  CROSS_HALF,
  CROSSINGS,
  DRIVE_STEP,
  LANE_W,
  LAUNCH_SECONDS,
  LAUNCH_STEP,
  live,
  locate,
  MAX_SPEED,
  ROAD_LENGTH,
  ROCKET_SWAP_SECONDS,
  ROCKET_SWAP_STEP,
  STEPS,
  SWAP_SECONDS,
  uiSnapshot,
  unitsPerProgress,
  type CrossingDef,
} from './journey'
import { sfx, unlockAudio } from './sfx'
import { settings, ui, type SignalState } from './store'

/*
 * Stateful game layer on top of the scroll-driven journey:
 * speed limits, auto-playing cutscenes, lanes + coins, and crossings
 * where the player has to wait for pedestrians (or cows).
 */

export type Phase = 'idle' | 'yellow' | 'red' | 'go' | 'done'

export interface Walker {
  side: number // kerb the walker starts from: -1 left, 1 right
  along: number // offset along the road inside the crosswalk
  speed: number
  delay: number
  prog: number // 0 = waiting at the kerb, 1 = across
  kind: 'person' | 'cow'
  seed: number
}

export interface CrossingState {
  def: CrossingDef
  phase: Phase
  timer: number
  walkers: Walker[]
}

function makeWalkers(def: CrossingDef, index: number): Walker[] {
  const rnd = mulberry32(700 + index * 13)
  if (def.kind === 'cows') {
    const herd: Walker[] = [0, 1, 2].map((i) => ({
      side: -1,
      along: -1.8 + i * 1.8 + (rnd() - 0.5) * 0.6,
      speed: 2.2 + rnd() * 0.4,
      delay: i * 0.5 + rnd() * 0.3,
      prog: 0,
      kind: 'cow',
      seed: rnd(),
    }))
    herd.push({ side: -1, along: 0.6, speed: 2.5, delay: 1.6, prog: 0, kind: 'person', seed: rnd() })
    return herd
  }
  return Array.from({ length: 5 }, (_, i) => ({
    side: i % 2 ? 1 : -1,
    along: (rnd() - 0.5) * 2.6,
    speed: 3.2 + rnd() * 0.8,
    delay: rnd() * 0.8,
    prog: 0,
    kind: 'person' as const,
    seed: rnd(),
  }))
}

const COIN_FIRST: number[] = []
const COIN_LAST: number[] = []
COINS.forEach((c, i) => {
  if (COIN_FIRST[c.v] === undefined) COIN_FIRST[c.v] = i
  COIN_LAST[c.v] = i + 1
})

export const game = {
  laneTarget: 0,
  laneChanged: false,
  collected: new Uint8Array(COINS.length),
  collectedAt: new Float32Array(COINS.length).fill(-10),
  coinCount: 0,
  prevU: -1,
  prevVehicle: -1,
  honkUntil: 0,
  lastT: 0,
  lastStep: 0,
  lastCountdown: 10,
  crossings: CROSSINGS.map((def, i): CrossingState => ({ def, phase: 'idle', timer: 0, walkers: makeWalkers(def, i) })),
}

function resetCrossing(c: CrossingState, phase: Phase = 'idle') {
  c.phase = phase
  c.timer = 0
  for (const w of c.walkers) w.prog = phase === 'done' ? 1 : 0
}

/* ------------------------------------------------------------- input */

export function changeLane(dir: number) {
  if (live.kind !== 'drive') return
  const next = clamp(game.laneTarget + dir, -1, 1)
  if (next === game.laneTarget) return
  game.laneTarget = next
  game.laneChanged = true
  sfx.lane()
}

export function honk() {
  unlockAudio()
  sfx.horn()
  game.honkUntil = live.time + 2.5
}

export function installControls() {
  const onKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    unlockAudio()
    const k = e.key.toLowerCase()
    if (k === 'arrowleft' || k === 'a') {
      changeLane(-1)
      e.preventDefault()
    } else if (k === 'arrowright' || k === 'd') {
      changeLane(1)
      e.preventDefault()
    } else if (k === 'h') honk()
  }
  let sx = 0
  let sy = 0
  let st = 0
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    sx = t.clientX
    sy = t.clientY
    st = performance.now()
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    const dx = t.clientX - sx
    const dy = t.clientY - sy
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - st < 600) changeLane(dx > 0 ? 1 : -1)
  }
  const onPointer = () => unlockAudio()
  window.addEventListener('keydown', onKey)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('pointerdown', onPointer)
  return () => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('pointerdown', onPointer)
  }
}

const scrollMaxPx = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight)

/** Fade to black, jump, fade back in */
export function fastTravel(p: number) {
  if (ui.get().fade) return
  ui.set({ fade: true })
  window.setTimeout(() => {
    window.scrollTo({ top: p * scrollMaxPx(), behavior: 'instant' as ScrollBehavior })
    live.progress = p
    live.snap = true
    game.prevVehicle = -1
    const { index } = locate(p)
    for (const c of game.crossings) {
      resetCrossing(c, index > DRIVE_STEP[c.def.zone] || (index === DRIVE_STEP[c.def.zone] && p > c.def.pStop) ? 'done' : 'idle')
    }
    window.setTimeout(() => ui.set({ fade: false }), 150)
  }, 420)
}

/* --------------------------------------------------------- the loop */

/** Fastest the scroll progress may change at p, so vehicles keep a believable speed */
function maxRate(p: number, dir: number) {
  const { index } = locate(p)
  const s = STEPS[index]
  const w = s.end - s.start
  if (s.kind === 'drive') return (MAX_SPEED[s.vehicle] * (dir < 0 ? 1.8 : 1)) / Math.max(unitsPerProgress(p), 1)
  const secs = s.kind === 'launch' ? LAUNCH_SECONDS : index === ROCKET_SWAP_STEP ? ROCKET_SWAP_SECONDS : SWAP_SECONDS
  return (w / secs) * (dir < 0 ? 3 : 1)
}

function blockingCrossing(stepIndex: number) {
  const step = STEPS[stepIndex]
  if (step.kind !== 'drive') return null
  for (const c of game.crossings) {
    if (c.def.zone !== step.vehicle) continue
    if ((c.phase === 'yellow' || c.phase === 'red') && live.vehicles[step.vehicle].u <= c.def.stopU + 1e-5) return c
  }
  return null
}

export function stepGame(time: number, dt: number) {
  const max = scrollMaxPx()
  let target = clamp(window.scrollY / max)
  live.target = target
  const cur = live.progress
  const { index } = locate(cur)
  const step = STEPS[index]

  // cutscenes (vehicle swaps, the launch) play through on their own once started
  const cutscene = (step.kind === 'swap' || step.kind === 'launch') && cur > step.start + 1e-6 && target > step.start - 0.004
  if (cutscene) target = Math.min(1, Math.max(target, step.end + 1e-6))

  let desired = cutscene ? target : damp(cur, target, 2.4, dt)
  if (Math.abs(desired - target) < 2e-6) desired = target
  let rate = (desired - cur) / Math.max(dt, 1e-4)
  const lim = maxRate(cur, Math.sign(rate))
  rate = clamp(rate, -lim, lim)
  let p = cur + rate * dt

  // brake smoothly for a red light, then hold at the stop line
  const blk = blockingCrossing(index)
  if (blk && rate > 0) {
    const dRoad = Math.max(0, (blk.def.stopU - live.vehicles[step.vehicle].u) * ROAD_LENGTH)
    const allowed = Math.sqrt(2 * 13 * dRoad) / Math.max(unitsPerProgress(cur), 1)
    p = Math.min(cur + Math.min(rate, allowed) * dt, blk.def.pStop)
  }
  p = clamp(p)

  // lanes
  const laneVehicle = Math.min(STEPS[locate(p).index].vehicle, 6)
  const prevX = live.laneX
  live.laneX = damp(live.laneX, game.laneTarget * LANE_W[laneVehicle], 6.5, dt)
  live.laneVel = (live.laneX - prevX) / Math.max(dt, 1e-4)

  computeFrame(p, time, dt)

  // a cutscene that ran ahead of the page scroll: bring the scrollbar along
  if (cutscene && (live.stepIndex !== index || p >= 1) && window.scrollY / max < p - 0.0004) {
    window.scrollTo({ top: p * max, behavior: 'instant' as ScrollBehavior })
  }

  collectCoins(time)
  updateCrossings(time, dt)
  cueSounds()
  publish()
}

function collectCoins(time: number) {
  const s = STEPS[live.stepIndex]
  if (s.kind !== 'drive') {
    game.prevVehicle = -1
    return
  }
  const v = s.vehicle
  const sv = live.vehicles[v]
  if (game.prevVehicle === v && game.prevU >= 0 && COIN_FIRST[v] !== undefined) {
    const lo = Math.min(game.prevU, sv.u) - 0.5 / ROAD_LENGTH
    const hi = Math.max(game.prevU, sv.u) + 0.5 / ROAD_LENGTH
    for (let i = COIN_FIRST[v]; i < COIN_LAST[v]; i++) {
      const c = COINS[i]
      if (game.collected[i] || c.u < lo || c.u > hi) continue
      if (Math.abs(sv.lateral - c.lane * LANE_W[v]) < 1.3) {
        game.collected[i] = 1
        game.collectedAt[i] = time
        game.coinCount++
        sfx.coin()
      }
    }
  }
  game.prevU = sv.u
  game.prevVehicle = v
  live.coins = game.coinCount
}

function updateCrossings(time: number, dt: number) {
  for (const c of game.crossings) {
    const d = c.def
    const driveIdx = DRIVE_STEP[d.zone]
    const vehU = live.vehicles[d.zone].u
    const inDrive = live.stepIndex === driveIdx
    if (live.stepIndex < driveIdx || (inDrive && vehU < d.approachU - 25 / ROAD_LENGTH)) {
      if (c.phase !== 'idle') resetCrossing(c)
      continue
    }
    switch (c.phase) {
      case 'idle':
        if (inDrive && vehU > d.approachU && vehU < d.stopU - 1 / ROAD_LENGTH) {
          c.phase = 'yellow'
          c.timer = 0
        } else if (!inDrive || vehU >= d.stopU) resetCrossing(c, 'done')
        break
      case 'yellow':
        c.timer += dt
        if (c.timer > 0.8) {
          c.phase = 'red'
          c.timer = 0
        }
        break
      case 'red': {
        c.timer += dt
        // honking hurries the herd (and its herder) along
        const hurry = d.kind === 'cows' && time < game.honkUntil ? 2.3 : 1
        let across = true
        for (const w of c.walkers) {
          if (c.timer > w.delay) w.prog = Math.min(1, w.prog + (dt * w.speed * hurry) / (CROSS_HALF * 2))
          if (w.prog < 1) across = false
        }
        if (across && c.timer > 1.5) {
          c.phase = 'go'
          c.timer = 0
          sfx.go()
        }
        break
      }
      case 'go':
        c.timer += dt
        if (c.timer > 1.6) c.phase = 'done'
        break
    }
  }
}

function cueSounds() {
  const snap = uiSnapshot()
  if (snap.countdown !== game.lastCountdown) {
    if (live.stepIndex === ROCKET_SWAP_STEP && snap.countdown < 10) sfx.beep(false)
    if (live.stepIndex === LAUNCH_STEP && game.lastCountdown > 0) {
      sfx.beep(true)
      sfx.launch()
    }
    game.lastCountdown = snap.countdown
  }
  if (live.kind === 'swap' && live.stepIndex === game.lastStep && live.t > game.lastT) {
    const rocket = live.stepIndex === ROCKET_SWAP_STEP
    const crossed = (x: number) => game.lastT < x && live.t >= x
    if (crossed(rocket ? 0.08 : 0.13)) sfx.jump()
    if (crossed(rocket ? 0.16 : 0.27)) sfx.land()
    if (!rocket && crossed(0.78)) sfx.jump()
    if (!rocket && crossed(0.9)) sfx.power()
  }
  game.lastT = live.t
  game.lastStep = live.stepIndex
  sfx.engine(live.speed, live.kind === 'drive' || live.kind === 'launch')
}

function publish() {
  let signal: SignalState = 'none'
  for (const c of game.crossings) {
    if (live.stepIndex !== DRIVE_STEP[c.def.zone]) continue
    if (c.phase === 'yellow' || c.phase === 'red') signal = c.def.kind === 'cows' ? 'cows' : 'stop'
    else if (c.phase === 'go') signal = 'go'
  }
  ui.set({
    ...uiSnapshot(),
    signal,
    lane: game.laneTarget,
    laneTip: settings.get().started && !game.laneChanged && live.kind === 'drive' && live.stepIndex <= 2,
  })
}

if (import.meta.env.DEV) (window as unknown as { __game: typeof game }).__game = game
