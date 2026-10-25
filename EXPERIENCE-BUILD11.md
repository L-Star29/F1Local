# Build 11 — predictable turn-in and staged setup

The Formula car previously built steering input quickly and retained a large high-speed steering allowance. A held key produced an early yaw-rate overshoot, followed by heavily saturated front tyres. That can feel sharp at entry while failing to tighten the actual path.

Keyboard steering buildup is now 3.6 units/second, with quick release and a separate reversal rate. The high-speed steering offset is 0.032 radians instead of 0.042. Front tyre capacity is 0.98 of the base model instead of 0.95; rear stability, ABS, TC and gearless automatic propulsion remain in place. This is input shaping and tyre-force tuning, not an autonomous steering aid. Both the client and server import the same physics file.

Constant-speed test-bench results (speed constrained only by the test):

| Speed | Previous yaw-rate overshoot | Current overshoot | Previous lateral acceleration | Current lateral acceleration |
| --- | --- | --- | --- | --- |
| 108 km/h | 11.5% | 8.5% | 1.96 g | 1.98 g |
| 180 km/h | 25.3% | 16.5% | 2.63 g | 2.64 g |
| 252 km/h | 34.0% | 20.2% | 3.61 g | 3.60 g |

These are internal model diagnostics, not measurements of F1 25 or a claim of equivalent physics. Human driving feedback is still needed, especially at Copse and Maggots/Becketts.

Setup now follows Circuit → Session → Garage → Drive. Practice is unlimited. Solo Race has a three-second standing-start countdown, 1/3/5-lap distance, elapsed time, invalid-lap count and a result/restart action. Solo sessions pause with the menu. There are no AI opponents. Private Race retains the existing two-driver Silverstone lobby, ready/start and server-controlled race. Car/team and camera selection occur in the garage after session choices. Only supported settings are shown.

Validation: handling, keyboard input, repeated transitions, ABS/combined grip, surface feedback, circuit audit, digital-lap diagnostics, network motion, multiplayer server integration, and new session/turn-in tests pass. The Silverstone digital-input diagnostic completes without leaving the conservative road width. Browser checks cover staged navigation, solo countdown/acceleration/pause and private-room creation. The publish check validates 45 files, five cars and eight active circuits.

Deploy both GitHub Pages and the Render server from the same revision. New browser modules `setup-flow.js` and `solo-session.js` are included in the Pages build and server file allowlist. Local updates are not automatically deployed.
