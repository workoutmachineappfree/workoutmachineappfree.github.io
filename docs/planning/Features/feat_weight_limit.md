# FEATURE: WEIGHT LIMIT README BRIEF
UI Mockup:
![Weight Limit UI Mockup](../images/weight_limit_ui_mockup.png)

## Summary
Add an optional limit that caps per‑rep progression or regression of **Weight per cable** during **Program Mode**. When the cap is reached, the session continues at the capped weight for the remainder of the reps (or indefinitely if **Just Lift Mode** is enabled). This is achieved entirely in the web app by scheduling next‑rep targets and sending normal “set weight” commands **only when the cables are unloaded**. No firmware changes are required.

## Problem & Motivation
- Users want progressive loading that **stops at a target ceiling/floor** without manual intervention.
- Current progression climbs (or declines) linearly for the whole session.
- Without a cap, users either overshoot or must stop early to reconfigure weight, disrupting flow and safety.

## Scope
- **In scope:** Program Mode only (including the “Just Lift Mode” checkbox behavior inside Program Mode).
- **Out of scope:** Non‑Program modes, mid‑rep weight changes, firmware modifications, and changes to device mechanical limits or increments.

## Key Concepts
- **Starting weight (w₀):** initial “Weight per cable.”
- **Progression rate (Δ):** kg per rep; positive = increase, negative = decrease; only one direction per session.
- **Limit (L):** optional max (when Δ>0) or min (when Δ<0). If omitted, behavior is unchanged from today.
- **Saturation:** once the computed target reaches L, subsequent reps hold at L.

## UX Specification
- Place a **single, conditional input** between “Progression/Regression” and “Number of reps / Just Lift Mode.”
  - If Δ>0 → label: **“Max Weight Limit”**.
  - If Δ<0 → label: **“Min Weight Limit”**.
  - If Δ=0 → the field is hidden/ignored.
- Validation rules (inline errors, disable “Start Program” on invalid):
  - For Δ>0: limit must be ≥ starting weight.
  - For Δ<0: limit must be ≤ starting weight.
  - Clamp to device min/max and to protocol step size.
- Units follow the existing unit selector; values are displayed in the user’s unit but normalized to kg internally.
- When a session is running, freeze all inputs relevant to the session plan.

## Behavioral Contract
- The app computes the next‑rep target using `w₀ + i·Δ`, with optional saturation at L.
- The app sends the next target **only while both cables are unloaded** (short “safe window” detected from telemetry).
- After saturation, the target remains at L for the remainder of the session:
  - **Fixed reps:** finish remaining reps at L.
  - **Just Lift Mode:** continue at L until the auto‑stop rest condition ends the session.
- If no safe window occurs (user never unloads), the app does **not** send a change; last safe target persists.

## Safety Model
- Never change weight under load.
- Gate all updates on a short, confirmed rest window (e.g., force near zero for ≥ a few hundred ms).
- One update per window; debounced to prevent multiple sends.
- All targets are clamped to device limits and rounded to the device’s smallest supported increment.

## Assumptions
- The app already supports: reading telemetry (force/velocity or rest detection), sending “set weight” commands, unit conversion, and Program Mode control.
- Firmware allows weight changes between reps and does not require a session restart to accept new targets.
- Progression direction is single‑axis per session (existing limitation).

## First‑Order Impacts
- **UI:** One new conditional field; minor validation logic; no layout upheaval.
- **Control flow:** The browser—not firmware—manages per‑rep progression and saturation.
- **Safety:** Introduces a strict “safe window” gate around all mid‑set updates.

## Second‑Order Impacts
- **User experience:** Smoother sessions (no manual reconfiguration mid‑set); clearer mental model for progression.
- **Reliability:** If BLE packets drop during a window, the user simply performs one more rep at the prior weight—no jolt.
- **Performance & battery:** Slightly higher command frequency (one per rep), still low duty cycle; negligible impact.
- **Interfeature interactions:** Uses the same “rest” primitives as Just Lift auto‑stop; must coordinate timers/gates to avoid conflicts.

