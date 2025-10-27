# Changelog

## Upstream Releases (workoutmachineappfree/workoutmachineappfree.github.io)

### Unreleased
- Added optional per-cable load limit control; when set, progression/regression stops once either cable reaches the limit.
  - UI: new field in Program section; supports kg/lb units, blank disables the cap.
  - Implementation: monitor loop flattens progression via existing 96-byte frame (offset 0x58 per-cable kg, 0x5C progression set to 0).
  - Reminder: requires manual hardware validation before merge.

### 2025-10-26
- **View Previous Workouts**: Added feature to view historical workout data on graph (PRs #8, #6)
- **Chart Data Fix**: Ensure latest workout is loaded before displaying
- **Stop at Top**: Added config option to stop at top of final rep (for squats)

### 2025-10-25
- **GATT Queue**: Added operation queue to prevent "GATT operation already in progress" errors
- **Position Bars**: Fixed both position bars to have same max height

### 2025-10-24
- **Weight Units**: Added weight unit selector (kg/lbs)
- **Improved Graph**: Enhanced graph visualization

### 2025-10-23
- **New Modes**: Added Just Lift, Eccentric Only, Progression/Regression modes

---
