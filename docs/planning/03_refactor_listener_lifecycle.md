# Implementation Plan: Listener Lifecycle Management

**Priority**: High (Stability)  
**Target PR**: `refactor/listener-lifecycle-management`  
**Estimated Effort**: Low-Medium (1-2 hours)

**Sequence**: This is PR #3 of 4. Depends on PR #2 (Disconnect Handling). Must be done before PR #4 (DRY Cleanup).

**Synergy**: Adds listener management code to `startProgram()` and `startEcho()` methods. PR #4 will then refactor these same methods using helpers, so doing this first ensures DRY cleanup refactors the complete final version rather than requiring rework.

---

## Intent

Currently, `startProgram()` and `startEcho()` add listeners to the device without removing previous ones. Starting multiple workouts without disconnecting causes listener accumulation, leading to:
- Memory leaks (listeners accumulate)
- Duplicate event processing (same event handled multiple times)
- Performance degradation over time

**Goal**: Store listener references and ensure proper cleanup before adding new listeners, following established lifecycle patterns.

---

## Blast Radius

### First-Order Impacts (Immediate Changes)

**Files Modified**:
- `app.js`:
  - Add listener reference properties: `this.monitorListener`, `this.repListener`
  - Modify `startProgram()`: Remove old listeners before adding new
  - Modify `startEcho()`: Remove old listeners before adding new
  - Modify `resetRepCountersToEmpty()`: Remove listeners on workout reset
  - Modify `stopWorkout()`: Remove listeners on stop
  - Add `removeAllListeners()` helper method

**Code Paths Affected**:
- `app.startProgram()` - Now removes listeners before adding
- `app.startEcho()` - Now removes listeners before adding
- `app.stopWorkout()` - Now removes listeners
- `app.resetRepCountersToEmpty()` - Now removes listeners
- `app.handleDeviceDisconnect()` - Inherits listener cleanup (if disconnect PR merged first)

### Second-Order Impacts (Adjacent Systems)

**Device Layer**:
- `device.js` already has `removeListener()` methods (currently unused)
- This PR will utilize those methods
- **No changes needed** to `device.js` - existing API is sufficient

**Listener Pattern**:
- Establishes explicit listener lifecycle pattern
- Makes listener management auditable
- Sets precedent for future event listeners

**Memory Usage**:
- Prevents listener accumulation
- Eliminates memory leak risk
- Reduces event handler overhead

**Event Processing**:
- Eliminates duplicate event handling
- Ensures single handler per event type
- Prevents race conditions from multiple handlers

### Third-Order Impacts (Long-term Systemic)

**Debugging**:
- Listener references are explicit (easier to debug)
- Listener lifecycle is traceable
- Memory leaks eliminated

**Testing**:
- Listener lifecycle becomes testable
- Can verify listeners are removed correctly
- Can test for duplicate processing

**Future Features**:
- Pattern established for additional listeners (if needed)
- Enables listener prioritization (if needed later)
- Supports listener debugging/monitoring tools

---

## Implementation Steps

### Step 1: Add Listener References to App State
**File**: `app.js`

```javascript
// In constructor, add:
this.monitorListener = null; // Reference to monitor listener
this.repListener = null; // Reference to rep listener
```

**Rationale**: Makes listener references explicit and trackable.

### Step 2: Create Listener Removal Helper
**File**: `app.js`

```javascript
// New method:
removeAllListeners() {
  if (this.monitorListener) {
    // Note: device.js doesn't have removeMonitorListener method
    // We'll need to track index or use a different approach
    // For now, we'll clear listener references and rely on device layer
    this.monitorListener = null;
  }
  if (this.repListener) {
    this.repListener = null;
  }
  // Device layer listeners array will be cleared on disconnect
  // But we need to prevent duplicate handlers during active session
}
```

**Wait**: Device layer doesn't expose `removeListener()` methods. Need to check device.js API.

**Revision**: After checking device.js, listeners are stored in arrays. We can:
- Option A: Add `removeListener()` methods to device.js
- Option B: Clear listeners array when starting new workout (simpler)

**Decision**: Option B - Clear listeners array before adding new ones (simpler, matches disconnect pattern).

**Revised Step 2**:

```javascript
// In device.js, add method:
removeAllListeners() {
  this.monitorListeners = [];
  this.repListeners = [];
  this.propertyListeners = [];
}

// In app.js, add method:
removeAllListeners() {
  this.device.removeAllListeners();
  this.monitorListener = null;
  this.repListener = null;
}
```

**Rationale**: Clearing arrays is simpler than tracking individual references. Matches disconnect cleanup pattern.

