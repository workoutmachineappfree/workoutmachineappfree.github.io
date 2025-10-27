# Changelog

## Upstream Releases

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

## Fork Contributions

### 2025-10-26
- PR: https://github.com/Allmight97/workoutmachineappfree.github.io/pull/1
- Title: STOP reliability + Freeze Live Graph after Set (PR1+PR2)
- Summary:
  - Hardened STOP behavior with guarded retries and polling pause to ensure immediate, reliable halts.
  - Added graph freeze on STOP or set completion with a visible "Resume Live Graph" control; keeps numeric stats live.
- User impact:
  - Safer workouts: STOP succeeds promptly or disconnects cleanly; clear log feedback.
  - Better review UX: final set data remains visible; simple resume returns to live view.
- Developer impact:
  - Structured logs around STOP attempts and acknowledgements aid diagnostics.
  - Clear, minimal state flags for graph (`isGraphFrozen`, `frozenHistory`) and explicit resume entry point.
- Files changed:
  - app.js – STOP UI debounce/timing; graph freeze/resume helpers; guards in live stats and draw routines.
  - device.js – STOP retries (3x/100ms), pause polling during STOP, disconnect fallback, idempotent guard.
  - index.html – Added hidden "Resume Live Graph" button next to Load History header.

