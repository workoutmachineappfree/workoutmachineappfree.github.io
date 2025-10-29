# Changelog and Features tracker

## Upstream Releases (workoutmachineappfree/workoutmachineappfree.github.io)

### Unreleased Features
1. [ ] FEATURE: weight/load limit control
  - user wants to set a limit on the weight/load per cable during progression/regression in Program Mode. When set, progression/regression stops once either cable reaches the limit but the session continues at the capped weight for the remainder of the reps (or indefinitely if Just Lift Mode is enabled).
  - Status: In progress, [feature documentation](../planning/feat_weight_limit.md) for more details.
  - UI: new field in Program section that is only visible when "Progression/Regression" has a value other than 0.
2. [ ] FEATURE: Add number of sets to Program Mode
  - e.g. Users want to abilit to set number of sets per workout session in Program Mode.
  - Status: Unplanned.
3. [ ] FEATURE: Add number rest timer between sets
  - e.g. Users want to ability to set a rest timer between sets in Program Mode.
  - Status: Unplanned.

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
