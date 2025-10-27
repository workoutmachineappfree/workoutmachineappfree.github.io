# Vitruvian Change Plan (Consolidated)

## Overview
Four short-horizon improvements derived from the latest user session feedback. Each change ships as its own PR to preserve focus, simplify hardware validation, and allow fast rollback. Broader enhancement ideas from the previous planning doc now sit in the “Future Opportunities” appendix so ideation remains visible without diluting the near-term plan.

### Planning Guardrails
- One issue per PR; no feature bundling.
- Every section documents **What / Why / Impact** plus first/second/third-order effects.
- Safety-first: STOP behavior and telemetry integrity trump QoL additions.

### Document Authority & Browser Scope
- This document is the authoritative near-term plan for issue-focused PRs.
- Browser support scope: Chromium-based only — Google Chrome, Microsoft Edge, Brave.
- The former `docs/planning/changes.md` is retired to avoid duplication; its backlog items now live in the “Future Opportunities Backlog.”

### Quality & Testing Baseline
- Run connect → start → stop smoke in Chrome Stable after every change; spot-check in the latest Edge and Brave builds.
- Hardware validation is mandatory for STOP, telemetry, and protocol adjustments.
- Log DevTools console status and Web Bluetooth permission prompts for Chrome, Edge, and Brave in every PR note.
- Rollback remains `git revert <PR>` because each change is scoped to a handful of files.

## Active PR Tracks (Issue-Focused)

### PR 1 – STOP Reliability Enhancements
#### Intent
Ensure the STOP control always halts the trainer immediately, even when pressed mid-set, matching the user’s report that it currently errors unless they reconnect or restart the mode.

#### What / Why / Impact
- **What:** Wrap `VitruvianDevice.sendStopCommand` in guarded retries, clear queued writes before reissuing STOP, and debounce the UI button so overlapping transmissions do not corrupt the queue.
- **Why:** STOP is the primary safety escape. Today it fires a single `buildInitCommand()` write and surfaces raw BLE errors to the user (`app.js:510-521`, `device.js:223-233`).
- **Impact:** Users recover immediately without manual disconnects; reinforces confidence in safety-critical controls.

#### Impact Analysis
- **1st Order:** STOP attempts retry (e.g., 3×/100 ms), outstanding pollers pause, and UI feedback stays immediate.
- **2nd Order:** BLE sessions reset cleanly on failure; rep/monitor listeners tear down predictably; log stream captures every STOP attempt for diagnostics.
- **3rd Order:** Establishes baseline safety bar needed before enabling Just Lift or other free-movement modes.

#### Implementation Notes
- Add a STOP-specific write helper that (a) drains outstanding `writeValueWithResponse` promises, (b) retries on `NetworkError`, and (c) falls back to `device.disconnect()` after final failure.
- Pause `startMonitorPolling` / `startPropertyPolling` during STOP attempts to avoid new commands racing the queue.
- UI: disable STOP button until completion callback resolves; log success/failure with timestamps.

#### Test Requirements
- Browser: verify STOP behavior in Chrome Stable; spot-check latest Edge and Brave for permission prompts and log messages.
- Hardware: trigger STOP mid-program, during rapid commands, and under intentional low-signal conditions.
- Software: simulate rejected promises to confirm retry path and UI messaging.
- Regression: verify normal STOP flow remains <200 ms when BLE link is healthy.

#### Rollback Plan
Revert the STOP helper changes in `device.js` and the button logic in `app.js`; no schema/state migrations involved.

#### Dependencies & Ordering
Must merge first so later features rely on a stable STOP baseline.

---

### PR 2 – Freeze Chart After Set Completion
#### Intent
Match the user request to stop chart scrolling once reps finish so the final data remains visible instead of sliding off-screen.

#### What / Why / Impact
- **What:** Detect workout completion (manual STOP or auto-complete) and freeze the canvas at the last 30 s window until a new session begins. Provide an explicit “Resume Live” control if real-time telemetry continues (e.g., device still connected).
- **Why:** Current graphing already caps `loadHistory` at 300 points, so the reported issue is not memory but UX—data continues to stream after the set, pushing relevant peaks away (`app.js:288-300`).
- **Impact:** Users can review their last set immediately without racing the live feed.

