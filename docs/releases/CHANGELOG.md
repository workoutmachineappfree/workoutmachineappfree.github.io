# Changelog

## 2025-10-26
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

