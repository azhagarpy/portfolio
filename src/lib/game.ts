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
  RANGES,
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
import { settings, ui, type SignalState, type TipState } from './store'

/*
 * Game layer on top of the journey: the player drives with the scroll wheel,
 * arrow keys / WASD, touch drags or the on-screen pedals. It also handles
 * lanes + coins, red lights and cattle crossings, and the swap cutscenes.
 */

const ACCEL = 12 // units/s² when speeding up
const BRAKE = 30 // when the input points the other way
const COAST = 15 // when there is no input
const REVERSE_FACTOR = 0.45 // reverse is slower than forward

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
  // driving input
  keyFwd: false,
  keyRev: false,
  pedal: 0,
  wheel: 0, // decaying throttle from the scroll wheel / touch drags
  swipeX: 0, // accumulated horizontal trackpad swipe
  hasDriven: false,
  // lanes + coins
  laneTarget: 0,
  laneChanged: false,
  collected: new Uint8Array(COINS.length),
  collectedAt: new Float32Array(COINS.length).fill(-10),
  coinCount: 0,
  prevU: -1,
  prevVehicle: -1,
  // misc
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

/** On-screen pedals: 1 = gas, -1 = reverse, 0 = released */
export function setPedal(dir: number) {
  game.pedal = dir
  if (dir !== 0) start()
}

function start() {
  if (!settings.get().started) settings.set({ started: true })
}

/** Is the element (or an ancestor) a scroll box that can still scroll in this direction? */
function scrollsInside(el: EventTarget | null, dy: number) {
  let node = el instanceof Element ? el : null
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      if (dy > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true
    }
    node = node.parentElement
  }
  return false
}

export function installControls() {
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const el = e.target as HTMLElement | null
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    const k = e.key.toLowerCase()
    if (k === 'arrowup' || k === 'w') {
      game.keyFwd = down
      e.preventDefault()
      if (down) start()
    } else if (k === 'arrowdown' || k === 's') {
      game.keyRev = down
      e.preventDefault()
    } else if (down && !e.repeat && (k === 'arrowleft' || k === 'a')) {
      changeLane(-1)
      e.preventDefault()
    } else if (down && !e.repeat && (k === 'arrowright' || k === 'd')) {
      changeLane(1)
      e.preventDefault()
    } else if (down && !e.repeat && k === 'h') honk()
    if (down) unlockAudio()
  }
  const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
  const onKeyUp = (e: KeyboardEvent) => onKey(e, false)
  const release = () => {
    game.keyFwd = false
    game.keyRev = false
    game.pedal = 0
  }

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return // pinch-zoom
    const scale = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1
    const dx = e.deltaX * scale
    const dy = e.deltaY * scale
    if (scrollsInside(e.target, dy)) return
    e.preventDefault()
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      // horizontal trackpad swipe = lane change
      game.swipeX += dx
      if (Math.abs(game.swipeX) > 140) {
        changeLane(Math.sign(game.swipeX))
        game.swipeX = 0
      }
      return
    }
    // scroll down drives forward, scroll up reverses
    game.wheel = clamp(game.wheel + dy / 240, -1.2, 1.2)
    if (dy > 0) start()
  }

  let sx = 0
  let sy = 0
  let ly = 0
  let st = 0
  let inPanel = false
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    sx = t.clientX
    sy = ly = t.clientY
    st = performance.now()
    inPanel = !!(e.target instanceof Element && e.target.closest('.panel, .final'))
  }
  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0]
    const dy = ly - t.clientY // finger moving up = forward, like scrolling down
    ly = t.clientY
    if (inPanel && scrollsInside(e.target, dy)) return
    if (e.cancelable) e.preventDefault()
    if (Math.abs(t.clientX - sx) < Math.abs(t.clientY - sy) * 1.2) {
      game.wheel = clamp(game.wheel + dy / 110, -1.2, 1.2)
      if (dy > 0) start()
    }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    const dx = t.clientX - sx
    const dy = t.clientY - sy
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - st < 700) changeLane(dx > 0 ? 1 : -1)
  }
  const onPointer = () => unlockAudio()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', release)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('pointerdown', onPointer)
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', release)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('pointerdown', onPointer)
  }
}

