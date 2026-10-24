# Private racing — Build 09

Austria remains hidden from the circuit menu. Its source model is preserved.

## Play

Run **Start Game.cmd** and open http://127.0.0.1:4173. Choose a team, enter a driver name, and create a room under **Race a friend**. The other driver opens the same server address, chooses a team and joins with the six-character room code. Both click Ready; the host starts the race. Two tabs on the same computer can test the connection, though switching tabs brakes the inactive car.

For two computers on the same Wi-Fi/LAN, stop the normal server and run **Start Multiplayer LAN.cmd**. Find the hosting laptop's Wi-Fi IPv4 address with `ipconfig`. Both players use `http://THAT-IP:4173`. A private-network Windows Firewall allowance for Node may be needed. This launcher exposes only the game and asset directories, not the rest of the project. It does not change firewall settings itself.

VS Code Live Server still supports practice; private rooms require the supplied Node server. A room code alone does not connect different servers. Separate-home internet play needs a reachable deployment or private networking arrangement and has not been validated in this build. No hosting service has been deployed.

## Rules

- Two drivers, Silverstone, equal-performance Formula cars, five selectable teams, automatic transmission, ABS and TC.
- Host selects 1, 3 or 5 laps. Five-second stationary countdown; no jump starts.
- Live positions, lap count, race time, car contact, results including time penalties, and rematches.
- Four wheels off the road for more than 0.5 seconds adds five seconds once per excursion. Recover with R adds five seconds and has a three-second cooldown. Double-R does not restart an online race.
- Menu/blur brakes your car; the race continues. Stale controls are neutralized and braked by the server after 0.5 seconds. A disconnected driver has ten seconds to reconnect before DNF.
- Once someone finishes, the other driver gets 90 seconds to finish; otherwise DNF. Total race timeout is 30 minutes. Refreshing the page loses your current driver session; use Leave room before switching sessions.

## Implementation and validation

The server runs the existing Formula physics at 120 Hz using the imported Silverstone road and barriers. Clients send controls, not positions or finish times. Snapshots arrive approximately 20 times per second through EventSource; the local car predicts movement and reconciles with the server, while the opponent position is smoothed. This is a first private-racing implementation, not a production competitive service. Long-distance latency, sophisticated shortcut detection and larger grids remain future work.

`node multiplayer-tests.mjs` covers a complete server-simulated Silverstone lap, countdown, stale input braking, recovery, finish/DNF, rematch, authentication, room capacity, event streaming and private-file restrictions. Browser verification covers two clients joining, different team models, readiness, shared countdown, acceleration and position changes. Existing handling tests remain separate to catch regressions.
