import type { ReactNode } from 'react'
import { certifications, education, experience, profile, projects, skills, vehicleNames, zones } from '../data/portfolio'
import { COINS, zoneStartProgress } from '../lib/journey'
import { ui, useStore } from '../lib/store'
import { travelTo } from './HUD'
import { Icon, ZoneIcon } from './icons'

function Panel({ zone, children, wide }: { zone: number; children: ReactNode; wide?: boolean }) {
  const active = useStore(ui, (s) => s.kind === 'drive' && s.zone === zone)
  const z = zones[zone]
  return (
    <section
      className={`panel ${active ? 'is-active' : ''} ${wide ? 'panel--wide' : ''}`}
      style={{ ['--accent' as string]: z.accent }}
      aria-hidden={!active}
      id={`zone-${z.id}`}
    >
      <div className="panel__chip">
        <ZoneIcon zone={zone} size={14} />
        <span>
          Zone 0{zone + 1} / 0{zones.length} · {z.name}
        </span>
      </div>
      {children}
    </section>
  )
}

function ContactLinks({ compact }: { compact?: boolean }) {
  return (
    <ul className={`contact ${compact ? 'contact--compact' : ''}`}>
      <li>
        <a href={`mailto:${profile.email}`}>
          <Icon name="mail" />
          <span>{profile.email}</span>
        </a>
      </li>
      <li>
        <a href={profile.phoneHref}>
          <Icon name="phone" />
          <span>{profile.phone}</span>
        </a>
      </li>
      <li>
        <a href={profile.linkedin} target="_blank" rel="noreferrer">
          <Icon name="linkedin" />
          <span>{profile.linkedinLabel}</span>
        </a>
      </li>
      <li>
        <a href={profile.github} target="_blank" rel="noreferrer">
          <Icon name="github" />
          <span>{profile.githubLabel}</span>
        </a>
      </li>
    </ul>
  )
}

function Hero() {
  return (
    <Panel zone={0}>
      <div className="hero">
        <div className="hero__avatar">
          <img src={profile.photo} alt="Portrait of Azhagar M" />
        </div>
        <div>
          <p className="eyebrow">Player 1 · Ready</p>
          <h1 className="hero__name">{profile.name}</h1>
          <p className="hero__role">{profile.role}</p>
        </div>
      </div>
      <p className="lead">
        I build fast, polished web and mobile apps with <strong>React.js</strong>, <strong>Next.js</strong>, <strong>TypeScript</strong> and{' '}
        <strong>React Native</strong>. Hop in — this portfolio is a road trip.
      </p>
      <div className="actions">
        <a className="btn btn--primary" href={profile.resume} download="Azhagar_M_Frontend_Developer.pdf">
          <Icon name="file" size={16} /> Résumé
        </a>
        <button className="btn" onClick={() => travelTo(zoneStartProgress(6))}>
          <Icon name="mail" size={16} /> Contact
        </button>
      </div>
      <div className="scroll-hint">
        <span className="scroll-hint__mouse" />
        <span>
          Scroll ↓ or <kbd>↑</kbd> to drive · <kbd>↓</kbd> reverse · <kbd>←</kbd> <kbd>→</kbd> lanes
        </span>
      </div>
    </Panel>
  )
}

