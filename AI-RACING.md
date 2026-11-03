# AI racing

## Current setup — 29 October 2026

Select **Silverstone → Race → Solo → 100% AI skill**. **Equal cars** is now the default in new sessions. Player physics and keyboard controls are unchanged. The optional **1:35 Challenge · boosted AI** has **35% additional AI downforce and 2.5% additional AI power** at 100% skill; the advantage tapers with the cube of skill. This is explicitly unequal performance, not proof of a 1:35 equal-car driver. The older, larger **Enhanced AI** advantage remains separately labelled experimental. No additional tyre grip was introduced.

Independent deterministic simulation validation ran three five-lap trials with different lateral starting positions. With the revised speed profile, all twelve boosted flying laps were approximately **94.68–94.71 seconds**, with no four-wheel excursions, unsafe-surface samples, penalties or recoveries. Standing laps were approximately 99 seconds. See `analysis/ai-challenge-validation.json` and `node ai-challenge-tests.mjs`. These are clean-air offline results using the game simulation, not a guarantee of 1:35 laps in traffic or a measured browser benchmark.

The equal-car driver currently completes clean flying laps in **101.025 / 101.042 seconds**, compared with the earlier training result of **100.867 seconds**. The revised planning model has not delivered a meaningful clean-air pace improvement; the equal-car 1:35 target remains unmet. Its generic policy coefficients are in `ai-driver.js`; it does not replay recorded positions, teleport cars, alter the clock, or change player forces. Training currently validates Silverstone only. See [the current corner and traffic analysis](AI-DRIVING-ANALYSIS.md).

### Evolutionary training

`node train-ai.mjs` evaluates mutated steering look-ahead, feedback, speed targets, brake response and acceleration response through the real simulation. It retains the fastest valid candidates; invalid candidates rank by progress. Four-wheel excursions, sustained unsafe surfaces, barriers, recovery and excessive path error disqualify a candidate. Training is offline and never blocks the browser's Race button. Reports are written to `analysis/ai-training.json`; candidates require separate multi-lap, grid, parked-car and side-by-side validation before promotion.

Optional environment variables: `AI_GENERATIONS` (1–100), `AI_POPULATION` (2–64), `AI_SEED`, and `AI_RESUME` (a previous report path). Resumed candidates are reevaluated. The trainer optimizes equal-car driving; the challenge's separately declared performance calibration is not a learned driving improvement.

### Traffic safety

Passing and defending lanes use their own curvature/braking envelope. Stopped cars are detected beyond stopping distance, including cars on the upcoming racing line. Grid queues reserve manoeuvring space; a short full-physics/footprint rollout allows a cautious crawl when coarse clearance rules would otherwise deadlock. Clear-air apex driving retains the optimized racing line. Tests cover two-lap three-car races, stationary high-speed arrivals, grid queues and scripted side-by-side corners. This remains reactive racecraft, not a guarantee against every human collision.

## Development history (superseded values below)

### First playable version

Choose Silverstone, Race, Solo, then 1-3 AI opponents and a 0-100% skill slider. Formula cars only for this initial release. Other circuits and Rally retain races against the clock. No login or game-server connection is needed for solo AI.

Opponents use the same Formula physics, tyres, power, automatic transmission and car-contact solver as the player. A forward curvature scan sets braking targets, a steering controller follows the route, and nearby traffic influences following distance and passing offsets on straights. Difficulty changes the target speed envelope, not physical grip or power. The racing line smooths curvature inside a road-sampled corridor; steering, throttle and braking are continuous. Higher percentages raise the corner and braking envelope without changing car physics. Top-level competitive pace is still unfinished: a single 100% AI currently completes a clean standing-start Silverstone lap in approximately 1:59, compared with approximately 2:11 before circuit-wide speed planning.

The player starts first on a staggered grid. AI launch after individual reaction delays following lights out. Pause freezes all solo cars. Double-R resets the whole grid and countdown. Live order, lap counts, minimap markers and the player's finishing position are shown. Drivers still behind when the player finishes are labelled accordingly, rather than assigned invented finish times. Solo invalid laps are reported; this is not a stewarding/penalty simulation.

