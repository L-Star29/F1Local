# Time trials

Choose Practice, then Time trial under Practice format. No login or account is required. Records are local to the current browser and site address; clearing site data removes them, and localhost records do not automatically transfer to the hosted site.

Start on circuit for a 150-metre approach to the line, or use the verified Silverstone pit exit. The out-lap is untimed. Crossing the line begins a flying lap. T restarts the attempt. The first valid completed lap records a translucent, non-colliding ghost; future faster valid laps replace it. The ghost fades when within three metres to preserve visibility. Use the checkbox to hide it without disabling timing.

Live delta compares time at equal circuit progress. Sector splits compare the three existing distance-based sectors with the saved best lap (these are not official timing-loop locations). Records are separated by circuit, vehicle type, transmission and track-limit setting. Teams share performance and records. Keyboard/gamepad may be used without account setup. Invalid laps, barrier contacts and recovery cannot replace a best. Storage failure retains the record in memory for the current page visit and displays a warning.

Validation: time-trial unit tests cover saved-best replacement, reload, circuit separation, interpolation, yaw wrap, reverse travel, slow/invalid laps, corrupt and blocked storage. Existing session/handling tests pass. Browser checks verified selection, untimed approach, start-line transition and T restart. A full human lap with subsequent ghost playback remains a useful playtest.
