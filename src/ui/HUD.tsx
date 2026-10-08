import { useEffect, useRef } from 'react'
import { profile, vehicleNames, zones } from '../data/portfolio'
import { COINS, live, zoneStartProgress } from '../lib/journey'
import { fastTravel } from '../lib/game'
import { unlockAudio } from '../lib/sfx'
import { settings, ui, useStore } from '../lib/store'
import { Icon, ZoneIcon } from './icons'

/** Fast travel: fade out, jump, fade in */
export const travelTo = fastTravel

function useFrameLoop(cb: () => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    let id = 0
    const loop = () => {
      ref.current()
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}

function PlayerCard() {
  const bar = useRef<HTMLDivElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  useFrameLoop(() => {
    const p = Math.round(live.progress * 100)
    if (bar.current) bar.current.style.transform = `scaleX(${live.progress})`
    if (pct.current) pct.current.textContent = `${p}%`
  })
  return (
    <div className="hud-card player">
      <img src={profile.photo} alt="" className="player__avatar" />
      <div className="player__meta">
        <div className="player__name">{profile.name}</div>
        <div className="player__lvl">
          <span>LV 2 · Frontend Dev</span>
          <span ref={pct} className="mono">
            0%
          </span>
        </div>
        <div className="xp">
          <div ref={bar} className="xp__fill" />
        </div>
      </div>
    </div>
  )
}

function TopRight() {
  const coins = useStore(ui, (s) => s.coins)
  const quality = useStore(settings, (s) => s.quality)
  const sound = useStore(settings, (s) => s.sound)
  return (
    <div className="hud-right">
      <button
        className="hud-card hud-btn hud-icon"
        onClick={() => {
          unlockAudio()
          settings.set({ sound: !sound })
        }}
        title={sound ? 'Mute sound' : 'Turn sound on'}
        aria-label={sound ? 'Mute sound' : 'Turn sound on'}
        aria-pressed={sound}
      >
        <Icon name={sound ? 'sound' : 'mute'} size={16} />
      </button>
      <div className="hud-card coins" title="Coins collected">
        <span className="coin-dot" />
        <span className="mono">
          {coins}
          <small> / {COINS.length}</small>
        </span>
      </div>
      <button
        className="hud-card hud-btn gfx-btn"
        onClick={() => settings.set({ quality: quality === 'high' ? 'low' : 'high' })}
        title="Toggle graphics quality"
      >
        <span className="mono">GFX {quality === 'high' ? 'HD' : 'LITE'}</span>
      </button>
      <a className="hud-card hud-btn" href={profile.resume} target="_blank" rel="noreferrer" title="Download résumé">
        <Icon name="file" size={16} />
        <span>Résumé</span>
      </a>
    </div>
  )
}

function Speedometer() {
  const vehicle = useStore(ui, (s) => s.vehicle)
  const num = useRef<HTMLSpanElement>(null)
  const needle = useRef<SVGLineElement>(null)
  useFrameLoop(() => {
    const kmh = Math.min(999, Math.round(live.speed * 3.6))
    if (num.current) num.current.textContent = String(kmh).padStart(3, '0')
    const a = -120 + Math.min(1, kmh / 220) * 240
    if (needle.current) needle.current.setAttribute('transform', `rotate(${a} 50 52)`)
  })
  return (
    <div className="hud-card speedo">
      <svg viewBox="0 0 100 70" className="speedo__dial" aria-hidden>
        <path d="M14 62 A40 40 0 1 1 86 62" className="speedo__track" />
        <path d="M14 62 A40 40 0 1 1 86 62" className="speedo__ticks" />
        <line ref={needle} x1="50" y1="52" x2="50" y2="20" className="speedo__needle" />
        <circle cx="50" cy="52" r="4" className="speedo__hub" />
      </svg>
      <div className="speedo__read">
        <span ref={num} className="mono speedo__num">
          000
        </span>
        <span className="speedo__unit">km/h</span>
      </div>
      <div className="speedo__vehicle">{vehicleNames[vehicle]}</div>
    </div>
  )
}

function RouteMap() {
  const zone = useStore(ui, (s) => s.zone)
  const fill = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  useFrameLoop(() => {
    const f = Math.min(1, Math.max(0, live.focusU))
    if (fill.current) fill.current.style.transform = `scaleX(${f})`
    if (marker.current) marker.current.style.left = `${f * 100}%`
  })
  return (
    <nav className="hud-card route" aria-label="Fast travel">
      <div className="route__track">
        <div ref={fill} className="route__fill" />
        <div ref={marker} className="route__marker" />
        {zones.map((z, i) => (
          <button
            key={z.id}
            className={`route__node ${i <= zone ? 'is-done' : ''} ${i === zone ? 'is-here' : ''}`}
            style={{ left: `${((i + 0.5) / zones.length) * 100}%`, ['--c' as string]: z.accent }}
            onClick={() => travelTo(zoneStartProgress(i))}
            title={`${z.name} · ${z.section}`}
            aria-label={`Travel to ${z.name}: ${z.section}`}
          >
            <ZoneIcon zone={i} size={15} />
            <span className="route__label">{z.section}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export function HUD() {
  return (
    <div className="hud">
      <PlayerCard />
      <TopRight />
      <Speedometer />
      <RouteMap />
    </div>
  )
}
