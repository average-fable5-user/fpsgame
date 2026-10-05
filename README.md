# FPS, the kinda weird way.

A browser FPS built on [Three.js](https://threejs.org/): a war-torn forest, AI soldiers, drivable T-55 tanks, flyable jets and a B-2 bomber, four game modes and WebSocket multiplayer. Plain HTML/CSS/JS with ES modules from a CDN, no build step.

## Features

- **Modes:** Survival (waves), Team Deathmatch, Capture the Flag, Domination, plus online TDM / FFA.
- **Weapons:** AK-74, AWM (live scope), AR-15 (red dot), Desert Eagle, Glock 17. All have animated first-person hands and sights that stay exactly on centre while aiming.
- **Vehicles:**
  - **T-55A tanks:** rotating turret aimed with the mouse, 125 mm cannon, run-over damage.
  - **Jets:** mouse-aim flight, cannon and bombs.
  - **B-2 Spirit:** carpet bombing.
- **AI:** three difficulty levels, team play and objectives.
- **Customisation:** crosshair editor, career and XP, settings saved locally.

## Controls

| Action | Key |
| --- | --- |
| Move / sprint / crouch / jump | WASD / Shift / C (or Ctrl, see settings) / Space |
| Fire / aim | Left mouse / right mouse |
| Reload / switch weapon | R / 1, 2 or mouse wheel |
| Enter / exit tank, jet or B-2 | F (team modes and multiplayer; tanks in every mode) |
| Scoreboard / pause | Tab / Esc |

**Tank:** W/S drive, A/D steer, Shift faster. The turret aims at the screen centre. Left mouse fires, right mouse zooms.

**Jets and B-2:** W/S throttle, Shift afterburner. Point the mouse where you want to fly and A/D turn. Left mouse fires the cannon (B-2: carpet bomb) and right mouse drops a bomb.

## Run locally

Browsers block `.glb` files on `file://`, so serve the folder over HTTP:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>. On Windows you can double-click `start.bat` instead.

## Deploy

The project has two parts:

| Part | What | Where |
| --- | --- | --- |
| Game client | Everything in the repo root (static files) | Vercel |
| Multiplayer relay | `server/` (Cloudflare Worker + Durable Object) | Cloudflare |

### 1. Game on Vercel (via GitHub)

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Set **Framework Preset** to *Other*. Leave the build command empty and the output directory as the root.
4. Deploy. `vercel.json` sets caching headers for the models, and `.vercelignore` keeps the server and dev files out of the site.

Every push to `main` redeploys automatically.

### 2. Multiplayer relay on Cloudflare

```bash
cd server
npx wrangler login
npx wrangler deploy
```

This prints a URL like `https://<name>.<account>.workers.dev`. Put it in `config.js` as `wss://<name>.<account>.workers.dev`. That makes it the default server for everyone; players can still change it in the MULTIPLAYER tab.

`server/wrangler.toml` uses an SQLite-backed Durable Object, which works on the free Workers plan.

## Project layout

```
index.html        lobby + HUD markup
style.css         UI
config.js         runtime config (multiplayer server URL)
core.js           engine: renderer, terrain, collision, particles, audio, world, aircraft ambience
game.js           gameplay: weapons, AI, modes, vehicles, HUD, multiplayer client
*.glb             models (forest, weapons + arms, soldier, T-55A)
server/           Cloudflare Worker relay (worker.js, wrangler.toml)
viewer.html       dev tool: inspect a .glb and its animation (not deployed)
```
