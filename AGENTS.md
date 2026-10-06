# Project rules
- Preserve the original vanilla Three.js universe and its scene lifecycle; do not migrate or reconstruct it for incremental improvements.
- Keep flight tuning and proportional effect calculations in a pure shared module so frame-rate behavior and scale can be regression tested.
- Own all Tween.js animations in an explicit scene-local Group, updated with simulation time and cleared on teardown, because Tween.js 25 does not automatically register tweens.
- Keep camera offsets independent of speed and throttle, because accelerating must not alter vessel framing.