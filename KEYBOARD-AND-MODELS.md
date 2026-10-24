# Keyboard and imported-model update

## Reference work

The supplied videos were inspected visually at selected moments, rather than treated as telemetry or a full physics specification:

- Brendon Leigh Silverstone F1 25 guide: https://www.youtube.com/watch?v=_Kyu9NiFpiI (qualifying lap beginning 10:45; sampled fast and slow sections).
- Verstappen British GP pole onboard: https://www.youtube.com/watch?v=ooeujTa2-k8 (sampled opening section).
- Marcel Kiefer assists comparison: https://www.youtube.com/watch?v=zIDL1HG88IY (actual destination of the supplied link; sampled the medium-TC section near 13:22). The visible link label referenced a different video. No claim is made that every reference used no assists.

These establish useful visual targets: small steering motion at speed, much larger steering in slow corners, precise grip-oriented rotation, readable road width and trackside references. Selected frames cannot identify tyre coefficients or prove parity with F1 25. No source videos were downloaded.

EA's official F1 25 handling deep dive describes smoother throttle mapping and changes to steering rates and tyre slip/load behavior: https://forums.ea.com/blog/f1-games-game-info-hub-en/race-your-way---ea-sports%E2%84%A2-f1%C2%AE-25-deep-dive/12111491

Live for Speed's official controls manual exposes keyboard steering rates separately from analog steering: https://en.lfsmanual.net/wiki/Options/Controls

The iRacing setup guide explains slip angle and the grip balance relevant to understeer/oversteer: https://ir-core-sites.iracing.com/members/pdfs/iRacing_Setup_Guide.pdf

These are design references, not copied game physics or measurements of ApexDrawn. The earlier handling notes contain the baseline tire/aero research.

## Keyboard tuning

Keys request an input that ramps in and releases quickly; they do not instantly impose full steering, throttle or brake. Steering range decreases with speed according to a fixed curve. It does not consult the track or seek grip, and there is no auto-countersteering, auto-braking or racing line. A gamepad retains proportional input. Automatic propulsion follows a continuous force/power envelope without gear changes or torque cuts.

The current keyboard path uses continuous combined-force saturation, avoiding abrupt grip changes when braking or accelerating in a turn. Forgiving common-axle traction control remains; there is no ABS pressure controller, though the simplified tire model does not simulate full wheel locking. Off-road grip is 90% at each affected tyre, interpolated over time. This deliberately makes edge use forgiving; it is not a claim that real grass has asphalt-like grip.

S first brakes forward motion. Once stopped and held briefly, it reverses up to 28.8 km/h. W stops reverse motion before accelerating forward. R recovers to the nearby road; a second press within 450 ms starts a fresh session at the starting point.

## Models and surfaces

All nine circuit models are integrated. Road materials were identified from mesh shapes and texture previews, then aligned to geographic routes. Road heights and four tyre contact queries use the visible mesh triangles. Bounds are no longer a uniform ribbon. Generated route samples have 100% road coverage. This tests mathematical alignment, not every possible driving line. Barrier contact is an approximation from selected vertical meshes.

Revised car exports are used directly. Authored tyre pivots are retained and remaining batched hubs/discs are separated. Steering rotates front pivots; rolling rotates local spin groups. Shared chrome cockpit fittings are excluded from wheel animation. No further model edits are required for this update. Better suspension animations and exact individual steering-wheel assemblies would benefit from explicitly named separate parts later.

Tests cover turn direction, progressive input, release, analog fidelity, high-speed steering, braking while turning, two/four tyres off-road, reverse/forward transitions, road height coverage and all five wheel assemblies. Browser checks cover loading every circuit, brief driving with every team, reverse and double-R. Full manually driven laps and user feel feedback remain necessary for calibration.