### Step 3: Update startProgram() to Remove Listeners
**File**: `app.js`

```javascript
// In startProgram(), before adding listeners:
this.removeAllListeners(); // Remove any existing listeners

// Store references:
this.monitorListener = (sample) => {
  this.updateLiveStats(sample);
};
this.repListener = (data) => {
  this.handleRepNotification(data);
};

// Add listeners:
this.device.addMonitorListener(this.monitorListener);
this.device.addRepListener(this.repListener);
```

**Rationale**: Idempotent pattern - safe to call multiple times.

### Step 4: Update startEcho() Similarly
**File**: `app.js`

```javascript
// Same pattern as startProgram()
this.removeAllListeners();
this.monitorListener = (sample) => {
  this.updateLiveStats(sample);
};
this.repListener = (data) => {
  this.handleRepNotification(data);
};
this.device.addMonitorListener(this.monitorListener);
this.device.addRepListener(this.repListener);
```

**Rationale**: Consistent pattern across both workout start methods.

### Step 5: Update stopWorkout() to Remove Listeners
**File**: `app.js`

```javascript
// In stopWorkout(), after device.stopWorkout():
this.removeAllListeners();
```

**Rationale**: Clean up listeners when workout stops explicitly.

### Step 6: Update resetRepCountersToEmpty() to Remove Listeners
**File**: `app.js`

```javascript
// In resetRepCountersToEmpty(), add:
this.removeAllListeners();
```

**Rationale**: Clean up listeners when state is reset.

---

## Device Layer Changes

### Add removeAllListeners() to device.js

```javascript
// In VitruvianDevice class:
removeAllListeners() {
  this.monitorListeners = [];
  this.repListeners = [];
  this.propertyListeners = [];
  this.log("All listeners cleared", "info");
}
```

**Rationale**: Simple array clearing. Matches disconnect cleanup pattern.

---

## Validation & Testing

### Success Criteria
- ✅ Starting new workout removes previous listeners
- ✅ Stopping workout removes listeners
- ✅ Multiple workout starts don't accumulate listeners
- ✅ No duplicate event processing
- ✅ Memory doesn't grow with repeated workouts
- ✅ Disconnect cleanup removes listeners (if disconnect PR merged)

### Regression Tests
- ✅ Single workout start/stop works correctly
- ✅ Event handlers still receive events
- ✅ Rep counting unchanged
- ✅ Telemetry updates unchanged
- ✅ Auto-stop timer unchanged

### Performance Testing
- **Manual**: Start 10 workouts in sequence, verify memory stable
- **Manual**: Check DevTools Performance tab for listener accumulation
- **Manual**: Verify no duplicate log entries from event handlers

### Hardware Testing Required
- **Must test**: Start workout → stop → start again (verify no duplicates)
- **Must test**: Start workout → disconnect → reconnect → start (verify cleanup)
- **Nice to have**: Memory profiling during extended session

---

## Rollback Plan

If issues arise:
1. Revert PR (simple - clear changes)
2. Device layer `removeAllListeners()` is safe to remove (unused)
3. App layer listener references become unused (harmless)
4. No data loss risk

**Rollback Risk**: Low - changes are additive cleanup.

---

## Dependencies & Coordination

**Depends On**: 
- None (standalone)
- **Recommended**: Merge after disconnect handling PR (so disconnect cleanup also removes listeners)

**Blocks**: None

**Conflicts**: None anticipated

---

## Open Questions

1. **Should we add listener counts to debug logs?**
   - **Decision**: Yes - log listener count when clearing (helps debugging)
   - **Rationale**: Useful for verifying cleanup works

2. **Should we prevent listener removal during active workout?**
   - **Decision**: No - removal is idempotent, safe to call anytime
   - **Rationale**: Simplifies logic; no harm in redundant removal

3. **Should property listeners also be managed?**
   - **Decision**: Not in this PR (currently unused)
   - **Rationale**: Keep scope minimal; add if needed later

---

## Notes

- This change is **defensive** - prevents bug rather than fixing existing bug
- Listener array clearing is simpler than individual removal
- Pattern matches disconnect cleanup approach
- Explicit references make debugging easier

---

## Minimal-Diff Rationale

This is the smallest safe change:
- Adds listener reference storage (2 lines)
- Adds removal helper (1 method, ~10 lines)
- Updates 4 methods to call removal (1 line each)
- Adds device layer helper (1 method, ~5 lines)

**Total LOC change**: ~25 lines added, 0 lines removed

**Alternative Considered**: Individual listener removal via tracking indices
- **Rejected**: More complex, harder to maintain
- **Rationale**: Array clearing is simpler and sufficient

