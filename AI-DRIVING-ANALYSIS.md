# Corner planning and racecraft — 29 October 2026

## 30 October: unnecessary close-racing braking

### Opening-lap video investigation

Sampled seconds 0–7 of the supplied 30.8s recording. An opponent is visible alongside on the right around 4s, then falls behind through Turn 1. The footage does not expose its brake telemetry, so the precise input cannot be inferred from the gap alone.

The isolated launch trace found a separate clear-air loss: switching from launch centreline to the optimized line at progress zero caused a large lateral correction and poor acceleration. The controller now smoothly blends from its grid lane to the racing line over the launch segment, only on its first lap and outside a tactical battle. No player physics or AI vehicle forces changed. At four seconds the same isolated AI reaches 158.49 km/h versus 109.26 previously, with no four-wheel excursion. The standing lap improves from 105.51s to 104.78s; flying laps remain about 101.04–101.06s. This fixes one measured cause, not proof that every reported Turn 1 traffic slowdown is solved. Grid, moving-pass, side-by-side and parked-queue regressions pass.

### Maximum-aggression passing-speed policy

**Current policy, superseding the earlier clearance-time versions below:** at 95–100% aggression, traffic following, obstacle-stop and overlap-yield speed caps are discarded after lane selection. Traffic changes the path; corner feasibility, track rejoin and steward sanctions can still reduce speed. There is no guarantee of avoiding contact when an opponent stops or blocks the road. This is the user's requested tradeoff, not a collision-avoidance improvement. Lower aggression retains the earlier speed policy. Moving-pass and stop-start regressions keep zero-contact assertions at 90%; at 100% they require passing/progress and report contact. In the tested 100% scenarios one moving pass and one close stop-start case made contact; all completed without stopping or four-wheel excursions in the grid check.

**Latest user-requested revision:** the pass-first branch now includes stopped and very slow rivals at 95–100% aggression. The earlier stopped-car exemption below is superseded. An available passing corridor commands an immediate lateral move and a forward target of at least 6m/s before corner/physical-conflict limits, rather than the old 4m/s crawl-first cap. A completely occupied road still does not create a fictitious lane. Both passing sides and replanning after the rival occupies a selected route remain supported.

The parked-queue regression now checks prompt initial movement and no subsequent stop, rather than merely eventual progress: all three tested gaps start moving within 0.06s after launch eligibility and pass without contact or pauses. Full-speed parked-car arrival at maximum aggression can make contact; the user explicitly accepted this tradeoff. The test retains its zero-contact requirement at 90% aggression and checks progress without recovery at 100%, reporting contact instead of hiding it. Normal side-by-side and moving-pass contact checks remain unchanged.

At 95–100% aggression, a committed pass of a moving opponent now replaces the conservative following-speed cap with a lateral-clearance-time budget. The AI assumes the opponent continues in its occupied lane, keeps its approach speed if it can establish separation before catching it, and commands a 4m/s rather than 2m/s lateral target transition. Corner-speed constraints and occupied-lane rejection still apply. The unit regression preserves over 50m/s for a clear pass of a 30m/s leader 35m ahead, rather than the previous roughly 40.8m/s target.

Stopped/very slow opponents (8m/s or less) retain the stopping-distance policy. Applying the moving-car attack policy to a high-speed arrival at a parked car failed the contact test and was rejected. Brake-to-stop and parked-grid simulations still require the AI to complete an available pass rather than wait for the player to move. Player physics are unchanged.

### Interrupted passes, contact, penalties and aero follow-up

The earlier constant-speed passing checks did not reproduce every reported slowdown. Added six brake-to-stop scenarios (10/20m gaps, three lateral offsets), plus a targeted interrupted-pass regression. A committed pass now continues evaluating its escape corridor even after its closing-speed difference falls below the old obstacle threshold. This prevents brake-lane commitment from pinning it behind the rival. A rival moving into the chosen corridor triggers replanning while still behind, and a temporarily unavailable route is reconsidered rather than caching failure indefinitely. Current player brake/throttle inputs complement measured acceleration; no future inputs are read. Lateral movement is observed through position and footprint prediction, not instantaneous steering-based teleportation.