If an opponent is stuck for eight seconds, it can recover to the nearby track only when other cars are clear; contact is disabled for that recovering opponent for three seconds. Full crash damage, sophisticated defensive racecraft, AI pit strategy, mixed human/AI online rooms and other circuits are not implemented yet.

Validation: three opponents completed full Silverstone laps at each difficulty without recovery; they also cleared a stationary player on the starting grid. Launch-delay, existing solo-session and collision regression checks pass. Browser checks verified settings, imported opponent models, launch, order changes, pause/resume and whole-grid restart. Close racing with a human remains a gameplay tuning task, not something these checks prove perfect.

A live rear camera appears at the top of the driving HUD in all camera modes. It renders the actual scene behind the car, including opponents, while reusing the main view's shadow map.


## Circuit-wide planner

Original JavaScript implementation informed by these sources (no third-party implementation copied):
- Driver61, Scott Mansell, [How to Drive the Perfect Racing Line](https://driver61.com/uni/racing-line/): geometric versus exit-focused lines; the following straight and vehicle affect the best apex.
- TUM FTM, [Global racetrajectory optimization](https://github.com/TUMFTM/global_racetrajectory_optimization): minimum curvature and minimum time are different objectives; acceleration limits affect the result.
- TUM FTM, [trajectory generation pipeline](https://github.com/TUMFTM/global_racetrajectory_optimization/blob/master/main_globaltraj.py): curvature, vehicle constraints, velocity profile and predicted time are evaluated together.

The planner receives a closed, ordered route sampled at approximately three-metre spacing, local widths/normals, and a surface query for wheel clearance and walls. It samples a conservative usable corridor, constructs a smooth seed, then tries bounded lateral changes at multiple spatial scales. Each candidate is scored by predicted total lap time, not by individual corner radius. The speed model includes speed-dependent tyre capacity/downforce, engine force and power, drag, braking force, and a combined lateral/longitudinal grip budget. Repeated cyclic backward braking and forward acceleration sweeps carry consequences through linked corners and across start/finish. Profiles are cached per skill percentage.

This allows exit positioning to affect the following straight and sacrifices in one bend to benefit the next, without a table of hairpin/chicane rules. It is an approximate local optimizer, not a globally optimal solver. Its simplified envelope is calibrated against this game's physics; predicted flying-lap time is not an achieved time. Full-physics standing-start tests at 100% currently return 119.08 / 119.80 / 120.55 seconds for three cars, with no recovery. Single-car tests at 0/60/80/100% show no four-wheel off-road excursions.

Plans are cached once per track object. Silverstone generation takes about 3.2 seconds on the development machine; it is not done per frame. Other track layouts can use this geometry interface, including future drawn tracks, but they must supply valid boundaries and ordered route geometry (especially at crossings). The generated-shape tests validate general geometry, bounds and continuity; they do not certify full-physics driving on every circuit. Playable AI remains Silverstone-only pending those validations.

Remaining work: lateral tracking at the grip limit, faster asynchronous planning for large tracks, explicit elevation/banking/friction maps, legal kerb use, and traffic-aware local trajectory replanning. The current traffic layer can follow and offset on straights but does not solve a minimum-time line around every opponent. No extra physical grip, power, or teleport speed boost is given to skilled AI.


## Corner-entry correction
The earlier neighbour-average seed minimized path length, not bending; the former description was incorrect. It pulled the seed toward corner interiors before the time optimizer ran. The seed now minimizes squared discrete bending with bounded normal displacements. The follower also uses the planner's sampled lateral bounds instead of clipping every target to +/-2.7 metres. The speed envelope was revalidated for this changed line rather than retaining the more aggressive previous estimate. Single-car 100% standing-start validation: 116.68 seconds with no four-wheel off-road excursions or recoveries. This supersedes the earlier timing above. Full visual corner-by-corner validation remains necessary; lap time alone does not establish ideal apex placement.


## Track-width revision
Road sampling now checks at 0.25 m intervals, retains 0.30 m beyond the wheel-clearance check instead of a duplicate 1.50 m margin, and searches up to 10 m laterally subject to the local road width. Bending relaxation runs longer and time optimization includes 144 m changes so entry positioning can develop over a longer approach. Steering look-ahead is shortened from 8+0.4v to 7+0.3v metres. Full-physics single-car tests at 0/60/80/100% complete in 137.13/118.78/115.43/112.87 seconds, without four-wheel off-road excursions or recoveries. These timings supersede earlier results. Planning costs more time on initial race setup; subsequent races reuse the cache. This still does not certify every apex or expert-level competitiveness.


## Mirror and kerb surfaces
Rear view is rendered to a small render target then drawn with horizontally reversed UVs. It is now a mirror rather than an unflipped backwards camera. Runtime and offline surface samplers identify curb/kerb mesh materials and count unsafe wheels separately from asphalt track-limit wheels. Planner clearance permits at most two non-asphalt wheels only when they are on identified kerbs within 8 cm of the sampled centre height. Grass and large height differences remain excluded. This is a conservative geometry check, not a full kerb roughness/banking model; safe candidate lines still compete on predicted lap time. Legal lap-limit counting is unchanged.
The AI requests full throttle while below its target and approaching an accelerating part of its profile; shared physical TC still limits delivered torque. A 0.4 m/s overspeed deadband avoids small brake applications from speed-target noise. These do not guarantee flat-out handling for every human-flat corner.


## Independent aggression
Race settings now expose 0-100% aggression independently of skill. It adjusts following gap (12 down to 7 metres), clearance for overtaking attempts, and willingness to pass in mild bends. Above 35%, a closing challenger can trigger a committed defensive move toward the next bend's inside, with an eight-second cooldown. Cars hold their current lateral target when another car is alongside. This is basic reactive racecraft, not complete rules-aware defending or guaranteed collision avoidance.
The requested 1:35 maximum-skill target is not reached. A higher speed-envelope trial failed the off-road regression and was rejected. The validated speed envelope remains unchanged.


## Responsive race setup
The browser no longer computes racing lines. Silverstone's identical optimized plan is generated offline with `node build-ai-plan.mjs`, stored in data/gb-1948-ai-plan.json, and loaded before setup becomes available. Race resets and setting changes reuse it. A browser-side guard prevents accidental synchronous optimizer fallback. The Pages build checks a fingerprint of planner, physics, surface sampler and track data and rejects stale plans. Regenerate the plan after changing these sources. The plan is approximately 713 KB; a loading regression constructs 20 three-car races in about 4.5 ms on the development machine (excluding initial asset loading). Future drawn tracks will require asynchronous planning, rather than invoking the synchronous offline generator in the browser.


## Recording analysis and grip-budget correction
Reviewed timestamped frames of the supplied 121.8-second recording, including denser sequences at 42-52 and 62-80 seconds. The leading car visibly reaches some kerbs but does not consistently follow the inside edge through linked turns. The HUD belongs to the following human car, so it was not used as AI speed/brake telemetry; contact was not used as handling evidence.
The speed planner previously reused the reduced corner-speed grip envelope as the combined-force budget. At its own target corner speed this artificially exhausted longitudinal capacity. Braking and acceleration sweeps now use the unreduced estimated physical capacity, while target corner speeds retain their safety margin. This changes planning only; player/AI physical grip and power are unchanged.
An aggressive trial returned 108.07 seconds but missed the planned line by 7.51 m; it was rejected. The retained correction returns 110.42 seconds, mean lateral tracking error 0.50 m and maximum 3.76 m. A maximum-error regression now rejects deviations exceeding 4 m, even if the car remains on paved ground. This is still not expert-level or 1:35 pace.


## Corner overtaking
Passing now evaluates both sides of a slower opponent instead of requiring a straight. The preferred candidate is the corner's inside; each candidate checks the sampled road corridor for the next 50 metres and rejects lanes occupied by nearby traffic or their short-term projected positions. A short commitment keeps the move from immediately returning to the normal line. Actual overlap holds lateral position, and longitudinal separation remains protected until the car has moved out from behind. Inside-path speed is reduced for the tighter estimated radius. This is still a reactive approximation, not a full trajectory collision predictor.
Tests cover inside choice, alternate side, traffic blocking both sides, a narrowing corridor, stationary-player passing, and defensive overlap. These decision tests do not establish clean human/AI corner overtakes in every situation. Vehicle power/grip remain unchanged; the existing straight-line diagnostic reaches approximately 300 km/h in ten seconds.

## Shared Formula pace revision (28 October 2026)
This revision supersedes the historical pace figures above. Formula downforce coefficient increases from 2.6 to 4.8; power, drag and tyre friction coefficients are unchanged. Both human and AI cars use this model. The speed-sensitive steering range base increases from .032 to .045 radians so the high-speed controller is not stuck at its steering stop; keyboard ramps remain intact. AI pursuit look-ahead is now 7+0.22v metres.

A three-lap, single-AI 100% simulation measured 98.100 seconds from rest (including reaction and grid approach), then 94.092 and 94.092-second flying laps. No four-wheel excursions or recovery resets occurred. Maximum line errors were 2.35 m on the first lap and 1.44 m on flying laps. These are deterministic offline results, not browser measurements or traffic lap-time guarantees. ai-pace-test.mjs enforces sub-95-second flying laps, completion, no four-wheel excursions/recovery and maximum 4 m path error.

The braking regression now checks forward load *fraction*, since stronger braking also reduces speed and therefore total aerodynamic load. Its straight 329–119 km/h stop measures 87.85 m with peak 4.86g; the lower distance bound changes from 90 to 80 m accordingly. This is a game tuning choice, not a claim to reproduce proprietary F1 25 physics. Regenerate the packaged racing plan before browser testing; an already-open race retains its old plan and must be reloaded.

## Reduced downforce after player feedback
Supersedes the high-downforce revision above: Formula aero is now 3.0 (original 2.6, rejected trial 4.8). Steering range base is .034, close to the original .032, instead of .045. AI look-ahead returns to 7+0.3v. This preserves a modest aerodynamic increase without tuning player physics to an AI lap-time target. The pace regression now checks repeatable flying laps and retains all completion, excursion and tracking checks; sub-95 seconds is no longer an acceptance criterion. Initial standing-start AI lap: 108 seconds, mean tracking error .465 m, maximum 3.75 m. Player handling requires a fresh driving trial; AI competitiveness is not solved by this adjustment.

## Race rules revision, 29 October 2026
See RACING-RULES.md for current values and limitations. Player aero is now 2.7 and original steering range is restored. Enhanced AI is optional and explicitly labelled. Racecraft, penalties, DRS and slipstream use new shared modules; the old passing heuristic has been replaced.

29 October follow-up: player aero is 2.8; equal cars is recommended. Racecraft now preserves corridor lanes through overlapping corners and reserves yaw-dependent clearance. Deterministic yielding plus a cautious crawl prevents mutual stops in tight bends; stopped nose-to-tail traffic can still be passed. See RACING-RULES.md for boundaries, DRS toggle and penalty limitations.

Apex regression correction: merely detecting a car ahead no longer activates fixed corridor-lane tracking or freezes braking approach offsets. Only an actual manoeuvre or overlap reserves a lane. Removed speculative corner attacks on cars 30–45 metres ahead without a closing-speed reason. Sixteen sampled corner approaches with distant traffic match clear-track steering and pedal commands; side-by-side room remains separately tested. Vehicle performance and player physics are unchanged in this correction.
An overlapped inside car now targets the available apex rather than preserving its previous lateral deviation. The opponent's reserved space clips that target only when they conflict. Rejoin waiting applies to a move toward traffic, allowing an already-parallel car to clear a slow-corner bottleneck. Final regression: all twelve AI cars across four three-car skill scenarios completed without recovery; the three scripted side-by-side scenarios had no contact.

Expert pace update: planning now uses 90% of estimated lateral capacity at 100 skill (previously 80%), scaled progressively by skill. Braking look-ahead is shortened in open corners while tight corners keep more anticipation. The throttle controller supplies estimated drag/rolling resistance at target speed instead of coasting; acceleration follows the rising exit profile. AI uses a wider analog steering request bounded by mechanical lock; human keyboard mapping and vehicle grip, power, downforce and braking force remain unchanged. Equal-car clean flying laps measured 102.150 and 102.167 seconds, compared with 105.342 and 105.308 before this update. Optional pre-existing enhanced cars measured 90.708 and 90.717 seconds; this remains an unequal-car experimental option. Both runs had no four-wheel excursions or recoveries. Twelve cars across four three-car skill scenarios finished without recovery, and three side-by-side cases had no contact. These are deterministic simulation results, not a guarantee for every human encounter.
