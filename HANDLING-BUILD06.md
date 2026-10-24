# Handling build 06

## Recording and reference observations

Reviewed sampled frame sequences throughout the supplied 4:41 chase-camera recording, excluding the opening settings changes. Around 0:31–0:33 and 1:19–1:22, braking is accompanied by large car rotation and rapid loss of speed. These frames do not reveal exact key timing, so they cannot attribute every incident to physics. However, deterministic lift/brake cornering tests reproduced severe rotation without barriers or driver mistakes.

Revisited the supplied Brendon Leigh F1 25 Silverstone guide, including the slow-corner sequence around 11:05 and Copse around 11:35, and the No Assists chapter of Marcel Kiefer's comparison. They provide qualitative references for a planted car, corner-dependent steering, and controlled exits; they do not expose EA's physics or provide calibrated telemetry.

EA's [F1 25 handling discussion](https://forums.ea.com/blog/f1-games-game-info-hub-en/race-your-way---ea-sports%E2%84%A2-f1%C2%AE-25-deep-dive/12111491) describes controller steering consistency, tyre-load/slip changes, and low-speed throttle mapping. This informed the direction, not numerical replication.

## Causes and changes

- The Formula lateral tyre curve dropped force after its peak, allowing rear slip to grow during load transfer. A broad, progressive force plateau, revised axle balance, and fixed 62% front brake bias now keep those transitions stable. No automatic steering, automatic braking, or artificial yaw correction was added.
- The available steering range was too restrictive, with slow input release. Formula keyboard steering now builds faster, releases faster, and offers more turning range. Analog inputs remain proportional.
- Acceleration was limited by traction control and then softened again by the longitudinal force curve. Removed that duplicate reduction while retaining the combined tyre-force limit. Automatic mode remains gearless.
- Keyboard pedals now respond more promptly on release, with a slightly gentler initial brake ramp.
- World-position smoothing made the chase camera fall roughly speed/6 metres behind its intended position. It now follows translation directly, keeps an 8.2 m horizontal distance, and smooths heading only.

Rally tuning, model assets, reverse, double-R reset, and mild per-wheel off-road grip remain. Austria's reported invisible barriers are deferred as requested. Best laps use a new version key because performance changed.

## Measurements and verification

These are simulation benchmarks, not measured F1 25 telemetry or proof of real-car accuracy.

| Diagnostic | Build 05 | Build 06 |
|---|---:|---:|
| Worst body slip in 24 lift/brake/release corner cases, above 12 m/s | 78.36 degrees | 3.38 degrees |
| 0–100 km/h | 3.75 s | 2.51 s |
| 0–200 km/h | 6.92 s | 4.62 s |
| 0–300 km/h | 12.93 s | 9.55 s |
| 200–0 km/h distance | 68.73 m | 64.51 m |
| 300–0 km/h distance | 123.92 m | 112.70 m |

All five test suites passed: basic regression, legacy handling, current keyboard/model surfaces, new transitions, and an offline digital-input Silverstone lap. The 80 repeated-input scenarios include two wheels on lower-grip ground; worst body slip above 15 m/s was 8.46 degrees. Camera distance was checked at 30, 60, and 120 Hz. A conservative offline keyboard driver completed Silverstone with a maximum 2.27 m centreline offset and no time outside the conservative track width. That driver is test-only and is not a player assist or representative lap-time benchmark.

Browser driving checks supplement these tests, but do not constitute a complete human-driven lap validation. The previous checks missed the severe lift/brake transitions; the new tests explicitly cover them. Subjective keyboard feel still requires playtesting, and this remains a simplified original vehicle model.

Reproduce with `node transition-analysis.mjs`, `node transition-tests.mjs`, and `node digital-lap-test.mjs`. Reports are in `analysis/`. The baseline is preserved in `analysis/physics-build05.js`.

## Build 06.1: small steering adjustment

Increased Formula steering range by approximately 6%, retaining the existing steering lock and tyre balance. This gives a little more turn for the same input without changing pedal response. The one-second turn test increased heading change from 48.88 to 51.37 degrees at 40 km/h, 38.14 to 39.12 at 80 km/h, and 26.22 to 26.71 at 200 km/h. An experimental front-grip increase was rejected because repeated braking/steering tests exposed instability.

The current keyboard/model suite, transition suite, and conservative digital Silverstone lap all pass. Worst repeated-input body slip was 9.49 degrees; the digital lap remained within the conservative track width. Reports in analysis now describe 06.1; the earlier table above records the original 06 comparison.
