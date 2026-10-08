import { settings } from './store'

/* Tiny synthesized sound effects — no audio files to download. */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let engineGain: GainNode | null = null
let engineOsc: OscillatorNode | null = null
let engineSub: OscillatorNode | null = null

/** Must be called from a user gesture (click / key) before anything can play */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.55
      master.connect(ctx.destination)

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 380
      engineGain = ctx.createGain()
      engineGain.gain.value = 0
      engineOsc = ctx.createOscillator()
      engineOsc.type = 'sawtooth'
      engineOsc.frequency.value = 45
      engineSub = ctx.createOscillator()
      engineSub.type = 'square'
      engineSub.frequency.value = 22
      const subGain = ctx.createGain()
      subGain.gain.value = 0.4
      engineOsc.connect(filter)
      engineSub.connect(subGain)
      subGain.connect(filter)
      filter.connect(engineGain)
      engineGain.connect(master)
      engineOsc.start()
      engineSub.start()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

const ready = () => !!ctx && !!master && ctx.state === 'running' && settings.get().sound

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  if (!ready()) return
  const t0 = ctx!.currentTime + delay
  const o = ctx!.createOscillator()
  const g = ctx!.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(master!)
  o.start(t0)
  o.stop(t0 + dur + 0.03)
}

function noise(dur: number, vol: number, cutoff: number, delay = 0) {
  if (!ready()) return
  const t0 = ctx!.currentTime + delay
  const len = Math.floor(ctx!.sampleRate * dur)
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ctx!.createBufferSource()
  src.buffer = buf
  const f = ctx!.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const g = ctx!.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f)
  f.connect(g)
  g.connect(master!)
  src.start(t0)
}

export const sfx = {
  coin() {
    tone(1046, 0.07, 'square', 0.06)
    tone(1568, 0.16, 'square', 0.055, 0.06)
  },
  lane() {
    tone(260, 0.14, 'triangle', 0.08, 0, 520)
  },
  jump() {
    tone(380, 0.2, 'sine', 0.1, 0, 880)
  },
  land() {
    noise(0.1, 0.18, 700)
  },
  power() {
    ;[523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.05, i * 0.06))
  },
  beep(high = false) {
    tone(high ? 1318 : 880, 0.15, 'sine', 0.14)
  },
  horn() {
    tone(392, 0.42, 'sawtooth', 0.06)
    tone(494, 0.42, 'sawtooth', 0.05)
  },
  go() {
    tone(784, 0.1, 'square', 0.06)
    tone(1175, 0.2, 'square', 0.06, 0.1)
  },
  launch() {
    noise(4, 0.6, 260)
    tone(60, 3, 'sawtooth', 0.08, 0, 30)
  },
  /** Continuous engine hum that follows the speedometer */
  engine(speed: number, on: boolean) {
    if (!ctx || !engineGain || !engineOsc || !engineSub) return
    const want = on && settings.get().sound ? 0.045 * Math.min(1, 0.35 + speed / 40) : 0
    const now = ctx.currentTime
    engineGain.gain.setTargetAtTime(want, now, 0.15)
    engineOsc.frequency.setTargetAtTime(40 + speed * 1.5, now, 0.2)
    engineSub.frequency.setTargetAtTime(20 + speed * 0.75, now, 0.2)
  },
}
