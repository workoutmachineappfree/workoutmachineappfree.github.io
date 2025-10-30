# Implementation Plan: Disconnect Handling & Listener Cleanup

**Priority**: Immediate (Safety & Stability)  
**Target PR**: `baseline/disconnect-state-lifecycle`  
**Estimated Effort**: Medium (2-3 hours)

**Sequence**: Ship first before any other baseline work. Foundations for clean lifecycle.

**Synergy**: Merges earlier disconnect (01) and listener lifecycle (03) plans so state handling lands as one coherent change. Prevents follow-up PRs from rewriting the same sections twice.

---

## Intent

Unexpected BLE disconnects currently leave the UI thinking we are still connected and keep workout state/listeners alive. Manual stop/reset paths also leave anonymous listeners attached, so the next workout processes telemetry multiple times.

**Goal**: Surface device disconnects to the app layer, clear workout state, and guarantee we only have one set of listeners/pollers active at any time.

---

## Blast Radius

### First-Order Impacts

**Files**
- `device.js`
  - Add `onDisconnect` callback (mirrors `onLog`).
  - Call `onDisconnect` inside `handleDisconnect()` *after* local cleanup. Wrap in `try/catch` and log errors.
  - Add `removeAllListeners()` that clears `monitorListeners`, `repListeners`, `propertyListeners` and logs a debug line.
- `app.js`
  - Add `handleDeviceDisconnect()` that updates connection status, logs a neutral message (e.g., "Device disconnected"), stops auto-stop UI, and invokes shared cleanup (`removeAllListeners`, `resetRepCountersToEmpty`, etc.).
  - Assign `this.device.onDisconnect = () => this.handleDeviceDisconnect();` during setup.
  - Introduce `removeAllListeners()` that mirrors device helper (clears references and invokes `device.removeAllListeners()`).
  - Call `removeAllListeners()` from:
    - `handleDeviceDisconnect`
    - `stopWorkout`
    - `resetRepCountersToEmpty`
    - `completeWorkout`
  - Ensure `updateStopButtonState()` is invoked after cleanup so the STOP button reflects reality.

**Code Paths**
- All disconnect flows (manual + unexpected) converge on `handleDeviceDisconnect()` via the callback.
- Workout end/reset flows shed listeners immediately.
- No change to connection initiation, program start, or rep logic besides preventing duplicates.

### Second-Order Impacts

- **Telemetry**: Clearing listeners immediately keeps telemetry processing single-sourced; no need to "pause" to inspect samples—hardware keeps sending notifications, we just drop old handlers.
- **Stop Button UX**: Button quickly reflects disconnected state; tooltip copy remains accurate.
- **Logging**: Disconnection log message becomes consistent regardless of origin.
- **Re-entry Safety**: After cleanup, user can reconnect and start a new workout without leaked handlers.

### Third-Order Impacts

- Simplifies future lifecycle work—new event types can plug into the same helper.
- Easier debugging: disconnect events and listener counts visible via logs.
- Sets precedent for explicit lifecycle management before adding new features.

---

## Implementation Steps

1. **Device-layer callback and helper**
   - Add `this.onDisconnect = null;` in constructor.
   - Implement `removeAllListeners()` that empties listener arrays and logs a debug message with counts cleared.
   - Update `handleDisconnect()` to call `removeAllListeners()` and then fire `onDisconnect` inside a protected block.

2. **App-layer wiring**
   - In constructor or `setupLogging()`, register `device.onDisconnect`.
   - Add class-level properties for listener references if helpful, or rely on helper to null them all.
   - Implement `removeAllListeners()` that nulls stored callbacks and calls `this.device.removeAllListeners()`.

3. **State cleanup entry points**
   - `handleDeviceDisconnect()`: log, call `updateConnectionStatus(false)`, clear timers/listeners, reset workout state.
   - `stopWorkout()` and `completeWorkout()`: invoke `removeAllListeners()` before saving history/resetting UI.
   - `resetRepCountersToEmpty()`: ensure it remains the single source for wiping workout state and now includes listener cleanup.

4. **Manual disconnect**
   - Rely on the `onDisconnect` callback fired from within `device.disconnect()` to route the flow through `handleDeviceDisconnect()`. No additional calls needed; manual-specific logging can remain outside the callback if desired.

5. **Testing**
   - Hardware: connect → start program → power off device. Confirm status flips, STOP disabled, log shows "Device disconnected" once, no telemetry console spam.
   - Manual: connect → start program → stop workout → start again. Verify only one rep event per rep.
   - DevTools: inspect listeners array lengths if needed; confirm they reset between sessions.

---

## Regression Risks

- Minimal: callbacks optional; if app never sets `onDisconnect`, behavior matches today.
- Ensure we do not double-reset state (call order: handle disconnect → reset → update UI). Guard asynchronous races by checking `isConnected` before acting if needed.

---

## Rollback

- Revert PR; device cleanup still works without callbacks, listeners revert to current accumulation behavior (known bug).
- No persistent data; safe rollback.

---

## Principle Ratings

- **Design**: 4/5 — Improves cohesion by centralizing lifecycle handling; mild new coupling via callback is acceptable.
- **Practice**: 4/5 — Minimal diff relative to benefit; fails fast on disconnect.

