# 1. What the 3DS version has, in the browser

> Status: building · Author's approval: proposal ☑ plan ☑

## Why

The Nintendo 3DS client (ships3D-3ds) grew a few things the browser doesn't have: sound, a world's
edge that feels like a force field, a copilot who turns you back, a hangar to choose your ship in,
and more feedback when you're hit. Jon wants them in the browser too, so both clients feel like
the same game.

## What

| Id | Requirement | Check |
|---|---|---|
| R1 | **Sound**: chiptune effects (your shots and others', hits, explosions, the force field, menu clicks), a looping track and the engine's hum, which rises with the speed. Made in code with the Web Audio API, no files. Volumes for effects and music, remembered; off until the first click, as browsers ask | Heard in the game; test: each sound's samples stay within range and the music never ends |
| R2 | **The force field**: as the ship nears the world's edge, the nearest face of the edge's grid fills in, more opaque the nearer, never wholly | Seen flying to the edge; test: nearness is 0 inside the warning band and 1 on the edge |
| R3 | **Crashing into the edge**: the struck face flashes, a blue shock wave spreads across the field, sparks fly and the camera shakes | Seen running into the edge |
| R4 | **The camera draws back** near the edge, showing that something is wrong | Seen flying to the edge |
| R5 | **The copilot**: a little robot warns "We're leaving the combat arena", and if you keep heading out it takes the helm and turns you back toward the middle, softly, your controls and guns set aside until you face inward (as Wind Waker does) | Played; tests: heading out near the edge turns the ship back; heading in leaves the controls alone |
| R6 | **Being hit**: the screen's edge flashes red and the camera shakes a little | Seen when hit |
| R7 | **The hangar**: before playing, your ships turn one at a time on a platform floating in space, with sweeping spotlights; arrows, the keyboard or a swipe go through them, and Play flies the one shown. The ship list stays for those who prefer it | Played on a computer and a phone |
| R8 | Everything in English, Spanish and Basque, as the rest of the site | The three languages checked |
| R9 | No new dependencies, and the game's frame rate on a phone stays where it is | `package.json` unchanged; the frame time compared before and after on a phone |

## Out of scope

- The 3DS's own things: the two screens, stereoscopic 3D, the pixel-art menus, the C-stick.
- Changes to the server: everything here is in the browser. The turn back is the client's own,
  as the 3DS does it; the server already holds the ship inside the world.
- The assault mode's own screens, which the 3DS doesn't have.

## Design

Each feature is a module of `src/game/`, kept out of `Game.ts` (already ~1000 lines), tested with
Vitest where it has logic:

| Module | Holds | Comes from (3DS) |
|---|---|---|
| `sound.ts` | A Web Audio context, the effects as short buffers made once, the music and the engine as small streams (an `AudioWorklet`, or a `ScriptProcessor` fallback) | `chiptune` |
| `edge.ts` | Nearness to the edge, the nearest face, the force field's mesh, the shock wave and the flash | `game.EdgeNearness`, `forcefield.go`, `shockwave.go`, `crash.go` |
| `autopilot.ts` | When to take the helm and how to steer back: pure, on the flight model's state | `game.steerHome` |
| `copilot.ts` | The robot's speech bubble in the HUD | `hud.go` |
| `shake.ts` | The camera's shake after a crash or a hit, fading | `impact` |
| `views/HangarView.vue` + `game/hangar.ts` | The turntable scene in three.js | `hangar.go`, `preview.go` |

The flight model is the same as the 3DS's (both copy the server's), so the autopilot's steering
and the edge's numbers carry over as they are. The look follows the site's, not the 3DS's pixel
art: the copilot is drawn in SVG in the same spirit.

Alternatives not taken: sound files (they'd need making and licensing, and the 3DS's are already
made in code); a shared library between the clients (they're in different languages).

## Tasks

Each task leaves the game working, and is one commit with its tests and its words in the three
languages.

- [ ] T1 — nearness to the edge and the nearest face of its grid, pure · `game/edge.ts` · R2 · tests: `nearness is 0 inside the band and 1 on the edge`, `the nearest face is the one under the ship`
- [ ] T2 — the force field: the nearest face filled in, as opaque as the ship is near · `game/edge.ts`, `game/world.ts` · R2 · seen flying to the edge
- [ ] T3 — the camera draws back near the edge · `game/Game.ts` (`updateCamera`) · R4 · seen
- [ ] T4 — the autopilot: when to take the helm, how to steer back, when to give it back; controls and guns set aside meanwhile · `game/autopilot.ts`, `game/Game.ts` · R5 · tests: `heading out near the edge turns the ship back`, `heading in leaves the controls alone`
- [ ] T5 — the copilot: a robot in SVG with a speech bubble, warning near the edge and while it steers · `game/copilot.ts`, `game/hud.ts`, `game/game.css`, `i18n/*` · R5, R8 · seen in the three languages
- [ ] T6 — the camera's shake, fading, after a crash into the edge or a hit · `game/shake.ts`, `game/Game.ts` · R3, R6 · test: `the shake fades to nothing`
- [ ] T7 — crashing into the edge: the struck face flashes, the shock wave spreads, sparks · `game/edge.ts`, `game/effects.ts` · R3 · test: `the wave spreads fast then slows`; seen
- [ ] T8 — a hit flashes the screen's edge red · `game/hud.ts`, `game/game.css` · R6 · seen
- [ ] T9 — sound: the effects made in code with Web Audio, played on shots, hits, explosions, the force field and menu clicks; volumes for effects and music in the Play page, remembered · `game/sound.ts`, `game/Game.ts`, `views/GameView.vue`, `i18n/*` · R1, R8 · tests: `every sound stays within range and ends`
- [ ] T10 — the music and the engine's hum, which follows the speed · `game/sound.ts` · R1 · tests: `the music never ends`, `the engine hums louder at full throttle`
- [ ] T11 — the hangar: your ships turning on a floating platform with spotlights; arrows, keys and swipes; Play flies the one shown; the list stays a click away · `views/GameView.vue`, `game/hangar.ts`, `i18n/*` · R7, R8 · seen on a computer and a phone
- [ ] T12 — the frame time on a phone, before and after; CHANGES.md and version 0.7.0 · R9 · numbers written here

## Result

Not started.
