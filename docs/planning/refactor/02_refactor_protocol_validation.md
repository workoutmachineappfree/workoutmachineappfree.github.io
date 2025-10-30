# Implementation Plan: Fail-Fast Protocol Frame Validation

**Priority**: High (Safety; can run parallel with Disconnect)  
**Target PR**: `refactor/protocol-frame-validation`  
**Estimated Effort**: Low (1 hour)

**Sequence**: PR #2 of 4 (Option A — Step 2). Parallel with PR #1 (Disconnect Handling) or immediately after; independent of other work.

**Synergy**: This PR establishes validation patterns that inform future protocol work. It's independent and can be merged first or last without affecting other refactors.

---

## Intent

Protocol frame builders (`buildProgramParams`, `buildEchoControl`, `buildColorScheme`, etc.) construct binary frames but don't validate frame lengths match expected sizes before transmission. If a coding error or future change produces incorrect frame sizes, malformed frames could be sent to hardware, potentially causing:
- Silent failures (device ignores frame)
- Device errors (unexpected behavior)
- Difficult debugging (error happens at device, not in code)

**Goal**: Add explicit frame length validation in protocol builders, throwing clear errors if frame size doesn't match specification. This enforces Fail Fast principle at protocol boundaries.

---

 

## Blast Radius

### First-Order Impacts (Immediate Changes)

**Files Modified**:
- `protocol.js`:
  - Add validation constants for expected frame sizes
  - Add `validateFrameLength()` helper function
  - Add validation checks at end of each builder function:
    - `buildInitCommand()` → validate 4 bytes
    - `buildInitPreset()` → validate 34 bytes
    - `buildProgramParams()` → validate 96 bytes
    - `buildEchoControl()` → validate 32 bytes
    - `buildColorScheme()` → validate 34 bytes

**Code Paths Affected**:
- All protocol builder functions (defensive checks)
- Frame transmission (no change - validation happens before return)
- Error handling (new error type introduced)

### Second-Order Impacts (Adjacent Systems)

**Device Layer**:
- `device.js` frame transmission unchanged
- Errors now surface earlier (in builder, not at transmission)
- Error messages more specific (identify which builder failed)

**Error Handling**:
- Builder errors will propagate to callers
- Existing try/catch in `app.js` will catch validation errors
- User sees clear error message about frame validation failure

**Debugging**:
- Frame size errors caught immediately
- Clear error messages identify problematic builder
- Easier to trace frame construction issues

**Development Workflow**:
- Catches frame construction bugs during development
- Prevents silent failures in production
- Makes frame specifications explicit

### Third-Order Impacts (Long-term Systemic)

**Code Safety**:
- Establishes pattern for protocol validation
- Sets precedent for future protocol changes
- Makes frame specifications auditable

**Documentation**:
- Frame sizes documented in code (constants)
- Future developers see expected sizes clearly
- Protocol spec becomes self-documenting

**Testing**:
- Validation can be tested independently
- Can intentionally create invalid frames to test error handling
- Frame size becomes part of contract

**Future Protocol Changes**:
- Adding new frame types requires explicit size constants
- Changing frame sizes requires updating constants
- Forces consideration of protocol implications

---

## Implementation Steps

### Step 1: Add Frame Size Constants
**File**: `protocol.js`

```javascript
// At top of file, after UUID constants:
const FRAME_SIZES = {
  INIT_COMMAND: 4,
  INIT_PRESET: 34,
  PROGRAM_PARAMS: 96,
  ECHO_CONTROL: 32,
  COLOR_SCHEME: 34,
};
```

**Rationale**: Centralizes frame size specifications. Makes sizes explicit and auditable.

### Step 2: Add Validation Helper Function
**File**: `protocol.js`

```javascript
// Helper function to validate frame length
function validateFrameLength(frame, expectedSize, frameType) {
  if (frame.length !== expectedSize) {
    throw new Error(
      `Invalid ${frameType} frame size: expected ${expectedSize} bytes, got ${frame.length} bytes`
    );
  }
  return frame;
}
```

**Rationale**: Reusable validation logic. Clear error messages identify problem.

### Step 3: Add Validation to Each Builder

**buildInitCommand()**:
```javascript
function buildInitCommand() {
  const frame = new Uint8Array([0x0a, 0x00, 0x00, 0x00]);
  return validateFrameLength(frame, FRAME_SIZES.INIT_COMMAND, "Init Command");
}
```

