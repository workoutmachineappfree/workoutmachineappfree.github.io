# Implementation Plan: Targeted Controller DRY Refactor

**Priority**: Medium (Maintainability)  
**Target PR**: `baseline/controller-dry-refactor`  
**Estimated Effort**: Medium (≈2 hours)

**Sequence**: After PR 05 merges (so we refactor the finalized lifecycle code). Independent of PR 06.

**Synergy**: Tightens up `startProgram` and `startEcho` once lifecycle fixes are in place, making the controllers easier to extend for future features.

---

## Intent

`startProgram()` (~150 LOC) and `startEcho()` (~100 LOC) repeat validation and DOM access patterns, making them harder to reason about when we add new functionality. Earlier DRY proposal introduced broad helpers that risked behavior changes.

**Goal**: Extract small, intention-revealing helpers that remove duplication without altering UX or introducing over-abstraction.

---

## Blast Radius

### First-Order Impacts

**Files**
- `app.js`
  - Add focused helpers:
    - `readFloatInput(id)` / `readIntInput(id)` that return parsed values or `NaN` (no implicit defaults).
    - `validateRange({ value, min, max, message, unit })` used by both start methods; retains existing alert copy.
    - Optional `toggleAutoStopTimer(isVisible)` to centralize DOM toggling.
  - Refactor `startProgram()` and `startEcho()` to use helpers, keeping overall flow identical (including Just Lift paths and error alerts).
  - Optionally extract workout record creation into a small method if it reduces duplication without hiding important logic.

**Non-Goals**
- No global DOM caching/logging helper unless an element is referenced repeatedly and benefits from caching.
- Do not change NaN semantics—blank inputs should still fail validation.
- No feature changes (e.g., new modes, UI tweaks).

### Second-Order Impacts

- Reduced cognitive load when reading controller logic.
- Consistent validation behavior makes future changes safer.
- Helpers are small enough to test individually later if desired.

### Third-Order Impacts

- Sets groundwork for future feature additions without wading through duplicated logic.
- Maintains KISS/YAGNI by limiting helper surface area.

---

## Implementation Steps

1. **Prepare helpers**
   - Implement `readFloatInput(id)` / `readIntInput(id)` that fetch elements, parse values, and log a single warning if the element is missing.
   - Implement `validateRange` that returns `true/false` and triggers alerts that match current copy (strings can be constants reused by both controllers).
   - Optional: `toggleAutoStopTimer(isVisible)` to hide/show the element without duplicating DOM code.

2. **Refactor `startProgram()`**
   - Replace inline parsing and range checks with helpers.
   - Preserve order of operations (set targets before starting workout, register listeners after device call, etc.).

3. **Refactor `startEcho()`**
   - Apply the same helpers and ensure Just Lift logic mirrors existing behavior.

4. **Housekeeping**
   - Update comments sparingly to clarify helper intent where not obvious.
   - Confirm listener setup remains exactly once per workout (relies on PR 05 changes).

5. **Testing**
   - Manual regression for program and echo flows with valid and invalid inputs.
   - Verify alerts trigger for the same cases as before (empty fields, range violations).
   - Quick smoke to ensure auto-stop timer toggles correctly.

---

## Regression Risks

- Helper misuse could change validation text; mitigate by reusing existing strings or storing them centrally.
- Ensure helper functions handle missing DOM nodes gracefully without spamming logs.

---

## Rollback

- Revert PR to restore original controller methods; no persistent data touched.

---

## Principle Ratings

- **Design**: 3.5/5 — Increases cohesion and keeps helpers scoped to controllers.
- **Practice**: 3.5/5 — Reduces duplication without over-abstraction.