## Third‑Order Impacts
- **Programming:** Enables templates like “ramp to target, then volume at target,” which simplifies periodization.
- **Data & analytics:** Opens the door to tracking “reps at cap” as a new metric.
- **Ecosystem:** Paves the way for future caps (e.g., velocity or ROM caps) using the same “safe window” pattern.

## Non‑Goals & Limitations
- No internal firmware enforcement of the cap.
- No per‑phase (eccentric/concentric) differing caps in this iteration.
- No mid‑rep adjustments; that would violate the safety model.

## Rollout
- Ship behind a local feature flag.
- Start with conservative safe‑window thresholds.
- Instrument with lightweight logs/counters for target sequences and send timing.
- Expand to default after hardware smoke tests show no mid‑rep jitter.

## Risks & Mitigations
- **Mis‑detected safe windows** → Use conservative thresholds; add hysteresis; log for tuning.
- **Unit/rounding mismatches** → Centralize conversion/rounding; validate on send.
- **User confusion about hidden field** → Helper text and dynamic label; disable when Δ=0.

## Acceptance Criteria
- With Δ>0 and L set, the sequence increases to L and then stays at L until session end.
- With Δ<0 and L set, the sequence decreases to L and then stays at L.
- With Δ=0 or L empty, behavior matches today.
- No weight changes occur while under load.

# FEATURE: WEIGHT LIMIT IMPLEMENTATION PLAN

## Objective
Implement a **saturating progression/regression limit** in Program Mode without firmware changes. The browser computes and applies next‑rep targets and sends weight updates only in safe, unloaded windows.

## High‑Level Design
- **Planner:** Builds a session plan from form inputs (start weight, Δ, optional limit, reps or Just Lift).
- **Scheduler:** Provides successive target weights (linear progression with saturation at the limit).
- **Safety Gate:** Observes telemetry to detect short “unloaded” windows and authorizes exactly one update per window.
- **Sender:** Issues a normal “set weight per cable” command with units converted and rounded to device increment.
- **Session Controller:** Orchestrates start/stop, locks the UI, and advances the schedule when the safety gate opens.

## Assumptions
- Telemetry stream exposes enough signal to detect “unloaded” (e.g., low force/velocity) or the app already has a rest detector used by Just Lift auto‑stop.
- There is a reliable “set weight” command usable at any time between reps.
- Device min/max and step size are known or already centralized in constants/utilities.

## UI Work
- Add a single **conditional** numeric input between Progression/Regression and Reps/Just Lift.
  - Label toggles between “Max Weight Limit” (Δ>0) and “Min Weight Limit” (Δ<0).
  - Hidden when Δ=0.
  - Inline validation and helper text; disable during an active session.
- Ensure values adhere to:
  - For Δ>0: limit ≥ start; for Δ<0: limit ≤ start.
  - Clamp to device bounds; round to increment; respect unit selector.

## Data Model
- Session plan fields: `startKg`, `deltaKgPerRep`, `limitKg|null`, `reps|null` (null when Just Lift), `justLift:boolean`, `unit`.
- Derived properties:
  - `direction` from sign of delta.
  - `hasLimit` from presence of limit and delta ≠ 0.
  - `saturatedAtIndex` (first i where the linear target crosses the limit), computed lazily or on demand.

## Scheduler Behavior
- For rep index `i`, compute linear target from `startKg + i·deltaKgPerRep`.
- If `hasLimit`, apply saturation at the limit depending on direction.
- For **fixed reps**, the sequence ends at `reps`.
- For **Just Lift**, after saturation the scheduler continually returns the limit value.
- All emitted targets are clamped to device min/max and quantized to device increment **before** sending.

## Safety Gate
- Input: telemetry frames (force and/or velocity per cable) or an existing “rest” signal.
- Detect an **unloaded window** using two conditions:
  - Both cables below a conservative force threshold.
  - Stable for a short window (hundreds of milliseconds) with hysteresis.
- Emit a “window ready” event once per window, then lock until load resumes.
- If the user holds tension (no window), no update occurs; scheduling simply waits.

## Session Controller
- Reads and validates form values; normalizes to kg.
- Starts Program Mode with firmware progression disabled (or left unconfigured).
- Sends initial target when the first safe window opens.
- On each subsequent safe window, requests the next scheduler value and sends it.
- Stops on: end of fixed reps, Just Lift auto‑stop, manual stop, or disconnect.
- Locks relevant inputs during a session; unlocks on stop; ignores edits mid‑session.

