# 1. What the 3DS version has, in the browser

> Status: proposed · Author's approval: proposal ☐ plan ☐

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

To be planned once the proposal is approved.

## Result

Not started.