Recent contact grants a short recovery window in which a physically clear AI can continue moving off track rather than automatically stop because another car occupies its intended rejoin corridor. Ordinary voluntary excursions still use the conservative rejoin policy. Contact evidence cannot reliably assign blame; this is not a complete forced-off-track adjudicator.

Position-return demands now require an identified rival that was ahead at excursion entry and was passed while the car was outside the selected boundary, with the advantage still retained at settlement. A rival that was already behind cannot trigger a position-return demand. A geometric shortcut can still require repayment of time, independently of overtaking.

Slipstream is measured behind the leader's heading, with a narrow 1.8m lateral cutoff and continuous distance/lateral falloff. This is a deliberately simple game model, not CFD. The prior follower-heading measurement could treat looking toward an offset opponent as wake alignment. See [Codemasters' slipstream explanation](https://codemasters.helpshift.com/hc/en/3-f1-mobile-racing/faq/600-what-is-the-slipstream-effect-1658498230/?l=en&s=duel-mode) for the alignment principle; coefficients here are original tuning. DRS status text appears only in authored zones, and the instruments have a warm edge glow while DRS is active.

### Assertive attack follow-up

Maximum aggression now begins a viable passing setup earlier (up to 44m for a similarly paced opponent, or a five-second closing horizon). Low aggression retains shorter opportunity thresholds. A leader decelerating substantially before the AI's planned speed calls for braking plus an available escape lane; predicted leader deceleration enters the stopping-distance budget. Occupied escape lanes remain forbidden. A clear passing corridor no longer counts as a forward blockage merely because it is within the wider stationary-obstacle margin.

Found and fixed an expired braking commitment: an old encounter's lateral lane could persist through subsequent clear-air braking zones. The commitment now releases once the encounter is over. Close overlap and ongoing braking battles retain their reservations.

An experiment reducing lateral margins failed corner/grid regression checks and was not retained. Physical room remains unchanged; increased aggression comes from earlier opportunity selection rather than squeezing into an unvalidated gap. A new simulated early-braking leader test verifies both avoidance and completion of the overtake without contact. These tests do not establish that every human-driven encounter is solved.

Research reference: [F1's account of Verstappen's 2025 Hungary move](https://www.formula1.com/en/latest/article/must-see-verstappen-and-hamilton-almost-come-to-blows-while-battling-hard-in.72CiXm4W1Ja3io1Oe09xMv) describes using exit momentum for an inside attempt; the useful implementation principle is preparing and committing to an opportunity. It is not a reproduction of a driver's decision-making. The [2025 FIA guidelines](https://www.fia.com/sites/default/files/f1_driving_standards_guidelines_version_4.1_feb_20_2025.pdf) provide the boundaries against crowding and defensive direction changes under braking. No claim is made that this reactive controller implements all entitlement judgments.

Reproduced a false yield: parallel cars 2.9m apart at 30m/s caused the AI to target 25m/s despite clear physical footprints. Tactical spacing was being treated as collision evidence. Separately, cancelling a merge applied a repeated current-speed-minus-2 cap, which could ratchet speed down while the car was already holding a safe lane.

Lane reservations remain, but close-range yielding now requires predicted footprint contact during a 0.6s constant-velocity/yaw-rate sweep. Cancelling an unsafe merge holds the current lane without the automatic speed penalty. Forward obstacle stopping-distance checks remain. The prediction is short-horizon and approximate, not a guarantee against arbitrary sudden human moves.

Regression checks: clear parallel traffic and blocked merges preserve pace; player overtakes on both sides retain at least the initial 45m/s without contact; a stopped AI directly behind a parked player pulls out and passes from 8/12/18m gaps. Moving AI overtakes, stationary arrivals, three-car grids, corner room, apex access and passing commitment also pass. No vehicle forces or clear-air pace parameters changed in this correction.

## Findings and implementation

The AI had separate sources of lost time: the approximate vehicle envelope, following the planned path, and tactical decisions overriding that path. Raising speed targets alone caused deeper entries or excursions. It did not demonstrate better cornering.

The planner already considers circuit width, local curvature, usable surfaces and linked corners. Geometry search retains a coarse whole-car grip envelope to preserve its validated line. A second pass now derives the speed profile from approximate front/rear tyre loads, longitudinal weight transfer, rear-wheel-drive acceleration, the continuous engine envelope, drag and gradient. It budgets the remaining grip under simultaneous cornering and ABS braking/traction-controlled acceleration. Backward braking and forward acceleration sweeps carry constraints through the whole lap. This remains an approximation: it does not optimize full suspension, banking, roll transfer or every transient from the game simulation.

The controller uses a small planned-deceleration feedforward term rather than waiting entirely for overspeed error. Equal-car clean-air results remain about 1:41, so this is not presented as a successful 1:35 solution. `audit-ai-corners.mjs` records achieved entry/minimum/exit speeds, braking, throttle, TC/ABS activity, path error, width and estimated radius in `analysis/ai-corner-audit.json`. Its curvature clusters are analysis sections, not official corner names. The remaining pace gap needs full-physics trajectory/follower optimization, not another global speed multiplier.

## Traffic corrections

- A distant follower no longer triggers defensive positioning just because it is closing slightly. Defense requires a credible near-term attack.
- Braking battles retain the chosen corridor instead of rebuilding the lane from a moving apex offset. Emergency avoidance can still override this to avoid contact; this is not a complete automated FIA steward.
- An overtake records the opponent and chosen side. A change in the next corner's direction cannot reverse that decision mid-pass. The commitment releases once the opponent is safely behind or the encounter has ended.
- Once overlap has reserved a side, a wider release distance prevents oscillating between “give room” and “take apex.” This reservation is local to that opponent; an unrelated distant car does not narrow the clear-air racing line.
- Stationary avoidance retains physical stopping clearance and a tested low-speed escape from grid queues.

These address plausible causes of the reported Vale snap; the exact human trajectory was not reproduced, so the report is not claimed conclusively solved. Tests include linked-corner side commitment, braking overlap loss, six distant-follower corner approaches, two moving-car overtakes, parked arrivals, grid queues and scripted side-by-side corners. Tests cannot guarantee collision-free driving against every human move.

## Proximity display

Reviewed visual samples within the supplied [6:47–7:17 reference](https://www.youtube.com/watch?v=ylC8D6_R5eI&t=407s). The HUD uses an individual white double-chevron for each nearby trailing car, shifts it according to driver-relative bearing, and turns it red for alongside or rapidly closing threats. It supports multiple trailing cars, excludes ghosts/finished cars, and moves lower in chase view. It does not depend on the chase-camera orientation. Unit tests cover all four headings, left/right signs, range, multiple cars and inactive-car filtering. Browser verification confirmed two chevrons on the local race grid.

## Research and interpretation

- [Driver61: racing line](https://driver61.com/uni/racing-line/) — the fastest line depends on the car, corner and following straight; a geometrically large radius is not always the fastest overall sequence.
- [Driver61: corner exit](https://driver61.com/uni/corner-exit/) and [trail braking](https://driver61.com/uni/trail-braking/) — prioritize usable exit acceleration where it pays down the following straight, and share tyre capacity between turning and longitudinal force.
- [EA: F1 25 accessibility resources](https://www.ea.com/able/resources/f1-25) — ABS and traction control help prevent lockups and traction loss. This does not publish Codemasters' internal physics coefficients. No proprietary F1 25 algorithm has been inferred as fact.
- [FIA 2025 driving standards guidelines](https://www.fia.com/sites/default/files/f1_driving_standards_guidelines_version_4.1_feb_20_2025.pdf) — defending and overlap entitlement must be considered, including limits on changes of direction under braking. The game's implementation is an approximation of racecraft, not a certified rules engine.

Extra AI tyre grip would still be a performance advantage: it raises braking, cornering and acceleration limits. TC/ABS improve use of existing grip rather than creating more. Equal cars therefore remains the default, with boosted performance separately labelled.
