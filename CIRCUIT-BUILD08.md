# Circuit and feedback build 08

Vehicle physics remains at build 07.1. This pass checks imported geometry, fixes road/collision classification, expands circuit testing, and adds driving feedback.

## Austria: reproduced and fixed

Material `Acuredbullring1051Mtl.003_29` is an asphalt surface that had incorrectly been included in the barrier material pattern. The road detector used only `_3`, a narrow tyre-mark strip. A sample at roughly 180 m into the lap found the tyre strip covering offsets -4 to +2 m, while `_29` covered -4 to +14 m. The material texture sheet and surface geometry support the asphalt classification.

Added `_29` to road contact and removed it from barriers, in both the source catalog and current track data. Refreshed conservative route widths. The collision builder now rejects shallow faces, so an uphill road triangle cannot become a vertical projected wall. Real vertical barriers still collide; overhead geometry remains clear.

Before: 83 barrier contacts along the three sampled driving lanes in Austria. After: zero. The browser car accelerated through the repaired start/finish stretch to 248 km/h without a collision invalidation. This checks the reported straight, not every barrier on the circuit.

## Geometry audit

| Imported route | Length | Model scale | Elevation span | Sampled centre-lane barrier hits |
|---|---:|---:|---:|---:|
| Silverstone | 5,891 m | 1.000065 | 11.30 m | 0 |
| Austria | 4,318 m | 1.061826 | 63.47 m | 0 |
| Imola | 4,909 m | 1.003824 | 34.45 m | 0 |

All sampled route centres project onto imported road triangles. Road widths vary, rather than using one width for the entire circuit. Silverstone's narrowest sampled cross-section was 12.5 m, Austria's corrected minimum was 9.75 m, and Imola's was 9.5 m. Broad asphalt areas and intersecting paved surfaces produce much larger cross-sections; these are not certified white-line-to-white-line widths. Asphalt runoff may still count as road where the model uses the same material.

Silverstone's 5.891 km / 18-turn layout agrees with [Formula 1's circuit information](https://ticketing.formula1.com/great-britain/). Length agreement is partly by construction: the model is scaled to the configured lap length, so it is not independent proof of accurate geometry. Austria's 6.18% scale adjustment deserves particular caution. Model elevations, individual corner radii, and braking-marker placement have not been independently certified against surveyed data or F1 25 telemetry. No speculative reshaping of Silverstone was made from video alone.

## Cross-circuit checks

Expanded the keyboard-only diagnostic to Silverstone, Austria and Imola, using actual imported road triangles for wheel-grip classification. All three completed with zero time four wheels off-road. Maximum route offsets were 1.91, 2.49 and 2.98 m respectively. Austria spent 1.20 seconds outside the deliberately conservative symmetric route-width envelope while still on the actual road; both measures remain reported rather than conflated. These are conservative automated laps, not human race pace or F1 25 lap-time comparisons. Collisions are checked separately by the material/geometry audit.

## Feedback

Added restrained procedural tyre scrub driven by tyre slip and speed, with mute/pause handling. Engine synthesis now uses a controlled harmonic waveform instead of a raw sawtooth. It remains synthesized audio, not a licensed F1 recording. Added short-held ABS ACTIVE / TC ACTIVE labels so interventions are visible without single-frame flicker. Camera framing remains as tested in build 07; changing the view does not alter physics.

Reproduce with `node circuit-audit.mjs`, `node digital-lap-test.mjs`, `node surface-feedback-tests.mjs`, and the existing physics suites. Detailed reports are in `analysis/`. Browser inspection confirmed the repaired Austria straight. Final perceived audio quality and race-pace handling still benefit from human playtesting.
