# Architecture rules
- Preserve the existing imperative Three.js scene inside React; replacing the engine would risk original simulator behavior.
- Use an owned Tween.js Group per mounted universe scene and clear it on teardown so animations update reliably without leaking.
- Derive vessel effects and camera offsets from an Earth-radius-based vessel dimension; planetary/orbit visualization remains independently scaled for navigation.