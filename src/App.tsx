import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { installControls } from './lib/game'
import { settings, ui, useStore } from './lib/store'
import { Scene } from './three/Scene'
import { HUD } from './ui/HUD'
import { Controls, FadeOverlay, Toasts } from './ui/Controls'
import { FinalCard, Panels, SwapCard } from './ui/Panels'
import { StartScreen } from './ui/StartScreen'
import { zones } from './data/portfolio'

function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const fonts = document.fonts
    const load = Promise.all([fonts.load('64px Bungee'), fonts.load('600 32px Outfit'), fonts.load('500 32px Outfit')])
    const timeout = new Promise((r) => setTimeout(r, 2500))
    Promise.race([load, timeout]).finally(() => setReady(true))
  }, [])
  return ready
}

export default function App() {
  const fontsReady = useFontsReady()
  const [sceneReady, setSceneReady] = useState(false)
  const quality = useStore(settings, (s) => s.quality)
  const started = useStore(settings, (s) => s.started)
  const zone = useStore(ui, (s) => s.zone)
  const onReady = useCallback(() => setSceneReady(true), [])

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse || (navigator.hardwareConcurrency ?? 8) <= 4) settings.set({ quality: 'low' })
    return installControls()
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--zone', zones[zone].accent)
  }, [zone])

  return (
    <>
      <div className="stage">
        {fontsReady && (
          <Canvas
            shadows={quality === 'high'}
            dpr={quality === 'high' ? [1, 1.75] : [0.75, 1.25]}
            camera={{ fov: 50, near: 0.1, far: 1800, position: [0, 4, 12] }}
            gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <Scene onReady={onReady} />
            </Suspense>
          </Canvas>
        )}
      </div>
      <div className={`ui ${started ? 'is-started' : ''}`}>
        <HUD />
        <Panels />
        <SwapCard />
        <FinalCard />
        <Controls />
        <Toasts />
      </div>
      <StartScreen ready={sceneReady} />
      <FadeOverlay />
    </>
  )
}