#### Impact Analysis
- **1st Order:** When `completeWorkout()` runs or STOP succeeds, `updateLiveStats` short-circuits to retain the final snapshot.
- **2nd Order:** Log and history summaries stay consistent (same timestamp window as chart). Canvas redraw cadence drops, reducing idle CPU usage.
- **3rd Order:** Establishes a pattern for future “review vs live” modes (e.g., telemetry playback, annotations).

#### Implementation Notes
- Add `this.isGraphFrozen` flag toggled by STOP/auto-complete; gate `loadHistory.push` when frozen.
- Store the last rendered buffer so the canvas redraw still works on resize without new data.
- Provide a `resumeLiveGraph()` action (button or log command) that clears the flag and resumes polling.

#### Test Requirements
- Browser: confirm freeze/resume behavior in Chrome Stable; spot-check latest Edge and Brave for canvas rendering quirks.
- Hardware: finish a programmed set and confirm the chart stays static; restart a new set and verify live feed resumes.
- Simulate STOP mid-set to ensure freeze triggers even without reaching target reps.
- Resize window post-freeze to ensure canvas rerenders using stored snapshot.

#### Rollback Plan
Remove `isGraphFrozen` logic and revert `updateLiveStats` to unconditional pushes; no protocol changes.

#### Dependencies & Ordering
Independent of PR 1 but should follow it in case STOP flow invokes freeze logic.

---

### PR 3 – Final Rep Completion Reliability
#### Intent
Resolve the reported “final rep not executed” behavior by ensuring warm-up/working rep counters and transmitted frames represent the user’s intended count.

#### What / Why / Impact
- **What:** Audit rep tracking (`handleRepNotification`) and program frame construction (`buildProgramParams`) to guarantee the device receives `targetReps` exactly and UI counters match device feedback. Add an optional “final-rep compensation” toggle only if a confirmed protocol bit exists; otherwise, fix the off-by-one logic.
- **Why:** Users currently perform an extra rep because either the program frame sends `reps+3` or the rep-complete counter auto-terminates early.
- **Impact:** Set programming becomes trustworthy, eliminating guesswork and safety risk from unexpected deloads.

#### Impact Analysis
- **1st Order:** UI and device agree on rep targets; counters increment and auto-complete precisely at the user’s requested number.
- **2nd Order:** Workout history reflects true effort, improving downstream analytics.
- **3rd Order:** Creates the groundwork for optional advanced toggles (e.g., compensation flag) backed by documented protocol offsets.

#### Implementation Notes
- Inspect captured frames to confirm whether `frame[0x04] = reps + 3` is intentional warm-up encoding or an error; update documentation accordingly.
- Add unit-style tests (DataView asserts) for `buildProgramParams` to catch regressions in byte layout.
- Extend `handleRepNotification` to log raw counters when auto-complete triggers early, aiding hardware debugging.
- Only add a UI toggle if we can name the byte/bit that disables compensation; otherwise keep UI unchanged until verified.

#### Test Requirements
- Browser: validate rep counters and completion messaging in Chrome Stable; optionally spot-check Edge and Brave UI counters.
- Hardware: run sets with various rep counts (including 1, 8, 20) and confirm the device performs every rep.
- Software: mock rep notifications with wrap-around to ensure counters stay accurate.
- Regression: ensure warm-up reps still add exactly three before working reps begin.

#### Rollback Plan
Revert protocol/handler edits; no persistent user data touched.

#### Dependencies & Ordering
Can run in parallel with PR 2 but merges after STOP fix; requires updated protocol docs before PR review.

---

### PR 4 – Rest Timer Display
#### Intent
Provide a simple rest countdown during programmed pauses so users no longer guess timing between sets.

#### What / Why / Impact
- **What:** Surface a MM:SS timer that activates when telemetry or program metadata indicates a rest phase, clears on motion resume, and handles manual STOP gracefully.
- **Why:** Users explicitly asked for rest-period visibility; today they must watch external timers.
- **Impact:** Improves pacing adherence and overall workout UX without touching protocol payloads.

