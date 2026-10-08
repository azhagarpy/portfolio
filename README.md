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

| Action | Keyboard | Phone |
| --- | --- | --- |
| Drive forward / back | Scroll, <kbd>Space</kbd>, <kbd>↓</kbd> | Swipe up / down |
| Switch lane to grab coins | <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> | Swipe left / right, or the ◀ ▶ buttons |
| Honk (hurries the cows along) | <kbd>H</kbd> | Horn button |
| Fast travel | Click a stop on the route map | Tap a stop on the route map |

- Each vehicle has its own top speed, so fast scrolling never makes it fly off.
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
- **Résumé**: put your PDF at `public/Azhagar_M_Frontend_Developer.pdf`. Every "Résumé" button links to it.
- **Photo**: `public/azhagar.png`.

## How it works

- `src/lib/game.ts` is the game layer. It caps speed, auto-plays the cutscenes, handles lanes and coin pickup, runs the traffic-light and crossing states, and does fast travel.
- `src/lib/journey.ts` is the engine. It builds the road curve and splits scroll progress into steps (drive, swap, drive, … then launch). From the smoothed scroll value alone it works out the position of every vehicle, the character's walk between vehicles, the camera and the coins. That is why scrolling backwards rewinds everything.
- `src/three/zones/*` holds one file per zone. Props are instanced and each zone is hidden when you are far from it.
- `src/three/Atmosphere.tsx` blends the sky, fog and lighting between per-zone presets, then fades into space during the launch.
- `src/ui/*` contains the HUD (player card, coins, speedometer, fast-travel minimap), the section panels, the swap cards and the start and finish screens.
- **GFX HD / LITE** in the HUD turns bloom and shadows on or off. LITE is the default on touch devices and low-core machines.
