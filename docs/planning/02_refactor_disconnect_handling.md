# Implementation Plan: Robust Disconnect Handling and State Cleanup

**Priority**: Immediate (Safety)  
**Target PR**: `refactor/disconnect-handling-state-cleanup`  
**Estimated Effort**: Medium (2-3 hours)

**Sequence**: This is PR #2 of 4. Must be done before PR #3 (Listener Lifecycle).

**Synergy**: Establishes the cleanup pattern that PR #3 will use. The disconnect handler created here will call listener cleanup when PR #3 is merged, creating a cohesive cleanup flow.

---

## Intent

When the Vitruvian device disconnects unexpectedly (low battery, out of range, user turns off device), the device layer (`device.js`) properly cleans up BLE resources but the application layer (`app.js`) is not notified. This leaves workout state (`currentWorkout`, listeners, UI) in an inconsistent state, confusing users and potentially causing bugs.

**Goal**: Ensure app layer receives disconnect notifications and properly cleans up workout state, matching the pattern used in `resetRepCountersToEmpty()`.

---

## Blast Radius

### First-Order Impacts (Immediate Changes)

**Files Modified**:
- `device.js`:
  - Add `onDisconnect` callback property (similar to `onLog`)
  - Call `onDisconnect()` in `handleDisconnect()` method
- `app.js`:
  - Add `handleDeviceDisconnect()` method
  - Set `device.onDisconnect` callback in `setupLogging()` or constructor
  - Call cleanup logic (similar to `resetRepCountersToEmpty()`)
  - Update UI state via `updateConnectionStatus(false)`
  - Log disconnect event

**Code Paths Affected**:
- `device.handleDisconnect()` - Now calls callback
- `device.disconnect()` - Already calls `handleDisconnect()`, so inherits benefit
- `app.connect()` - No change needed (already sets up callbacks)
- `app.disconnect()` - No change needed (explicit disconnect already works)

### Second-Order Impacts (Adjacent Systems)

**Listener Lifecycle**:
- Currently listeners accumulate on disconnect (addressed in separate PR)
- This change complements listener cleanup but doesn't fix it directly
- **Coordination**: This PR should be merged before listener lifecycle PR for proper sequencing

**User Experience**:
- Users will see immediate UI feedback on unexpected disconnect
- Workout state will be cleared, preventing confusion
- Log will show disconnect event clearly
- Stop button will be properly disabled

**State Consistency**:
- Workout history remains intact (intentional - disconnected workouts aren't saved)
- Chart data remains intact (intentional - telemetry history preserved)
- Rep counters reset to empty state
- Auto-stop timer hidden

### Third-Order Impacts (Long-term Systemic)

**Debugging**:
- Disconnect events will be logged, improving diagnostics
- State inconsistency bugs will be eliminated
- Easier to trace disconnect-related issues

**Testing**:
- Disconnect scenarios become testable via callback injection
- State cleanup logic is now explicit and auditable

**Future Features**:
- Enables potential "reconnect and resume" feature (if desired later)
- Establishes pattern for other lifecycle events (e.g., connection restored)

---

## Implementation Steps

### Step 1: Add Callback Mechanism to Device Layer
**File**: `device.js`

```javascript
// In constructor, add:
this.onDisconnect = null; // Callback for disconnect events

// In handleDisconnect(), add:
if (this.onDisconnect) {
  try {
    this.onDisconnect();
  } catch (error) {
    console.error("Disconnect callback error:", error);
    // Don't throw - disconnect cleanup must complete
  }
}
```

**Rationale**: Follows existing pattern (`onLog` callback). Non-throwing callback ensures device cleanup always completes.

### Step 2: Add Disconnect Handler to App Layer
**File**: `app.js`

```javascript
// In setupLogging() or constructor, add:
this.device.onDisconnect = () => {
  this.handleDeviceDisconnect();
};

// New method:
handleDeviceDisconnect() {
  // Update connection status first (immediate UI feedback)
  this.updateConnectionStatus(false);
  
  // Log the disconnect
  this.addLogEntry("Device disconnected unexpectedly", "error");
  
  // Clean up workout state if active
  if (this.currentWorkout) {
    this.addLogEntry(
      `Workout interrupted: ${this.currentWorkout.mode} (${this.workingReps} reps completed)`,
      "info"
    );
    // Don't save to history - disconnected workouts aren't "completed"
    this.resetRepCountersToEmpty();
  }
  
  // Ensure UI is consistent
  this.updateStopButtonState();
}
```

**Rationale**: Reuses existing `resetRepCountersToEmpty()` pattern. Explicitly logs interrupted workouts for user awareness.

### Step 3: Test Disconnect Scenarios
**Manual Testing Required**:
1. Start a workout (Program or Echo mode)
2. Turn off device or move out of range
3. Verify:
   - UI shows "Disconnected" status
   - Log shows disconnect message
   - Workout state is cleared
   - Stop button is disabled
   - Rep counters show "-/-"
   - Auto-stop timer hidden
   - No console errors

**Edge Cases**:
- Disconnect during warmup phase
- Disconnect during working reps
- Disconnect during Just Lift mode
- Disconnect immediately after connection (before workout starts)
- Reconnect after disconnect (should allow new workout)

---

## Validation & Testing

### Success Criteria
- ✅ Disconnect during workout clears state properly
- ✅ UI reflects disconnected state immediately
- ✅ No console errors on disconnect
- ✅ Log shows clear disconnect message
- ✅ Workout history not polluted with incomplete workouts
- ✅ Can reconnect and start new workout after disconnect

### Regression Tests
- ✅ Explicit disconnect (via button) still works
- ✅ Connection flow unchanged
- ✅ Workout start/stop flow unchanged
- ✅ Rep counting unchanged
- ✅ Auto-stop timer unchanged

### Hardware Testing Required
- **Must test**: Disconnect scenarios (turn off device, move out of range)
- **Must test**: Reconnect after disconnect
- **Must test**: Multiple disconnect/reconnect cycles

---

## Rollback Plan

If issues arise:
1. Revert PR (simple - only 2 files changed)
2. Device layer will continue to work (callback is optional)
3. App layer will continue to work (missing callback just means no cleanup)
4. No data loss risk (state cleanup is defensive)

**Rollback Risk**: Low - callback is non-breaking addition.

---

## Dependencies & Coordination

**Depends On**: None

**Blocks**: Listener lifecycle management PR (should merge this first)

**Conflicts**: None anticipated

---

## Open Questions

1. **Should disconnected workouts be saved?** 
   - **Decision**: No - only completed workouts saved (matches current behavior)
   - **Rationale**: User may have disconnected intentionally; incomplete workouts would clutter history

2. **Should we show a notification/banner on disconnect?**
   - **Decision**: Log entry is sufficient (current pattern)
   - **Rationale**: Status already shows "Disconnected"; log provides detail

3. **Should we attempt to auto-reconnect?**
   - **Decision**: Not in this PR (future enhancement if desired)
   - **Rationale**: Keep scope minimal; user can manually reconnect

---

## Notes

- This change is **defensive** - it doesn't change existing behavior, only handles missing disconnect notification
- Callback pattern matches existing `onLog` pattern for consistency
- Non-throwing callback ensures device cleanup always completes
- State cleanup reuses existing `resetRepCountersToEmpty()` method (DRY)

---

## Minimal-Diff Rationale

This is the smallest safe change:
- Adds callback mechanism (5 lines)
- Adds disconnect handler (15 lines)
- Reuses existing cleanup logic
- No refactoring of existing code
- No changes to protocol or device communication

**Total LOC change**: ~20 lines added, 0 lines removed

