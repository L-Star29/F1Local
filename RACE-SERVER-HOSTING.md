# Connect GitHub Pages to a race server

The game needs one persistent Node process. GitHub Pages serves the game assets;
the separate server simulates races and keeps rooms in memory. No database is needed yet.

## Railway setup

Push the current changes to GitHub, then create a Railway project from the F1Local repository.
Use these service settings:

- Build command: `node prepare-race-server.mjs`
- Start command: `node server.mjs`
- Variables: `HOST=0.0.0.0`, `ALLOWED_ORIGINS=https://l-star29.github.io`
- Health check path: `/api/health`
- One replica; disable sleeping/serverless mode for consistent racing.
- Select a region near both drivers. Railway supplies `PORT` automatically.

Generate a public HTTPS domain in the service's networking settings. Test
`https://YOUR-SERVICE-DOMAIN/api/health`; it should return `ok: true`.
The build downloads and verifies the Silverstone model from the existing Pages site
if the cloud checkout contains an LFS pointer. Other car/track models stay on Pages.

Set `serverUrl` in `multiplayer-config.json` to that HTTPS origin (no trailing path),
then push the config change. After the Pages workflow completes, both drivers use
the normal GitHub Pages game URL and the same room code. No server address entry
is needed by players. A blank configuration retains same-origin local racing,
but explicitly reports unavailable online racing on GitHub Pages.

## Limits

This is an initial private-room server, not a hardened public matchmaking service.
Restarting or redeploying it clears rooms. Keep one replica: rooms are not shared
between instances. Existing room capacity is eight two-driver rooms; actual capacity
depends on the purchased CPU and memory and has not been load-tested on Railway.
Set a spending limit/alert in your hosting account and check usage after testing.
Do not expose account secrets in the public configuration; it contains only a URL.
