# Implementation Plan: Protocol Input Validation Hardening

**Priority**: High (Safety)  
**Target PR**: `baseline/protocol-input-validation`  
**Estimated Effort**: Low-Medium (1-1.5 hours)

**Sequence**: Can proceed in parallel with PR 05 but touches `protocol.js` only.

**Synergy**: Refines earlier frame-length validation idea to guard real mistakes (bad user inputs, incomplete color schemes) without adding dead checks.

---

## Intent

Frame builders always allocate fixed-size typed arrays, so length checks never fire. The real risk comes from invalid caller inputs (missing colors, out-of-range weights/percentages, wrong sequence IDs) that silently produce frames the hardware interprets unpredictably.

**Goal**: Fail fast when user- or caller-provided values fall outside safe bounds, while keeping valid flows untouched.

---

## Blast Radius

### First-Order Impacts

**Files**
- `protocol.js`
  - Introduce `assertRange(value, { min, max, label, unit })`, `assertEnum(value, allowed, label)`, and `assertColorArray(colors)` helpers.
  - Within `buildProgramParams`, `buildEchoControl`, and `buildColorScheme`, validate:
    - `perCableKg`, `effectiveKg`, `progressionKg` within documented limits (0–100 kg, -3–3 kg, etc.).
    - `sequenceID` matches the expected constant per frame.
    - Echo `eccentricPct`, `warmupReps`, `targetReps`, `level` values stay in supported ranges.
    - `colors` array contains exactly three colors with 0–255 channel values.
  - Preserve existing typed array allocations; helpers throw descriptive `Error`s if violations occur.
- `app.js`
  - Existing try/catch blocks already surface builder errors; ensure log copy relays new messages cleanly.

### Second-Order Impacts

- **User Feedback**: Start actions that violate constraints throw immediately with clear messages (e.g., "Color scheme requires 3 colors, received 2").
- **Logging**: Error logs now point to the specific field that violated limits.
- **Development**: Future protocol tweaks must update a single helper constant, making contracts explicit.

### Third-Order Impacts

- Establishes a reusable validation toolkit for future frames.
- Prevents malformed frames from reaching hardware, reducing triage time.
- Encourages documenting limits directly in code (aligns with reverse-engineering effort).

---

## Implementation Steps

1. **Define constants** near the top of `protocol.js` (e.g., `PROGRAM_MAX_KG`, `PROGRESSION_RANGE`, `ECHO_PERCENT_RANGE`).

2. **Create helpers**
   - `assertRange` throws `Error` with human-readable message including expected range and actual value.
   - `assertEnum` ensures enumerated values (e.g., Echo levels) are within allowed set.
   - `assertColorArray` enforces array length === 3 and each channel 0–255.

3. **Apply helpers in builders**
   - `buildProgramParams`: guard incoming values before writing to the frame. Validate derived effective weight stays within safe cap.
   - `buildEchoControl`: validate `level`, `eccentricPct`, `targetReps`, etc.
   - `buildColorScheme`: validate brightness (0.0–1.0 per current behavior) and colors.

4. **Surface helpful errors**
   - Error messages should cite the frame type and offending field (e.g., `Program params invalid: progression -5 kg outside -3–3 kg`).
   - Avoid logging stack traces at the device layer; rely on thrown `Error`.

5. **Testing**
   - Manual sanity: run standard Program/Echo/Color flows to ensure no errors for valid inputs.
   - Intentional invalid cases (during development) to confirm the correct message appears.
   - Hardware: quick smoke to verify valid frames still execute.

---

## Regression Risks

- Throwing errors for previously accepted-but-bad values is intentional; ensure messages guide the UI to fix inputs.
- Brightness and weight caps must match observed hardware behavior—verify via docs or captures before finalizing numbers.

---

## Rollback

- Revert PR to restore current behavior (no validation helpers).
- No persistent state touched; rollback is safe.

---

## Principle Ratings

- **Design**: 4/5 — Validation logic co-locates with protocol builders, reinforcing single responsibility.
- **Practice**: 4/5 — Focuses on genuine hazards, keeps diff small.

