import { useEffect } from 'react'
import { profile, zones } from '../data/portfolio'
import { unlockAudio } from '../lib/sfx'
import { settings, useStore } from '../lib/store'
import { ZoneIcon } from './icons'

export function StartScreen({ ready }: { ready: boolean }) {
  const started = useStore(settings, (s) => s.started)

  useEffect(() => {
    if (started) return
    const onScroll = () => {
      if (ready && window.scrollY > 40) settings.set({ started: true })
    }
    const onKey = (e: KeyboardEvent) => {
      if (ready && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) settings.set({ started: true })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [ready, started])

  return (
    <div className={`start ${started ? 'is-hidden' : ''}`} aria-hidden={started}>
      <div className="start__road" aria-hidden />
      <div className="start__inner">
        <p className="eyebrow">A scroll-driven 3D portfolio</p>
        <h1 className="start__title">
          {profile.name.split(' ')[0]}
          <span>&apos;s Road Trip</span>
        </h1>
        <p className="start__role">
          {profile.role} · {profile.tagline}
        </p>
        <ul className="start__zones" aria-label="Zones">
          {zones.map((z, i) => (
            <li key={z.id} style={{ ['--c' as string]: z.accent }} title={z.name}>
              <ZoneIcon zone={i} size={16} />
            </li>
          ))}
        </ul>
        <button
          className="btn btn--primary btn--big"
          disabled={!ready}
          onClick={() => {
            unlockAudio()
            settings.set({ started: true, sound: true })
          }}
        >
          {ready ? 'Start the engine' : 'Building the world…'}
        </button>
        <p className="start__hint">
          Scroll to drive · <kbd>←</kbd> <kbd>→</kbd> switch lanes for coins · <kbd>H</kbd> horn
          <br />
          Stop at red lights · swap vehicles at every zone gate
        </p>
      </div>
    </div>
  )
}
