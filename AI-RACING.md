# AI racing - first playable version

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
