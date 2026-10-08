import { useSyncExternalStore } from 'react'

export function createStore<T extends object>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(patch: Partial<T>) {
      let changed = false
      for (const k in patch) {
        if (!Object.is(state[k], patch[k])) {
          changed = true
          break
        }
      }
      if (!changed) return
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

type Store<T> = ReturnType<typeof createStore<T & object>>

export function useStore<T extends object, S>(store: Store<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  )
}

export type StepKind = 'drive' | 'swap' | 'launch'
export type SignalState = 'none' | 'stop' | 'cows' | 'go'
export type TipState = 'none' | 'drive' | 'lane'

/** Discrete journey state for the DOM UI (updated only when something changes) */
export const ui = createStore({
  stepIndex: 0,
  kind: 'drive' as StepKind,
  zone: 0,
  vehicle: 0,
  nextVehicle: 1,
  project: 0,
  countdown: 10,
  launchDone: false,
  coins: 0,
  signal: 'none' as SignalState,
  lane: 0,
  tip: 'none' as TipState,
  fade: false,
})

export const settings = createStore({
  quality: 'high' as 'high' | 'low',
  started: false,
  sound: false,
})
