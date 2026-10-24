# Handling and circuit research

**Historical notes for build 01.** The initial handling model and its numerical tests have been superseded by build 02. Read **HANDLING.md** for the steering-coordinate correction, revised force model, current verification, and known limits. In particular, the original direction check did not verify screen-relative steering and was inadequate.

## What can actually be established

This research uses public first-party descriptions and the user's hands-on observations. I have not driven F1 25 in this environment, measured ApexDrawn's live telemetry, or recovered either game's internal physics coefficients. The implementation is independently written. Claims below distinguish documented features from inferred causes.

### ApexDrawn

The [official page](https://apexdrawn.onrender.com/) describes instant track creation, corner smoothing, adjustable hills and banking, multiple vehicles, analogue controller input, ghosts, and multiplayer. Its current interface also lists **Width round the lap**, which means the user's uniform-width observation should not be treated as a universal limitation of the current release. Its actual slip curves, inertia, tyre forces, and source implementation were not established.

The user's report that drifting was faster is a useful handling target to avoid for the Formula car; it is not a controlled physics benchmark. Plausible causes include a broad slip-angle grip plateau, strong yaw control, insufficient speed-dependent aero, forgiving corner geometry, or the chosen car/setup. These remain hypotheses. Retain quick access to driving and readable controls; do not copy protected source or artwork.

### F1 25 specifically

EA's [official handling deep dive](https://forums.ea.com/blog/f1-games-game-info-hub-en/race-your-way---ea-sports%E2%84%A2-f1%C2%AE-25-deep-dive/12111491) reports revised tyre load/slip behaviour, steering response, traction control, throttle mapping, clutch transitions, and aerodynamic yaw/ride-height effects. Aggressive inputs increase temperature and wear. Surface types influence grip. EA also explains that accurate kerbs, barriers, bumps, and elevation contribute to track fidelity; only a specified subset of tracks received new LIDAR scans for that release.

EA's [setup guide](https://help.ea.com/fi/articles/f1/f1-25/car-setups-guide/) confirms that aerodynamics, suspension, brakes, and differential settings alter how a car responds. Neither source publishes enough coefficients to reproduce its simulation exactly. This build targets the user's preferred braking/turn-in/exit behaviour rather than claiming numerical parity. Battery-management systems are intentionally omitted.

## Why an outline alone feels wrong

1. **Corner radius, not just width.** At a given lateral grip limit, corner speed grows approximately with the square root of radius. Doubling an apex radius can raise the geometric speed limit by about 41%, before aero effects. Large smoothing passes can erase the very braking events that identify a street circuit.
2. **Scale.** If a centreline is visually similar but distances or car size are wrong, the approach speed, braking distance, and time between turns will differ.
3. **Independent boundaries.** Width changes affect entry position and how much a driver can open the exit. A constant-width ribbon cannot describe every real corner. Even this prototype's variable ribbon is less accurate than separately surveyed inside/outside edges.
4. **Elevation, camber and kerbs.** These change sight lines and wheel loads. A flat map does not preserve their physical effects. This prototype includes approximate elevation but not a full suspension response or measured camber.
5. **Car and camera together.** Braking grip, torque response, slip behaviour, seating height, FOV, and landmarks collectively establish speed perception. A high camera and permissive yaw model can make an otherwise recognisable outline feel like a different circuit.

## Implementation choices

**Formula:** 800 kg design mass, rear-wheel drive, a sharper lateral tyre response, yaw inertia, forward load transfer under braking, quadratic downforce, drag, eight gears, and a friction-circle limit shared by braking/acceleration/cornering. Overshooting the available grip produces understeer or oversteer rather than free rotation. These parameters are our tuning choices, not measured EA values.

**Rally:** 1,250 kg design mass, front/rear drive-force distribution, lower aero, softer tyre response, broader post-peak grip, six gears, and a rear handbrake. This is a tarmac rally-inspired mode on the same circuits, not a loose-surface rally-stage simulator.

**Keyboard:** filtered pedals and speed-sensitive steering range/rate reduce abrupt digital inputs. Sport assists approximate ABS and TC; Unassisted permits locking and power saturation. There is no automatic steering toward the road.

**Tracks:** [Tomislav Bacinger's MIT-licensed geographic centreline collection](https://github.com/bacinger/f1-circuits) supplies the five layouts. Longitude/latitude is projected into metres, direction normalised, start positions chosen near the real straights, local vertex rounding capped at eight metres, then resampled at about three-metre intervals. Overall scale corrections are approximately 0.998–1.004. Width and elevation profiles are explicitly approximate and should be replaced with measured data in a fidelity pass. Narrow Baku sections are authored by lap fraction, not surveyed wall positions.

## Validation and next calibration

Automated straight-line tests initially produced approximately 248 km/h for Formula and 154 km/h for rally after ten seconds; Formula braking from 300 km/h stopped in about 100 m with assists. These are model outputs, not proof of parity with real F1 or F1 25. Circuit closure and nearest-point sampling were checked for all five tracks.

The most useful next evidence is the user's keyboard feedback on corner entry, mid-corner grip, and throttle exit, followed by a reference lap/telemetry comparison at the same car setup, assists, view, and track. Improve boundary geometry and elevation before chasing lap times through arbitrary grip changes.