## Integration Points by File (existing repo layout)
- **index.html**
  - Add the conditional limit input and helper text in the Program Mode form.
  - Hook UI events for visibility toggle and validation messaging.
- **app.js**
  - Build the **planner** and **scheduler** components.
  - Implement the **session controller** that subscribes to safety‑gate events and advances the schedule.
  - Centralize unit conversion and increment rounding; clamp to device bounds.
  - Reuse the shared input helpers and lifecycle cleanup introduced by the baseline PRs.
  - UI state management: disable/enable fields during run; surface inline errors; feature flag toggle.
- **device.js**
  - Implement the **safety gate** from telemetry; provide a single‑shot “window ready” event.
  - Provide a method that enqueues a weight change to be sent on the next available window.
  - Handle disconnect/reconnect: cache last sent target and resend safely after recovery.
- **protocol.js**
  - Reuse/confirm the builder for **set weight per cable**.
  - Ensure rounding/increment constraints are enforced before frame construction, leveraging the protocol validation helpers from `baseline/protocol-input-validation` to enforce range and sequence contracts.
- **modes.js**
  - Extend Program Mode config to carry `limit` (nullable) alongside `delta`.
  - Expose device min/max and increment constants if not already centralized.

## Validation Rules (start‑button guardrails)
- When Δ>0: limit omitted → allowed; limit provided → must be ≥ start.
- When Δ<0: limit omitted → allowed; limit provided → must be ≤ start.
- When Δ=0: limit is ignored; field hidden.
- All numeric inputs must pass unit normalization, device bounds, and increment quantization checks.
 - Reuse the protocol validation helpers introduced in the baseline refactor so feature logic stays aligned with enforced bounds and sequence IDs.

## Observability
- Log lightweight events (dev console or in‑app debug overlay):
  - Planned target sequence (first few values).
  - “Safe window opened/closed” timestamps.
  - “Target sent” with value and rep index.
  - Reasons for skipped sends (no window, invalid input, clamp).
- Counters: number of updates per session, time to first update, number of saturated reps.

## Test Plan
- **Offline simulation:** add a mock device or stubbed telemetry to simulate load vs. rest windows.
  - Verify sequences for: progression to max, regression to min, no limit, limit equal to start.
  - Verify no sends occur under simulated load.
- **On‑device smoke tests:** low loads; increasing and decreasing scenarios; Just Lift and fixed reps.
  - Confirm smooth transitions only at rest; confirm hold at cap after saturation.
- **Failure modes:** BLE hiccups, missed windows (continuous tension), mid‑session UI edits (ignored), unit toggles (disabled during session).
- **Performance:** ensure update latency from window open to send is sub‑second and stable.

## Rollout & Toggles
- Gate behind a feature flag (URL param or localStorage).
- Ship to Chrome (desktop), iOS Bluefy, Android Chrome.
- Collect debug logs during initial hardware sessions; tune thresholds if needed.
- Make default once stability confirmed.

## Risks & Mitigations
- **Threshold tuning errors:** start conservative; provide a hidden debug panel to adjust during testing.
- **Protocol mismatches (step size/limits):** centralize constants; block start if inputs quantize outside bounds.
- **User confusion about hidden field:** add helper text; only show when Δ≠0; disable during runs.

## Definition of Done
- All acceptance criteria in the feature README pass on hardware.
- No mid‑rep weight changes observed across smoke tests.
- UI/validation works in all supported browsers.
- Feature flag can enable/disable behavior without code changes.
- Documentation updated: user‑facing help text and developer notes.

## Acceptance Criteria (for agents)
- With Δ>0 and L set above start: sequence rises to L and then remains at L until session end (both fixed reps and Just Lift).
- With Δ<0 and L set below start: sequence falls to L and then remains at L.
- With Δ=0 or L omitted: behavior identical to current app.
- All updates occur only during detected safe windows; none under continuous tension.
- Input validation prevents illegal configurations; the Start button is disabled on invalid state.