/** Fade to black, jump, fade back in */
export function fastTravel(p: number) {
  if (ui.get().fade) return
  start()
  ui.set({ fade: true })
  window.setTimeout(() => {
    live.progress = p
    live.velocity = 0
    live.snap = true
    game.wheel = 0
    game.laneTarget = 0
    live.laneX = 0
    game.prevVehicle = -1
    if (p === 0) game.hasDriven = false
    const { index } = locate(p)
    for (const c of game.crossings) {
      resetCrossing(c, index > DRIVE_STEP[c.def.zone] || (index === DRIVE_STEP[c.def.zone] && p > c.def.pStop) ? 'done' : 'idle')
    }
    window.setTimeout(() => ui.set({ fade: false }), 150)
  }, 420)
}

/* --------------------------------------------------------- the loop */

const approach = (v: number, target: number, step: number) =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step)

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
  game.wheel *= Math.exp(-dt / 0.3)
  game.swipeX *= Math.exp(-dt / 0.25)
  const throttle = clamp((game.keyFwd ? 1 : 0) - (game.keyRev ? 1 : 0) + game.pedal + game.wheel, -1, 1)

  const cur = live.progress
  const { index } = locate(cur)
  const step = STEPS[index]
  let p = cur
  const prevVel = live.velocity

  if (step.kind === 'drive') {
    const v = step.vehicle
    const sv = live.vehicles[v]
    const [u0, u1] = RANGES[v]
    const max = MAX_SPEED[v]
    const target = throttle >= 0 ? throttle * max : throttle * max * REVERSE_FACTOR
    let vel = live.velocity
    const rate = Math.abs(target) < 0.01 ? COAST : vel !== 0 && Math.sign(target) !== Math.sign(vel) ? BRAKE : ACCEL
    vel = approach(vel, target, rate * dt)

    // slow down into the next gate, and never roll back past the previous one
    const toEnd = Math.max(0, (u1 - sv.u) * ROAD_LENGTH)
    const fromStart = Math.max(0, (sv.u - u0) * ROAD_LENGTH)
    if (vel > 0) vel = Math.min(vel, Math.sqrt(2 * 14 * toEnd) + 1.6)
    if (vel < 0 && index === 0) vel = Math.max(vel, -Math.sqrt(2 * 14 * fromStart))
    // red light: brake for the stop line and wait there
    const blk = blockingCrossing(index)
    if (blk && vel > 0) vel = Math.min(vel, Math.sqrt(2 * 13 * Math.max(0, (blk.def.stopU - sv.u) * ROAD_LENGTH)))

    p = cur + (vel / unitsPerProgress(cur)) * dt
    if (blk) p = Math.min(p, blk.def.pStop)
    live.velocity = vel
    if (vel > 0.5) game.hasDriven = true
  } else {
    // swap cutscenes and the launch play on their own; hold reverse to rewind
    const secs = step.kind === 'launch' ? LAUNCH_SECONDS : index === ROCKET_SWAP_STEP ? ROCKET_SWAP_SECONDS : SWAP_SECONDS
    const dir = throttle < -0.3 ? -1.5 : 1
    p = cur + (dir * (step.end - step.start) * dt) / secs
    live.velocity = 0
  }
  p = clamp(p)
  live.hero = damp(live.hero, index === 0 && !game.hasDriven ? 1 : 0, 1.8, dt)
  live.accel = damp(live.accel, (live.velocity - prevVel) / Math.max(dt, 1e-4), 8, dt)

  // lanes (re-centred for every new vehicle)
  const next = locate(p).index
  if (next !== index && STEPS[next].kind === 'swap') {
    game.laneTarget = 0
    live.laneX = 0
  }
  const laneVehicle = Math.min(STEPS[next].vehicle, 6)
  const prevX = live.laneX
  live.laneX = damp(live.laneX, game.laneTarget * LANE_W[laneVehicle], 6.5, dt)
  live.laneVel = (live.laneX - prevX) / Math.max(dt, 1e-4)

  live.target = p
  computeFrame(p, time, dt)

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
  let tip: TipState = 'none'
  if (settings.get().started && live.kind === 'drive') {
    if (!game.hasDriven) tip = 'drive'
    else if (!game.laneChanged && live.stepIndex <= 2) tip = 'lane'
  }
  ui.set({ ...uiSnapshot(), signal, lane: game.laneTarget, tip })
}

if (import.meta.env.DEV) (window as unknown as { __game: typeof game }).__game = game
