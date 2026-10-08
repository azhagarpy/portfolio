# Azhagar's Road Trip — 3D portfolio

A scroll-driven, game-like 3D portfolio. Scrolling drives a vehicle down one long road through seven zones. At every zone gate the character gets out and switches to a vehicle that suits the next zone.

| Zone | Section | Vehicle |
| --- | --- | --- |
| Hometown | Hello | Auto rickshaw |
| Whispering Forest | About me | Trail jeep 4×4 |
| Skyline City | Skills | Roadster EV |
| Neon District | Experience | Neon hoverbike |
| Ocean Bridge | Projects | Seaplane |
| Frostbite Peaks | Education & certification | Snowmobile |
| Launch Site | Contact | Mars rover → rocket |

Built with React 19, TypeScript, Vite, Three.js, React Three Fiber and postprocessing. Every model is made from code, with no 3D asset files.

## How to play

| Action | Mouse / keyboard | Phone |
| --- | --- | --- |
| Drive forward | Scroll down, hold <kbd>↑</kbd> or <kbd>W</kbd>, or hold the ▲ pedal | Drag up, or hold ▲ |
| Reverse | Scroll up, hold <kbd>↓</kbd> or <kbd>S</kbd>, or hold the ▼ pedal | Drag down, or hold ▼ |
| Switch lane to grab coins | <kbd>←</kbd> <kbd>→</kbd>, <kbd>A</kbd> <kbd>D</kbd>, a sideways trackpad swipe, or the ◀ ▶ buttons | Swipe left / right, or ◀ ▶ |
| Honk (hurries the cows along) | <kbd>H</kbd> | Horn button |
| Fast travel | Click a stop on the route map | Tap a stop on the route map |

- The vehicle only moves while you give it input. Let go and it coasts to a stop. Each vehicle has its own top speed.
- At red lights the vehicle brakes and waits behind the stop line while pedestrians cross. In the hometown you wait for a herd of cows instead.
- Each vehicle swap is a short cutscene that plays on its own. You hop out with a spin, wave, sprint to the next vehicle under its marker and front-flip into the seat.
- Sound effects and an engine hum are made in the browser. "Start the engine" turns them on, and the speaker button mutes them.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Deploy to Vercel by importing the repo. It detects Vite on its own: build command `npm run build`, output folder `dist`.

## Make it yours

- **Content**: all text comes from `src/data/portfolio.ts` (profile, skills, experience, projects, education, zone names).
- **Résumé**: `public/Azhagar_M_Frontend_Developer.pdf`. Replace the file to update it; every "Résumé" button downloads it.
- **Photo**: `public/azhagar.png`.

## How it works

- `src/lib/game.ts` is the game layer. It turns wheel, key, touch and pedal input into speed (with acceleration, braking and a top speed per vehicle), plays the swap cutscenes, handles lanes and coin pickup, runs the traffic lights and crossings, and does fast travel.
- `src/lib/journey.ts` is the engine. It builds the road curve and splits the journey into steps (drive, swap, drive, … then launch). From the current journey position it works out where every vehicle is, the character's moves between vehicles, and the camera.
- `src/three/zones/*` holds one file per zone. Props are instanced and each zone is hidden when you are far from it.
- `src/three/Atmosphere.tsx` blends the sky, fog and lighting between per-zone presets, then fades into space during the launch.
- `src/ui/*` contains the HUD (player card, coins, speedometer, fast-travel minimap), the section panels, the swap cards and the start and finish screens.
- **GFX HD / LITE** in the HUD turns bloom and shadows on or off. LITE is the default on touch devices and low-core machines.