#### Impact Analysis
- **1st Order:** Timer appears near the rep counters when rest begins; hides or resets the instant the next set starts.
- **2nd Order:** Creates an extensible hook for future pacing analytics (e.g., average rest durations, auto-logging).
- **3rd Order:** Encourages future UX polish (sounds, notifications) without mixing into safety-critical code.

#### Implementation Notes
- Detect rest transitions either via program metadata (duration fields per mode) or via telemetry heuristics (e.g., both loads below threshold + no rep notifications for N ticks); document chosen signal.
- Maintain a dedicated timer state machine so countdown continues even if monitor polling hiccups.
- Ensure STOP clears the interval to avoid orphan timers after emergency halts.

#### Test Requirements
- Browser: verify countdown behavior in Chrome Stable; optionally spot-check Edge and Brave for button states and timer updates.
- Hardware: verify timer accuracy across modes with different rest lengths; include zero-rest edge case.
- Manual: spam STOP/START to ensure timers reset without memory leaks.
- Accessibility: confirm timer announcements are readable (ARIA live region if feasible).

#### Rollback Plan
Remove timer DOM and JS module; no protocol or storage implications.

#### Dependencies & Ordering
Merge after PR 3 (pure UX). Safe to develop concurrently once the detection signal is agreed upon.

---

### Implementation Priority
1. PR 1 – STOP reliability.
2. PR 2 – Chart freeze.
3. PR 3 – Rep accuracy.
4. PR 4 – Rest timer.

## Future Opportunities Backlog (from prior changes.md)
These remain valuable but exceed the current feedback scope. Each item keeps its What/Why/Impact summary for future grooming.

### FO 1 – Safe Auto-Stop for Just Lift Mode
- **What:** Enable Just Lift by monitoring cable stagnation and auto-triggering STOP.
- **Why:** Users want free-lift capability without sacrificing safety.
- **Impact:** Unlocks a core hardware mode while formalizing auto-stop patterns for other features.

### FO 2 – Robust BLE Reconnection Flow
- **What:** Automatic reconnection attempts with exponential backoff and state preservation.
- **Why:** Reduces frustration from intermittent BLE drops.
- **Impact:** Improves perceived reliability and keeps workouts intact during brief disconnects.

### FO 3 – Workout History Persistence
- **What:** Save completed workouts (mode, weight, reps, time) to localStorage with CSV export.
- **Why:** Users want longitudinal tracking without cloud services.
- **Impact:** Foundations for analytics and data portability; requires storage quotas and migrations.

### FO 4 – Enhanced Error Recovery & Diagnostics
- **What:** Map technical errors to user-friendly guidance, add “Try This” suggestions, and capture diagnostics (with consent).
- **Why:** Current alerts expose raw exceptions; users need actionable steps.
- **Impact:** Lowers support burden and systematizes troubleshooting patterns.

### FO 5 – Custom Workout Programs
- **What:** Create/save custom rep ranges, rest periods, and resistance curves.
- **Why:** Fixed presets don’t fit all training styles.
- **Impact:** Extends hardware utility; demands strict validation and disclaimers.

### FO 6 – Real-Time Form Feedback
- **What:** Analyze velocity and L/R balance for coaching cues.
- **Why:** Helps prevent injury and highlight asymmetries.
- **Impact:** Adds premium value but requires extra telemetry processing and UI real estate.

### FO 7 – Canvas Rendering Optimization
- **What:** Shift to `requestAnimationFrame`, add dirty-rectangle redraw, and possibly double buffering.
- **Why:** Current full redraws can stutter on low-end devices.
- **Impact:** Smoother visuals and better battery life; prerequisite for richer charts.

### FO 8 – Accessibility Improvements
- **What:** Add ARIA labels, keyboard shortcuts, focus order, and high-contrast support.
- **Why:** Make the app usable for more people and meet WCAG expectations.
- **Impact:** Sets an accessibility bar for all future UI changes.

---

*Next action once this doc is approved: optionally replace `docs/planning/changes.md` with a short pointer to this consolidated plan so contributors know the authoritative source.*
