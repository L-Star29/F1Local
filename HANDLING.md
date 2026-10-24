# Handling build 03 — research, corrections, and verification

## Automatic now has no gear simulation

Per the user's driving preference, Automatic uses a continuous force/power curve: `power / hypot(speed, power / maximumDriveForce)`, multiplied by filtered throttle demand and the available traction limit. Gear ratios, shift interruptions, and rev-limiter cuts do not participate in this mode. Lift-off deceleration is also independent of gears. The dashboard shows **D**; audio pitch rises continuously with speed and does not drive the physics. Explicit Manual mode retains its separate gearbox.

New regression checks confirm that changing the stored gear or shift timer has no effect in Automatic, and that there are zero shift events during a 30-second acceleration run. Five-second sustained-corner tests now use **full throttle and full steering** in Sport mode. At initial speeds of 144, 216, and 288 km/h, maximum body sideslip stays below 1.8°. These controlled tests are not a guarantee against spinning after collisions, off-track driving, or with Unassisted selected.

Current automatic outputs: about 2.76 seconds to 100 km/h, 5.05 seconds to 200 km/h, 9.99 seconds to 300 km/h, and 329 km/h after 45 seconds. The earlier build-02 figures below are historical. Current results are in `handling-report.json`. Best-lap storage is separated again for build 03.

## The original defects

The first build's direction test was wrong. With the camera looking along world +Z and up along +Y, screen-right is world -X. The code called +X right and its test repeated that assumption. The corrected test runs actual keyboard mappings through vehicle motion and projects the result through Three.js cameras facing four different directions. A / left arrow must move left on screen; D / right arrow must move right.

Other problems included excessive steering range at speed, broad tyre-slip behaviour, an abrupt low-speed mode switch, and an engine-force limit that underused available power in high gears. During the rewrite, sustained-turn testing also exposed a traction-control problem: limiting drive force independently at the two rear wheels created an unintended torque-vectoring effect. TC now reduces the shared engine torque to respect the more constrained driven wheel.

## Research used

- [Mercedes: Formula One brake systems](https://www.mercedesamgf1.com/news/formula-one-brake-systems-explained). Downforce makes braking strongly speed-dependent. As speed falls, available grip falls; brake release and balance matter. This motivates separate aerodynamic loading, longitudinal load transfer, and tyre force budgets rather than constant deceleration.
- [MathWorks: three-degree-of-freedom vehicle dynamics](https://au.mathworks.com/help/vdynblks/ref/vehiclebody3dof.html). Local wheel velocities, slip angles, force rotation, yaw moments, and body acceleration must share a consistent coordinate convention. The model implements planar rigid-body motion and sums forces/moments at four contact locations. It does not reproduce the MathWorks block or proprietary code.
- [EA: F1 25 handling revisions](https://forums.ea.com/blog/f1-games-game-info-hub-en/race-your-way---ea-sports%E2%84%A2-f1%C2%AE-25-deep-dive/12111491). Documented priorities include consistent steering response, tyre load/slip behaviour, smooth low-speed torque delivery, and tyre temperature/wear consequences. Those inform the response targets; the publication does not provide a reproducible set of simulation coefficients.
- [Brembo: 2025 Baku](https://www.brembo.com/en/motorsport/formula1/2025/facts-formula1-gp-baku). The published Turn 1 example is 329→119 km/h in 2.12 seconds over 108 metres, peaking at 5 g. This is a useful external braking reference, not a universal specification for every setup or a direct calibration of our flat-road ABS test.

## Current model

Four tyre contact points carry different vertical loads through longitudinal and lateral transfer. Tyre capacity increases less than proportionally with load. A nonlinear lateral-force curve peaks and then loses grip; braking and acceleration use the same finite force budget as cornering. Rear-wheel drive, front/rear aero balance, drag, engine braking, eight ratios, shift interruptions, and a smooth near-stop transition are represented.

The Formula model is tuned for small-slip grip driving. Rally retains lower aero, AWD, a broader sliding response, and a rear handbrake. Formula parameters such as the chosen 800 kg design mass, 735 kW peak power envelope, 3.6 m wheelbase, and roughly 4.3° nominal tyre-curve peak are **authored calibration choices**, not claimed measurements of F1 25 or Pirelli tyres.

Keyboard adaptation is separate from the force model. Digital steering ramps progressively, returns faster, and reverses promptly. **Sport includes a conservative speed-dependent steering range as well as TC and ABS.** It does not aim toward the track, alter the racing line, or directly clamp the vehicle's yaw. Unassisted permits more steering saturation, power-induced grip loss, and brake lock-up. Digital keys cannot reproduce the modulation of analogue pedals and a steering wheel.

## Verification

Run `node tests.mjs`, `node handling-tests.mjs`, and `node circuit-drive-tests.mjs`.

- Actual A/D/arrow mappings are verified against Three.js screen projection at four headings.
- Left/right symmetry, steering release, low-speed transitions, tyre force limits, longitudinal/lateral load transfer, tyre load sensitivity, sliding grip loss, ABS/lock-up, and 60/120/240 Hz convergence are checked.
- Sustained full keyboard steering is tested for five seconds from 36, 72, 144, 216, and 288 km/h in Sport mode. The high-speed case remains below about 2.4° maximum body sideslip; low-speed body sideslip includes normal tight-turn geometry and is not itself a tyre-slip measurement.
- `handling-report.json` records current acceleration and braking outputs. A prior run of this revision measured approximately 2.73 s to 100 km/h, 5.14 s to 200 km/h, 9.83 s to 300 km/h, and 333 km/h after 45 seconds. Use the regenerated report for exact current results.
- The flat-road, full-ABS braking test is approximately 99 m / 1.69 s for 329→119 km/h, with a peak near 4.86 g. It remains faster than Brembo's published corner approach; matching its peak does not establish matching its full braking trace.
- An offline, conservative analogue path follower completes every circuit without leaving the safe road width. Those slow diagnostic laps test traversability, not racing performance, keyboard skill, or F1-equivalent lap times. The diagnostic is never enabled in the game.
- Browser keyboard checks confirmed left/right turning and braking after reloading the updated code.

## What is still approximate

This remains a planar handling model: there is no full suspension travel, vertical wheel contact, measured aero map, tyre carcass model, physical rotating-wheel slip-ratio integration, detailed differential, or force feedback. Longitudinal traction and locking are force-based approximations. Tyre heat and wear are simplified. Track geometry, elevation, collision boundaries and the camera also affect perceived handling. This revision does not improve the graphics or certify a match to F1 25. Exact equivalence would require controlled reference telemetry and repeated driving comparison at matching settings.

Best laps use a new storage key so old physics times are retained but not mixed with the new handling model.
