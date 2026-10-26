# Build 12 — starts, garage and close racing

Race starts now illuminate five red light groups at one-second intervals, followed by a random 0.6–1.8-second hold before lights out. Throttle must be released after lights out before a fresh press can launch. Holding throttle cannot produce an automatic start. Solo reaction time uses simulation time; multiplayer explicitly labels server reaction time because network delay is included.

The garage displays the selected supplied GLB in a lit studio with five team cards. The preview renders on selection/resize rather than continuously. Join room is available directly from circuit setup and leads through room details and garage, without requiring a circuit choice. Private rooms currently remain Silverstone-only.

Practice offers a verified Silverstone pit-exit spawn. Its out-lap is not timed. Other circuits retain on-track starts until their pit exits have been checked against the imported geometry.

Car-to-car contact uses model-derived convex footprints, including the tyres, wings and front-wheel steering movement, instead of three circles. The server separates overlapping cars and removes closing velocity without arbitrary forward-speed or yaw damping. A visual overlap guard handles interpolated opponents near the local car. Footprints are conservative outer hulls, not deformable meshes; this does not implement crash damage or eliminate network latency.

Validation: race-start tests (held input, fresh launch, timing and pit clearance), all five car contact footprints (wings, tyres, rotated/steered cars, separation, momentum and energy), session/handling regression, network-motion tests and multiplayer server integration pass. Pages asset validation includes all new runtime modules. Browser checks cover the actual garage models, pit spawn, direct-join validation and held-throttle/fresh-press launch.

Two browser clients also completed create-room, direct join, ready-up, five-light start and a server-recorded launch on the local server. Internet latency and live wheel-to-wheel racing still need a two-player playtest after deployment.

Deploy the frontend and Render server from the same revision. These changes are local until published.
