# Build 07: keyboard braking, cameras, and limits

Formula now uses simplified ABS pressure modulation alongside existing full traction control. The previous current-mode implementation suppressed the explicit wheel-lock penalty but still reduced lateral force when braking saturated the combined force budget. This explained the lock-like push under braking. ABS now reduces requested brake pressure to preserve cornering force within the same tyre-force circle. It does not apply brakes autonomously or steer the car. This is a force-budget approximation, not a full wheel-slip ABS controller or EA's implementation.

Keyboard brake release now takes about 167 ms from full pressure rather than 71 ms; analog pedal response is unchanged. Formula steering range increases another approximately 4–5%, retaining the existing maximum steering lock and tyre balance.

In the 144 km/h, 0.8-second held-brake/right-steer diagnostic, enabling ABS increased heading change from 0.279 to 0.380 radians (about 36%). Final speed was 28.35 rather than 25.19 m/s: more cornering is obtained by easing braking, not adding grip. All tyre forces stayed within capacity. All six test suites pass, including 80 repeated-input scenarios (worst body slip above 15 m/s: 10.22 degrees) and the conservative keyboard Silverstone lap (maximum route offset 1.71 m, no time outside conservative width).

T-cam is 0.38 m higher and 0.65 m farther back, with a downward viewing angle to show more cockpit and road. The supplied Brendon Leigh Silverstone F1 25 reference was inspected around 11:07 for framing. These values are visual tuning for the supplied models, not extracted F1 25 settings. Chase follows heading immediately, as T-cam does, eliminating its previous trailing yaw response. Camera selection never changes vehicle physics.

Track limits: Strict preserves immediate four-wheel-off invalidation; Standard permits 0.5 seconds per excursion; Relaxed permits 1.5 seconds; Practice disables off-track invalidation. Rejoining resets the excursion timer. Barrier contact and recovery still invalidate laps, and lap gates remain required. Changing strictness starts a new session; best times are stored separately per strictness and new physics version.

Reference: [EA F1 25 accessibility guide](https://www.ea.com/able/resources/f1-25) distinguishes ABS, traction control, and automatic steering/braking. ABS prevents lock-up; traction control addresses acceleration. These changes target an accessible keyboard interpretation of that behaviour, not exact parity with the commercial game.

## Build 07.1: high-speed initial steering response

Following Silverstone feedback (assumed Copse), measured initial turn-in at 180, 240, 280 and 300 km/h. Front lateral force was approximately 75% of capacity after 200 ms at high speeds and approximately 90% after 500 ms. This suggests some initial response headroom, not proof of the cause of the reported corner behaviour.

Keyboard steering build-up now gradually increases from 5/s at 216 km/h to 6/s at 288 km/h (200 ms to 167 ms for a full press). Maximum angle, front/rear grip, brake response, steering release/reversal rates, analog controls, and lower-speed response are unchanged. A stronger 7/s experiment exceeded the existing repeated-input stability threshold and was rejected. Current transition checks pass with 11.75 degrees worst body slip in the repeated-input stress test. Keyboard/model checks and conservative digital lap also pass. Exact user speed, line and input timing at the problem corner remain unmeasured.
