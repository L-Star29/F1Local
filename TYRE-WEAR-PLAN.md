# Tyre wear and pit strategy implementation plan

Status: design only; no gameplay code changed. Prepared 28 October 2026 from the current project architecture. Numerical examples below are proposed game-design calibration targets, not measured F1 25/Pirelli coefficients. This plan does not use the user's previously recorded personal lap-time notes.

## Recommendation

Use **one shared per-wheel tyre model with two separately calibrated families**: Formula slicks first, then a forgiving Rally family. Preserve the existing driving character of each mode. Do not implement a separate ApexDrawn simulation or claim to reproduce either game's private tyre algorithms. The appropriate combination is Formula-inspired thermal and stint strategy, with accessible browser-game controls and clear feedback.

Start with Formula Soft / Medium / Hard, reversible temperature effects, and permanent wear. Add pit stops only after the wear model is stable and the Silverstone pit route is verified. Keep practice wear optional, time-trial conditions standardized, and short races playable without a mandatory stop. No login is needed.

Tyre wear should create decisions about pace and stint length; it should not be used to hide or compensate for the current AI pace problem. Validate AI racecraft and clean-air speed separately before enabling significant degradation by default.

## Evidence and limits

- Pirelli describes compounds with different grip, durability and operating demands; Formula 1 explains that both cold and overheated tyres lose performance and that softer compounds trade durability for grip. These support distinct compounds and thermal windows, not universal fixed life in laps. [Pirelli compound overview](https://www.pirelli.com/tires/en-us/motorsport/car/formula-1), [Formula 1 glossary](https://www.formula1.com/en/latest/article/f1-glossary-a-e.1MFONigMlQSbSQtpP7YCy2).
- West and Limebeer's research models temperature, dissipated contact power and accumulated wear together, including separate tread and carcass thermal states. It evaluates strategy over multiple laps rather than optimizing one lap alone. This supports a small coupled thermal/wear model for this game; it does not supply validated coefficients for our cars. [University of Pretoria research record](https://repository.up.ac.za/items/574ea0b5-6f6d-4b91-8859-a55942b1cf14).
- Kerbs cannot be treated as uniformly beneficial or uniformly destructive. The FIA's Qatar investigation linked a particular kerb profile to tyre structural damage. That is a reason to classify terrain geometry, not to add arbitrary damage whenever a tyre touches a kerb. [FIA statement](https://www.fia.com/news/fia-statement-treatment-tyres-2023-fia-formula-1-qatar-grand-prix-update).

No exact real-world temperature bands, compound lifetimes, or F1 25 equations are asserted here. An original model calibrated against this game's vehicle and surfaces is the defensible route.

## Current architecture findings

`physics.js` already evaluates four contact patches, loads, slip angles and delivered longitudinal/lateral forces at 120 Hz. It contains a basic whole-car temperature and wear placeholder: temperature tends toward a value derived from peak slip/speed/brake input; wear grows from speed and peak slip. A single temperature/wear multiplier affects all four tyres. `c.tyres` is cleared and rebuilt every step, so it is a diagnostic force array, not persistent tyre state.

The tyre solver has no persistent wheel angular velocity or physical longitudinal slip ratio. ABS/TC alter forces rather than simulating a full rotating tyre/driveline. Therefore exact longitudinal slip-energy wear cannot be claimed without adding those states. The direct reverse branch returns early and presently skips temperature/wear evolution.

Both solo AI and the server call the shared `step()` function. `RaceRoom.snapshot()` currently sends the car object, so persistent wheel state could be carried, but ordinary client correction in `network-motion.js` only corrects position, velocity and yaw. A new authoritative tyre-state reconciliation path is necessary.

Server recovery and AI recovery call `newCar()`; that currently grants new temperature/wear. This must be fixed before wear matters, otherwise recovery becomes a free tyre change. Whole-race restart should still grant new tyres. Silverstone has an authored pit-exit spawn, not a verified service route/box/entry pipeline. Existing one/three/five-lap session options are too short to assume full-scale stint strategy.

## Shared state and update contract

Introduce `tyre-model.js` as a deterministic, DOM-free module used by `physics.js`. Keep persistent state separate from `c.tyres`, for example `c.tyreState[4]` in FL/FR/RL/RR order:

- `compoundId`, `setId`, model version;
- `surfaceTemp`, `bulkTemp`;
- `wear` in [0,1], nondecreasing until a legitimate tyre replacement;
- optionally accumulated slip energy for diagnosis; do not serialize this if unused;
- later: recoverable graining and persistent heat damage, initially omitted rather than faked.

Define `newTyreSet`, `tyreGripMultiplier`, `updateTyres`, and `replaceTyres`. Read state from the previous step to calculate forces, then integrate state once using the final delivered wheel forces and contact observations. Do not apply wear twice through both global `c.wear` and per-wheel grip. Retain aggregate `c.temp`/`c.wear` only as derived HUD compatibility values during migration.

Run heat and wear on the fixed physics timestep, never the render or network-send rate. Four wheels with two thermal states are cheap; this needs no route optimizer or synchronous browser calculation. All paused solo simulation stops tyre evolution. In multiplayer, server simulation continues with the race; opening a menu does not freeze tyres.

## Proposed first model

Use two thermal reservoirs. Surface heat responds quickly to contact work; bulk heat responds more slowly. The following are original structural equations whose constants must be fitted to game telemetry:

```
P_lateral = abs(Fy_delivered * lateral_contact_velocity)
P_heat = lateral_heat_fraction * P_lateral
       + rolling_hysteresis(load, speed, compound)
       + brake_to_wheel_heat(delivered_braking, speed)

C_surface * dT_surface/dt = P_heat
                        - K_sb * (T_surface - T_bulk)
                        - H_air(speed) * (T_surface - T_air)
                        - H_road(contact) * (T_surface - T_track)
C_bulk * dT_bulk/dt = K_sb * (T_surface - T_bulk)
                   - H_bulk * (T_bulk - T_air)

wear_rate = wear_scale * abrasion(surface) *
            [distance_term(load, speed) + work_term(P_slip)] *
            thermal_stress(T_surface, T_bulk)
```

Convert contact velocity into each steered wheel's coordinates before using it. Apply real load sensitivity once, not another arbitrary high-load penalty that double-counts tyre work. Final delivered forces matter: a fully pressed keyboard throttle should not cause wheelspin wear when TC has removed the excess torque. Similarly, brake input alone is not a lock-up event when ABS is controlling braking.

For the first release, use a documented longitudinal-slip proxy only for measured saturation/excess demand. Do not convert all useful traction power into wear: power accelerating a car is not all sliding loss. Instrument this proxy and label it an approximation. A later wheel-angular-speed model can replace it if burnouts, flat spots or lock-up realism become a priority.

Grip is `base compound grip * temperature factor * wear factor * surface grip`, then the existing combined-force solver still enforces the same tyre budget. Use smooth, bounded curves: a broad usable thermal window and gradual wear decline with a steeper final phase. Avoid discontinuities that suddenly turn the car into ice. Cooling can restore thermal grip; it cannot restore consumed tread. Do not let 100% wear produce zero traction or random punctures in the first release.

At rest, cool toward environmental conditions and add no distance/slip wear. In reverse, evolve tyres consistently. Preserve front/rear and left/right differences so sustained cornering and driven-wheel work have meaningful consequences.

## Formula and Rally calibration

| Aspect | Formula family | Rally family |
| --- | --- | --- |
| Initial choice | Soft / Medium / Hard slicks | One durable all-purpose tyre initially |
| Thermal behavior | More sensitive, but keyboard-friendly usable window | Broader window and slower penalty growth |
| Slip behavior | Scrubbing/overdriving costs wear and temperature | Expected controlled sliding remains viable |
| Surfaces | Asphalt, low kerb, rough/raised kerb, grass/gravel | Surface-dependent grip/work, without instant tyre destruction |
| Strategy | Compound trade-offs and verified pit stops | Stage/sprint longevity first; circuit service optional later |

Do not give Rally free wear merely because it slides, but do not punish every drift with Formula slick coefficients. Separate calibration is preferable to a global 'arcade wear' multiplier. Keep keyboard and controller on identical tyre rules: input smoothing and existing ABS/TC provide accessibility, not device-based grip bonuses.

Current kerb recognition is based on material names and height tolerance. Extend the surface contract to per-wheel `surfaceType`, `abrasion`, grip and roughness before detailed kerb wear. Low kerbs may be useful; raised or rough kerbs can increase wheel-load variation and cost time. Material names alone cannot establish suspension impacts, so defer punctures and structural damage until the geometry/vertical dynamics support them.

## Race length and defaults

Expose simple options: **Off**, **Natural**, **Strategy**. They are explicit session settings shared by all participants, never secretly chosen from player lap time.

- Off: fixed standardized tyre condition. Default for time trial; separate record/version keys.
- Natural: calibrated distance/work-based wear. Short one/three/five-lap races generally finish without needing a stop. Compound differences and thermal management can still be felt.
- Strategy: accelerated irreversible wear for a shorter strategic race. Display the multiplier in session details. Keep thermal time constants in real simulation time so a multiplier does not create instant overheating.

Before pit infrastructure works, default existing short races to Off or modest Natural; do not strand players on worn tyres. Once pits work, add longer distances (for example 10 and 15 laps) and offer Strategy as an opt-in. Calibration should create a plausible contest between staying out and stopping, not force every race to the same stop count. Choose scaling from planned race distance and measured clean-stint tyre work, not the user's personal lap times. Store the selected scaling in the room state and PB key.

As a design check, a stop is attractive only when predicted remaining time saved on fresh tyres exceeds measured pit-lane transit plus service loss. Do not invent a fixed 'pit loss' until the actual route has been driven and timed. Avoid mandatory compound regulations in the first release.

## AI and multiplayer fairness

AI gets the same persistent tyres, temperatures, grip and wear as a human. Skill must not reduce wear coefficients; smoother driving naturally saves tyres. Aggression can cause extra work because of actual slip, braking and alternative lines, not a synthetic wear tax.

The cached racing line remains a reference. Apply tyre-condition limits to the speed profile/controller without rerunning the heavy whole-track optimizer each frame. Start with a small set of precomputed grip-condition speed envelopes or a cheap cached speed sweep at coarse condition intervals. Ensure a worn front tyre changes available cornering before the AI repeatedly runs wide. Add pit strategy only after worn-tyre AI can complete clean stints.

Server-authoritative race options include tyre model version, compound, wear mode and scale. Only server pit events can replace a set. Predict tyre evolution locally using the same code; reconcile persistent state from timestamped authoritative snapshots and replay queued inputs if available. Do not interpolate permanent wear downward between snapshots as a cosmetic fix, and do not apply wear again when a snapshot arrives. Remote-car display needs only compact tyre telemetry, not full wheel-force diagnostics.

Preserve tyre state across recovery, reconnect, collision correction and DNF display. Fresh session/rematch creates a new set. A legitimate pit stop increments `setId`, making replacement distinguishable from stale packets. Bound serialized values and reject client-provided wear/temperature/set changes. No account system is required.

## Pit implementation stages

1. **Telemetry first:** persistent four-wheel states, two-temperature model and wear logging behind a disabled/default-off setting. Validate without changing current grip. Add four-wheel debug telemetry for development, not intrusive player UI.
2. **Formula wear:** enable smooth per-wheel grip effects, three compounds, standardized time-trial conditions, reset/recovery semantics and server reconciliation. Run stints across clean driving, deliberate scrubbing, ABS/TC use and different surfaces.
3. **Silverstone pits:** author and validate entry gate, ordered pit path, speed-limit zone, assigned service box, exit gate and merge. Add request/cancel compound choice, stationary service with a deterministic timer, and validated set replacement. No animation complexity is required initially. A spawn at pit exit is not a pit-stop implementation.
4. **Race strategy:** AI stop timing, longer races, Strategy scaling and clear HUD warning/compound/condition display. Validate undercut versus no-stop choices using measured race time. Avoid forced stops until the strategies genuinely differ.
5. **Rally and richer effects:** tune the same core for sliding, add surfaces and optional advanced graining/heat damage. Expand pit support track by track only after geometry validation.

## Acceptance tests and calibration gates

- Stationary tyres cool and do not wear; heat responds sooner at the surface than in the bulk.
- Clean rolling, lateral scrubbing and saturation produce the expected relative work. TC/ABS do not add penalties just because keys are held.
- Wear cannot heal when cooling; temperature can recover grip. Compounds trade initial pace for longevity rather than one dominating every race length.
- A constant-radius run produces plausible asymmetry; changing direction changes the stressed side. No sign/order mistakes between diagnostic tyres and persistent state.
- Equivalent fixed-timestep replays match between solo, AI and server. Render FPS and snapshot frequency do not change wear.
- Reverse, pause, recovery, reconnect, restart and pit service each preserve/reset exactly the intended state.
- Tyre changes require valid pit conditions; early pit exit, repeated service requests, stale snapshots and recovery cannot grant free sets.
- Full three-car stints stay driveable as grip declines; lower condition reduces speed without oscillating braking or line misses. Re-run AI and car-contact regressions.
- Benchmark planning/menu latency: tyre state must not reintroduce the Race-button freeze.
- Version all physics-affecting changes and segregate old PBs. Rebuild and validate cached AI plans when base physics or tyre defaults change.

Measure final lap-time loss, per-wheel wear, slip work, temperature trajectories and pit delta before selecting coefficients. Do not promise 'F1 25-level realism' from these tests; the objective is consistent cause-and-effect and worthwhile strategy in this game's physics.

Implementation note: derive wheel loads, delivered forces and aero effects from the current physics step. Do not hard-code the previous aero coefficient or copy an old load table; the shared car parameters are being tuned independently. Recalibrate stints after those changes stabilize.
