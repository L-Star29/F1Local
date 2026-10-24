# Formula / Local

Browser racing prototype with solo practice and private two-driver Silverstone races. Run `node server.mjs` or double-click `Start Game.cmd`, then open http://127.0.0.1:4173. No account or remote hosting.

## Race build 09

Private rooms now include team selection, readiness, countdown, live standings, 1/3/5-lap races, recovery/track-limit penalties, results and rematches. See [MULTIPLAYER-BUILD09.md](MULTIPLAYER-BUILD09.md) for same-network setup and rules. Austria is temporarily hidden because its imported surface is not yet reliable; the model is preserved. There are eight selectable practice circuits.

## Circuit build 08

Austria's asphalt is now correctly treated as road instead of a barrier. Added slope-aware barrier filtering, imported-surface driving checks for Silverstone/Austria/Imola, tyre scrub audio, a smoother synthesized engine tone, and visible ABS/TC intervention feedback. Vehicle tuning remains at build 07.1. See [CIRCUIT-BUILD08.md](CIRCUIT-BUILD08.md) for findings and accuracy limits.

Build 07 adds Formula ABS for braking while turning, a smoother keyboard brake release, a little more steering range, revised T-cam framing, immediate chase-camera heading, and four track-limit settings. See [HANDLING-BUILD07.md](HANDLING-BUILD07.md) for behaviour and validation.

Formula handling now has steadier rear grip when lifting and braking, more responsive keyboard steering, and smooth acceleration without the previous duplicate force reduction. The chase camera maintains its distance instead of falling behind at speed. See [HANDLING-BUILD06.md](HANDLING-BUILD06.md) for recording analysis, measured comparisons, and validation limits.

- Nine supplied GLB circuits replace the previous five procedural venues: Silverstone, Red Bull Ring, Spa, Imola, Hungaroring, Barcelona, Albert Park, Shanghai, and Sepang. The menu shows each model's year.
- Five revised team GLBs: Ferrari, Red Bull, Mercedes, Audi, Cadillac. Equal performance, individual tyre pivots, front-wheel steering and wheel rotation.
- Road elevation and tyre contact are sampled from imported road triangles. The scenery supplies actual widths, kerbs, buildings and trackside references.
- Progressive keyboard steering and pedals; faster turn-in and release. Gearless automatic acceleration. No steering or braking assistance, racing line, pitstops, or battery management. Forgiving traction control remains.
- Grip changes per tyre, smoothly: 90% grip off the road instead of the previous whole-car 42% cliff. Two wheels off do not invalidate a lap; four wheels off do.

## Controls

| Action | Keyboard |
|---|---|
| Accelerate | W / Up |
| Brake, then reverse after stopping | Hold S / Down |
| Steer | A / D, or Left / Right |
| Recover nearby | R |
| Reset session at starting point | R twice within 450 ms |
| Camera | C |
| Pause | Esc |
| Manual gears | Q / E |
| Rally handbrake | Space |
| Mute | M |

Standard-mapped gamepads use left stick steering and triggers for pedals, with analog input preserved. Nintendo mapping depends on the browser; physical controller testing is still outstanding.

## Verification and limits

Run `node tests.mjs`, `node handling-tests.mjs` and `node keyboard-model-tests.mjs` (or `npm test` when npm is available) for legacy physics regression tests and the current keyboard/model-surface suite. `node model-tests.mjs` additionally requires the local server; it checks all five cars' wheel pivots (with image decoding stubbed). The browser was used to load all nine circuits, drive all five cars briefly, and check reverse and double-tap reset. This is not a full manual lap validation of every circuit.

This remains an original simcade model, not EA's physics. It uses a planar rigid body, four tyre-force calculations, load transfer and speed-dependent downforce. Suspension, tyre slip ratio, kerb impacts, damage and detailed terrain response are simplified. Reverse uses a low-speed kinematic model. Mild off-road grip is an intentional accessibility choice. Road routes and barriers are adapted from the supplied models, not certified surveyed racing data. Model loading can take a few seconds; the track files are large. Sector timing uses thirds of the lap.

Run `node transition-tests.mjs` and `node digital-lap-test.mjs` for the new lift/brake stability, camera, repeated keyboard-input, and conservative Silverstone lap checks. These are also included in `npm test`.

See KEYBOARD-AND-MODELS.md for research and implementation notes. Earlier RESEARCH.md and HANDLING.md describe previous iterations.

## Credits

Models supplied by the user from Dave Love SketchFab / Tyler_Dave; source links and embedded license information are in credits.html. The revised car exports include the user's separated tyre pivots. Three.js r170 and GLTFLoader: MIT. Geographic route data: Tomislav Bacinger's f1-circuits, MIT (data/LICENSE.md). This project is unofficial and is not affiliated with Formula One, EA, ApexDrawn, or the teams.

Austria is temporarily removed from selection after reports of bumpy road contact and falling through off-track terrain. Its files are retained for repair; earlier centre-lane tests did not validate those conditions. Eight circuits remain selectable.
