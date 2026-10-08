import { useEffect } from 'react'
import { Atmosphere } from './Atmosphere'
import { Character } from './Character'
import { CameraRig, Coins, Effects, JourneyController, Snowfall } from './Core'
import { Crossings } from './Crossings'
import { Road } from './Road'
import { SwapFX } from './SwapFX'
import { Terrain } from './Terrain'
import { Vehicles } from './Vehicles'
import { City } from './zones/City'
import { Forest } from './zones/Forest'
import { Home } from './zones/Home'
import { Launch } from './zones/Launch'
import { Neon } from './zones/Neon'
import { Ocean } from './zones/Ocean'
import { Snow } from './zones/Snow'

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady))
    return () => cancelAnimationFrame(id)
  }, [onReady])
  return null
}

export function Scene({ onReady }: { onReady: () => void }) {
  return (
    <>
      <JourneyController />
      <CameraRig />
      <Atmosphere />
      <Terrain />
      <Road />
      <Home />
      <Forest />
      <City />
      <Neon />
      <Ocean />
      <Snow />
      <Launch />
      <Vehicles />
      <Character />
      <Crossings />
      <SwapFX />
      <Coins />
      <Snowfall />
      <Effects />
      <Ready onReady={onReady} />
    </>
  )
}
