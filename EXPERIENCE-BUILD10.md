# Driver experience / Build 10

## Interface

Charcoal, white and racing red replace the lime-green palette. Practice and
Multiplayer have separate screens. Practice puts circuit selection first and
keeps transmission/track limits in expandable driving settings. Multiplayer has
distinct create/join paths, driver identity, nearby team selection, a copyable
invite code, two driver cards, explicit ready states, host start, return-to-race,
and results/rematch actions. Rules are available without dominating the setup.
The race standings sit away from the centre of the road. Keyboard focus states
and compact-width access are retained.

Design references: [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
and [Forza's separate multiplayer race modes](https://forza.net/news/forza-motorsport-multiplayer).
These inform the navigation hierarchy; the visual design is original.

## Multiplayer motion

- Up to three control requests can be in flight. The old single-request gate
  reduced input frequency to the network round-trip rate on distant connections.
  The server already rejects old sequence numbers, so late packets cannot restore
  obsolete steering. Requests remain bounded when a connection stalls.
- Routine local position/heading/velocity corrections now apply gradually on
  rendered frames. Large recovery corrections remain immediate.
- Opponents use a 100 ms snapshot buffer, a monotonic playout clock and at most
  100 ms of extrapolation when a packet is late. They no longer chase individual
  packet positions with a second smoothing layer.
- HUD updates are capped at 20 Hz; lobby driver-card DOM is rebuilt only on
  meaningful state changes. Physics still uses the existing fixed 120 Hz step.
- Joining a room reuses already-loaded Silverstone/car assets when possible.
- Empty-room cleanup waits two minutes from the last active connection rather
  than deleting an older lobby on its first brief disconnect.
- Localhost uses the local server; the published site uses the configured Render URL.

Networking reference: [Snapshot interpolation, Glenn Fiedler](https://github.com/mas-bandwidth/gafferongames/blob/main/content/post/snapshot_interpolation.md).
This is bounded smoothing, not a complete input-history replay system. A very
slow server or long network outage can still cause a visible correction.

## Validation

`node network-motion-tests.mjs`: alternating 10–70 ms snapshot delays at 50 m/s,
60 Hz rendering, monotonic motion, max frame travel 0.856 m; local correction
continuity; recovery teleport; round reset; bounded overlapping control requests.

Server tests include a full Silverstone diagnostic lap, room/stream authentication,
stale-input braking, finish/DNF, recovery and rematch. Handling transition and ABS
tests passed. Two browser clients verified create/join, ready, countdown,
acceleration and standings with no console errors. Desktop and compact layouts
were inspected. Pages build validates 43 files and real GLB assets (837.6 MB).

Commit and push all changes including `network-motion.js`. Pages must deploy the
new frontend; Render must deploy the room-cleanup and static-file allowlist update.
Live two-person performance on Render still needs a user race after deployment;
local tests cannot establish the free instance's sustained performance.