**buildInitPreset()**:
```javascript
function buildInitPreset() {
  const frame = new Uint8Array([...]);
  return validateFrameLength(frame, FRAME_SIZES.INIT_PRESET, "Init Preset");
}
```

**buildProgramParams()**:
```javascript
function buildProgramParams(params) {
  const frame = new Uint8Array(96);
  // ... existing frame construction ...
  return validateFrameLength(frame, FRAME_SIZES.PROGRAM_PARAMS, "Program Params");
}
```

**buildEchoControl()**:
```javascript
function buildEchoControl(params) {
  const frame = new Uint8Array(32);
  // ... existing frame construction ...
  return validateFrameLength(frame, FRAME_SIZES.ECHO_CONTROL, "Echo Control");
}
```

**buildColorScheme()**:
```javascript
function buildColorScheme(brightness, colors) {
  const frame = new Uint8Array(34);
  // ... existing frame construction ...
  return validateFrameLength(frame, FRAME_SIZES.COLOR_SCHEME, "Color Scheme");
}
```

**Rationale**: Validation happens at construction time, before frame leaves builder. Fail fast principle.

---

## Validation & Testing

### Success Criteria
- ✅ Valid frames pass validation (no change in behavior)
- ✅ Invalid frame sizes throw clear errors
- ✅ Error messages identify problematic builder
- ✅ Errors propagate to caller correctly
- ✅ Existing error handling catches validation errors

### Unit Testing (Manual)

**Test Valid Frames**:
- Call each builder with valid inputs
- Verify frames are returned unchanged
- Verify no errors thrown

**Test Invalid Frames** (requires intentional bugs):
- Temporarily modify builder to create wrong-size frame
- Verify error is thrown with clear message
- Verify error identifies correct builder

### Regression Tests
- ✅ Program mode start still works
- ✅ Echo mode start still works
- ✅ Color scheme setting still works
- ✅ Device initialization still works
- ✅ Frame transmission unchanged

### Hardware Testing Required
- **Must test**: Normal operation unchanged (validation is transparent)
- **Nice to have**: Intentionally break frame size to verify error message

---

## Rollback Plan

If issues arise:
1. Revert PR (simple - validation additions)
2. Remove validation calls (frames still work)
3. Remove constants (unused)
4. No data loss risk

**Rollback Risk**: Very Low - validation is defensive only.

---

## Dependencies & Coordination

**Depends On**: None

**Blocks**: None

**Conflicts**: None anticipated

**Coordination**: If frame sizes change in future, update constants accordingly.

---

## Open Questions

1. **Should we validate frame contents (not just length)?**
   - **Decision**: Not in this PR (out of scope)
   - **Rationale**: Length validation is most critical; content validation is complex
   - **Future**: Could add content validation if needed

2. **Should validation be conditional (dev vs production)?**
   - **Decision**: No - always validate
   - **Rationale**: Fail fast everywhere; no performance cost; catches bugs early

3. **Should we log frame sizes for debugging?**
   - **Decision**: Not in this PR (device.js already logs hex)
   - **Rationale**: Existing logging sufficient; validation error message provides size info

---

## Edge Cases

**Future Frame Size Changes**:
- If protocol changes, update constants
- Validation will catch mismatches
- Forces explicit consideration of protocol changes

**Dynamic Frame Sizes**:
- Current frames are fixed-size (no dynamic sizes)
- If future frames are variable-size, validation approach will need adjustment
- Not a concern for current implementation

---

## Notes

- This change is **defensive** - adds safety checks without changing behavior
- Validation happens at construction time (fail fast)
- Error messages are clear and actionable
- Pattern establishes precedent for future protocol validation

---

## Minimal-Diff Rationale

This is the smallest safe change:
- Adds size constants (6 lines)
- Adds validation helper (1 function, ~6 lines)
- Adds validation calls (5 builders, 1 line each)

**Total LOC change**: ~17 lines added, 0 lines removed

**Alternative Considered**: Inline validation in each builder
- **Rejected**: Less DRY, harder to maintain
- **Rationale**: Helper function ensures consistent error messages

**Alternative Considered**: Assertion-style validation (console.warn instead of throw)
- **Rejected**: Violates Fail Fast principle
- **Rationale**: Errors should fail fast, not warn silently

