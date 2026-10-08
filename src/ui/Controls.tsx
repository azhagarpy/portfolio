import { useRef } from 'react'
import { changeLane, honk } from '../lib/game'
import { settings, ui, useStore } from '../lib/store'
import { Icon } from './icons'

/** On-screen driving controls: lane left / right and the horn */
export function Controls() {
  const kind = useStore(ui, (s) => s.kind)
  const lane = useStore(ui, (s) => s.lane)
  const cows = useStore(ui, (s) => s.signal === 'cows')
  const started = useStore(settings, (s) => s.started)
  return (
    <div className={`controls ${kind === 'drive' && started ? 'is-active' : ''}`} role="group" aria-label="Driving controls">
      <button className="ctrl" onClick={() => changeLane(-1)} aria-label="Switch lane left" title="Lane left (← / A)">
        <Icon name="left" size={20} />
      </button>
      <div className="lanes" aria-hidden>
        {[-1, 0, 1].map((l) => (
          <span key={l} className={l === lane ? 'is-on' : ''} />
        ))}
      </div>
      <button className="ctrl" onClick={() => changeLane(1)} aria-label="Switch lane right" title="Lane right (→ / D)">
        <Icon name="right" size={20} />
      </button>
      <button className={`ctrl ctrl--horn ${cows ? 'is-hint' : ''}`} onClick={honk} aria-label="Honk the horn" title="Honk (H)">
        <Icon name="horn" size={19} />
      </button>
    </div>
  )
}

interface Msg {
  icon: string
  title: string
  text: string
  tone: 'red' | 'amber' | 'green' | 'info'
}

/** Game toasts: red lights, cattle, GO!, and the lane tutorial */
export function Toasts() {
  const signal = useStore(ui, (s) => s.signal)
  const laneTip = useStore(ui, (s) => s.laneTip)
  const last = useRef<Msg | null>(null)
  let msg: Msg | null = null
  if (signal === 'stop') msg = { icon: '🚦', title: 'Red light', text: 'Stop and let the pedestrians cross', tone: 'red' }
  else if (signal === 'cows') msg = { icon: '🐄', title: 'Cattle crossing', text: 'Wait for them, or press H to honk', tone: 'amber' }
  else if (signal === 'go') msg = { icon: '🟢', title: 'Green light — go!', text: 'Thanks for driving safely', tone: 'green' }
  else if (laneTip) msg = { icon: '🪙', title: 'Grab the coins', text: '← → or A / D to switch lanes · swipe on phones', tone: 'info' }
  if (msg) last.current = msg
  const shown = msg ?? last.current
  return (
    <div className={`toast ${msg ? 'is-active' : ''} toast--${shown?.tone ?? 'info'}`} role="status" aria-live="polite">
      {shown && (
        <>
          <span className="toast__icon" aria-hidden>
            {shown.icon}
          </span>
          <span>
            <strong>{shown.title}</strong>
            <span className="toast__text">{shown.text}</span>
          </span>
        </>
      )}
    </div>
  )
}

export function FadeOverlay() {
  const fade = useStore(ui, (s) => s.fade)
  return <div className={`fade ${fade ? 'is-active' : ''}`} aria-hidden />
}