function About() {
  return (
    <Panel zone={1}>
      <h2 className="panel__title">About me</h2>
      <p className="lead">{profile.summary}</p>
      <div className="stats">
        {profile.stats.map((s) => (
          <div key={s.label} className="stat">
            <span className="stat__value">{s.value}</span>
            <span className="stat__label">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="muted">Based in India · BCA graduate · Meta-certified in Advanced React</p>
    </Panel>
  )
}

function Skills() {
  return (
    <Panel zone={2}>
      <h2 className="panel__title">Skill tree</h2>
      <div className="skills">
        {skills.map((g) => (
          <div key={g.group} className="skills__group">
            <h3>{g.group}</h3>
            <ul className="chips">
              {g.items.map((s) => (
                <li key={s} className="chip">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Experience() {
  return (
    <Panel zone={3}>
      <h2 className="panel__title">Experience</h2>
      <div className="job">
        <div>
          <h3 className="job__role">{experience.role}</h3>
          <p className="job__company">{experience.company}</p>
        </div>
        <span className="badge">{experience.period}</span>
      </div>
      <ul className="bullets">
        {experience.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Panel>
  )
}

function Projects() {
  const index = useStore(ui, (s) => s.project)
  return (
    <Panel zone={4}>
      <h2 className="panel__title">Projects</h2>
      <div className="projects">
        {projects.map((p, i) => (
          <article
            key={p.name}
            className={`project ${i === index ? 'is-current' : ''}`}
            style={{ ['--pc' as string]: p.color }}
            aria-hidden={i !== index}
          >
            <p className="eyebrow">
              Island 0{i + 1} · {p.kind}
            </p>
            <h3 className="project__name">{p.name}</h3>
            <ul className="chips">
              {p.stack.map((s) => (
                <li key={s} className="chip">
                  {s}
                </li>
              ))}
            </ul>
            <ul className="bullets">
              {p.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="dots" aria-hidden>
        {projects.map((p, i) => (
          <span key={p.name} className={i === index ? 'is-on' : ''} />
        ))}
      </div>
    </Panel>
  )
}

function Education() {
  const cert = certifications[0]
  return (
    <Panel zone={5}>
      <h2 className="panel__title">Trophies</h2>
      <div className="trophies">
        <div className="trophy">
          <span className="trophy__icon">🎓</span>
          <div>
            <p className="eyebrow">Education · {education.year}</p>
            <h3>{education.degree}</h3>
            <p className="muted">
              {education.school} · Score <strong>{education.score}</strong>
            </p>
          </div>
        </div>
        <div className="trophy">
          <span className="trophy__icon">🏆</span>
          <div>
            <p className="eyebrow">Certification · {cert.date}</p>
            <h3>{cert.name}</h3>
            <p className="muted">{cert.issuer}</p>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Contact() {
  return (
    <Panel zone={6}>
      <h2 className="panel__title">Mission control</h2>
      <p className="lead">
        Got an idea, a product or a team that needs a frontend builder for web or mobile? Let&apos;s talk.
      </p>
      <ContactLinks />
      <div className="actions">
        <a className="btn btn--primary" href={`mailto:${profile.email}`}>
          <Icon name="mail" size={16} /> Email me
        </a>
        <a className="btn" href={profile.resume} download="Azhagar_M_Frontend_Developer.pdf">
          <Icon name="file" size={16} /> Résumé
        </a>
      </div>
      <p className="muted launch-hint">Keep scrolling to board the rocket 🚀</p>
    </Panel>
  )
}

export function Panels() {
  return (
    <main className="panels">
      <Hero />
      <About />
      <Skills />
      <Experience />
      <Projects />
      <Education />
      <Contact />
    </main>
  )
}

/** "Now entering" card that plays during each vehicle swap */
export function SwapCard() {
  const kind = useStore(ui, (s) => s.kind)
  const zone = useStore(ui, (s) => s.zone)
  const next = useStore(ui, (s) => s.nextVehicle)
  const countdown = useStore(ui, (s) => s.countdown)
  const show = kind === 'swap'
  const rocket = next === 7
  const z = zones[zone]
  return (
    <div className={`swap ${rocket ? 'swap--rocket' : ''} ${show ? 'is-active' : ''}`} style={{ ['--accent' as string]: z.accent }} aria-live="polite">
      {rocket ? (
        <>
          <p className="swap__kicker">
            <Icon name="swap" size={14} /> Boarding Rocket AZ-1
          </p>
          <div className="swap__count mono">T-{String(countdown).padStart(2, '0')}</div>
          <p className="swap__sub">Keep scrolling for liftoff</p>
        </>
      ) : (
        <>
          <p className="swap__kicker">
            <Icon name="swap" size={14} /> Vehicle swap
          </p>
          <h2 className="swap__title">
            <span className="swap__zone">Zone 0{zone + 1}</span>
            {z.name}
          </h2>
          <p className="swap__sub">
            {vehicleNames[next - 1]} <span className="swap__arrow">→</span> <strong>{vehicleNames[next]}</strong>
          </p>
          <p className="swap__blurb">{z.blurb}</p>
        </>
      )}
    </div>
  )
}

export function FinalCard() {
  const done = useStore(ui, (s) => s.launchDone)
  const coins = useStore(ui, (s) => s.coins)
  const liftoff = useStore(ui, (s) => s.kind === 'launch' && !s.launchDone)
  return (
    <>
      <div className={`liftoff ${liftoff ? 'is-active' : ''}`} aria-hidden>
        LIFTOFF!
      </div>
      <section className={`final ${done ? 'is-active' : ''}`} aria-hidden={!done}>
        <p className="eyebrow">Mission complete</p>
        <h2 className="final__title">Thanks for riding along!</h2>
        <p className="lead">
          You crossed 7 zones, drove 8 vehicles and collected{' '}
          <strong>
            {coins}/{COINS.length}
          </strong>{' '}
          coins. Now let&apos;s build something together.
        </p>
        <ContactLinks compact />
        <div className="actions actions--center">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>
            <Icon name="mail" size={16} /> Say hello
          </a>
          <a className="btn" href={profile.resume} download="Azhagar_M_Frontend_Developer.pdf">
            <Icon name="file" size={16} /> Résumé
          </a>
          <button className="btn" onClick={() => travelTo(0)}>
            <Icon name="replay" size={16} /> Ride again
          </button>
        </div>
      </section>
    </>
  )
}
