# API Map - Vitruvian Web Control

**Last Updated:** October 2025  
**Purpose:** Comprehensive mapping of all public APIs, event contracts, and data flow patterns across the codebase.

---

## Overview

This document maps public APIs, internal contracts, and data flow patterns. The app follows a layered architecture:
- **UI Layer** (`index.html`) → **Application Layer** (`app.js`) → **Device Layer** (`device.js`) → **Protocol Layer** (`protocol.js`)
- **Configuration Layer** (`modes.js`) provides constants and mode profiles
- **Visualization Layer** (`chart.js`) handles telemetry display

---

## Class APIs

### VitruvianApp (app.js)

#### Constructor
```javascript
new VitruvianApp()
```
**Initializes:**
- Device connection manager (`VitruvianDevice`)
- Chart manager (`ChartManager`)
- UI state (weight unit, rep counters, workout history)
- Event listeners for DOM interactions

**State Variables:**
- `device` - VitruvianDevice instance
- `chartManager` - ChartManager instance
- `weightUnit` - "kg" | "lb"
- `currentWorkout` - Workout object or null
- `warmupReps` - Number of warmup reps completed
- `workingReps` - Number of working reps completed
- `isJustLiftMode` - Boolean flag
- `autoStopStartTime` - Timestamp when auto-stop timer started (null if not active)
- `perCableLimitKg` - Optional per-cable weight limit (null if not set)
- `limitCapApplied` - Boolean flag for whether limit cap has been applied

#### Public Methods

##### Connection Management
- `async connect()` - Connect to Vitruvian device via Web Bluetooth
- `async disconnect()` - Disconnect from device
- `updateConnectionStatus(connected: boolean)` - Update UI connection status

##### Workout Control
- `async startProgram()` - Start Program Mode workout
  - Reads form inputs (mode, weight, reps, progression, limit)
  - Validates inputs
  - Sends initialization + program frames to device
  - Sets up telemetry listeners
  - **Params**: None (reads from DOM)
  - **Returns**: Promise<void>
  - **Throws**: On validation failure or BLE errors

- `async startEcho()` - Start Echo Mode workout
  - Reads form inputs (level, eccentric %, target reps)
  - Validates inputs
  - Sends Echo control frame to device
  - Sets up telemetry listeners
  - **Params**: None (reads from DOM)
  - **Returns**: Promise<void>
  - **Throws**: On validation failure or BLE errors

- `async stopWorkout()` - Stop current workout
  - Sends stop command to device
  - Completes workout and saves to history
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

##### UI State Management
- `toggleJustLiftMode()` - Toggle Just Lift mode checkbox (Program Mode)
- `toggleEchoJustLiftMode()` - Toggle Just Lift mode checkbox (Echo Mode)
- `toggleStopAtTop()` - Toggle "stop at top" setting
- `setWeightUnit(unit: "kg" | "lb")` - Set weight unit and update all displays
- `updateRepCounters()` - Update warmup/working rep counters in UI
- `updateStopButtonState()` - Enable/disable stop button based on connection state

##### Visualization
- `setTimeRange(seconds: number | null)` - Set chart time range (10s, 30s, 60s, 120s, or null for all)
- `exportData()` - Export chart data as CSV
- `viewWorkoutOnGraph(index: number)` - View historical workout on chart

##### Logging
- `addLogEntry(message: string, type: "info" | "success" | "error")` - Add entry to log display

##### Workout History
- `addToWorkoutHistory(workout: Workout)` - Add completed workout to history
- `updateHistoryDisplay()` - Refresh history list UI

##### Color Scheme
- `loadColorPreset()` - Load predefined color scheme from selector
- `async setColorScheme()` - Send color scheme to device
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

##### Rep Processing
- `handleRepNotification(data: Uint8Array)` - Process rep notification from device
  - Parses u16 counters (top, unknown, complete)
  - Tracks top/bottom positions
  - Updates rep counters
  - Handles auto-completion logic

##### Auto-Stop (Just Lift Mode)
- `checkAutoStop(sample: MonitorSample)` - Check if auto-stop should trigger
  - Monitors position to detect "danger zone" (bottom 5% of range)
  - Starts 5s countdown timer when in danger zone
  - Triggers stop if timer completes
  - Resets timer when user moves out of danger zone

- `updateAutoStopUI(progress: number)` - Update auto-stop timer UI
  - `progress`: 0.0 to 1.0 (elapsed time / 5 seconds)
  - Updates circular progress indicator and text display

##### Unit Conversion
- `convertKgToDisplay(kg: number, unit?: string)` - Convert kg to display unit
- `convertDisplayToKg(value: number, unit?: string)` - Convert display unit to kg
- `formatWeightValue(kg: number, decimals?: number)` - Format weight for display
- `formatWeightWithUnit(kg: number, decimals?: number)` - Format weight with unit label

##### Load Limit (Progression Cap)
- `maybeApplyLoadLimit()` - Check if progression limit should be applied
  - Computes next rep target
  - Compares against limit (per-cable)
  - If limit reached, updates program params to cap progression
  - Sends updated frame to device
  - Only applies once per session (`limitCapApplied` flag)

- `updateProgramTrackingAfterRep()` - Update internal tracking after rep completes
  - Adjusts `perCableKg` by `progressionKg`
  - Recomputes `effectiveKg`

##### Rep Range Tracking
- `recordTopPosition(posA: number, posB: number)` - Record top of rep position
- `recordBottomPosition(posA: number, posB: number)` - Record bottom of rep position
- `updateRepRanges()` - Recalculate min/max position ranges from rolling averages
- `updateRangeIndicators()` - Update visual range indicators on position bars

#### Event Listeners (DOM)
- `onclick="app.connect()"` - Connect button
- `onclick="app.disconnect()"` - Disconnect button
- `onclick="app.startProgram()"` - Start Program Mode button
- `onclick="app.startEcho()"` - Start Echo Mode button
- `onclick="app.stopWorkout()"` - Stop button
- `onclick="app.setTimeRange(seconds)"` - Chart time range buttons
- `onclick="app.exportData()"` - Export CSV button
- `onclick="app.viewWorkoutOnGraph(index)"` - View workout button
- `onchange="app.toggleJustLiftMode()"` - Just Lift checkbox (Program Mode)
- `onchange="app.toggleEchoJustLiftMode()"` - Just Lift checkbox (Echo Mode)
- `onchange="app.toggleStopAtTop()"` - Stop at top checkbox

---

### VitruvianDevice (device.js)

#### Constructor
```javascript
new VitruvianDevice()
```
**Initializes:**
- BLE connection state
- GATT service/characteristic handles
- Listener arrays (property, monitor, rep)
- GATT operation queue

**State Variables:**
- `device` - BluetoothDevice instance or null
- `server` - BluetoothRemoteGATTServer instance or null
- `rxChar` - BluetoothRemoteGATTCharacteristic (command write)
- `monitorChar` - BluetoothRemoteGATTCharacteristic (telemetry polling)
- `propertyChar` - BluetoothRemoteGATTCharacteristic (property polling)
- `repNotifyChar` - BluetoothRemoteGATTCharacteristic (rep notifications)
- `isConnected` - Boolean connection state
- `propertyInterval` - setInterval handle for property polling
- `monitorInterval` - setInterval handle for monitor polling
- `gattQueue` - Array of queued GATT operations
- `gattBusy` - Boolean flag for queue processing

#### Public Methods

##### Connection Management
- `async connect()` - Connect to Vitruvian device
  - Requests device via `navigator.bluetooth.requestDevice()`
  - Connects to GATT server
  - Discovers services and characteristics
  - Enables notifications
  - **Returns**: Promise<boolean>
  - **Throws**: On connection failure or missing characteristics

- `async disconnect()` - Disconnect from device
  - Stops polling intervals
  - Closes GATT connection
  - Resets state
  - **Returns**: Promise<void>

##### Command Transmission
- `async sendInit()` - Send initialization sequence
  - Sends 4-byte init command
  - Waits 50ms
  - Sends 34-byte init preset
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

- `async sendStopCommand()` - Send stop command
  - Sends 4-byte init command (same as init)
  - **Returns**: Promise<void>
  - **Throws**: If not connected

- `async startProgram(params: ProgramParams)` - Start Program Mode
  - Builds 96-byte program frame via `buildProgramParams()`
  - Sends frame with response
  - Starts property and monitor polling
  - **Params**: ProgramParams object
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

- `async updateProgramParams(params: ProgramParams)` - Update program parameters mid-session
  - Builds updated 96-byte program frame
  - Sends frame with response
  - **Params**: ProgramParams object
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

- `async startEcho(params: EchoParams)` - Start Echo Mode
  - Builds 32-byte Echo control frame via `buildEchoControl()`
  - Sends frame with response
  - Starts property and monitor polling
  - **Params**: EchoParams object
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

- `async setColorScheme(brightness: number, colors: Array<{r, g, b}>)` - Set LED colors
  - Builds 34-byte color scheme frame via `buildColorScheme()`
  - Sends frame with response
  - **Params**: brightness (0.0-1.0), colors array (3 RGB objects)
  - **Returns**: Promise<void>
  - **Throws**: On BLE errors

##### Polling Management
- `startPropertyPolling()` - Start property polling (every 500ms)
  - Reads property characteristic (0x003f)
  - Dispatches to property listeners
  - **Returns**: void

- `stopPropertyPolling()` - Stop property polling
  - Clears interval
  - **Returns**: void

- `startMonitorPolling()` - Start monitor polling (every 100ms)
  - Reads monitor characteristic (0x0039)
  - Parses telemetry data
  - Dispatches to monitor listeners
  - **Returns**: void

- `stopMonitorPolling()` - Stop monitor polling
  - Clears interval
  - **Returns**: void

##### Data Parsing
- `parseMonitorData(data: Uint8Array)` - Parse monitor characteristic data
  - Extracts: ticks, posA, posB, loadA, loadB
  - Filters invalid position spikes (>50000)
  - **Params**: Raw Uint8Array from characteristic
  - **Returns**: MonitorSample object
  - **Structure**:
    ```typescript
    {
      timestamp: Date,
      ticks: number,      // 32-bit tick counter
      posA: number,       // Right cable position (filtered)
      posB: number,       // Left cable position (filtered)
      loadA: number,      // Right cable load (kg)
      loadB: number,      // Left cable load (kg)
      raw: Uint8Array     // Original data
    }
    ```

##### Event Listeners
- `addPropertyListener(listener: (data: Uint8Array) => void)` - Add property listener
- `addMonitorListener(listener: (sample: MonitorSample) => void)` - Add monitor listener
- `addRepListener(listener: (data: Uint8Array) => void)` - Add rep notification listener
- `onLog` - Callback function for logging (set by app)

##### Internal Methods
- `async queueGattOperation(operation: () => Promise<T>)` - Queue GATT operation
  - Prevents concurrent GATT operations
  - Processes queue sequentially
  - **Returns**: Promise<T>

- `async writeWithResponse(label: string, payload: Uint8Array)` - Write with response
- `async writeWithoutResponse(label: string, payload: Uint8Array)` - Write without response
- `sleep(ms: number)` - Promise-based delay
- `handleDisconnect()` - Internal disconnect handler

---

### ChartManager (chart.js)

#### Constructor
```javascript
new ChartManager(containerId: string)
```
**Initializes:**
- uPlot chart instance
- Data history arrays
- Time range configuration
- Update interval

**State Variables:**
- `chart` - uPlot instance or null
- `loadHistory` - Array of MonitorSample objects
- `maxHistoryPoints` - Maximum data points (72000 = 2hrs at 100ms)
- `currentTimeRange` - Time range in seconds (30 default, null for all)
- `updateInterval` - setInterval handle for periodic updates
- `loadUnit` - Unit configuration object

#### Public Methods

##### Initialization
- `init()` - Initialize uPlot chart
  - Creates chart with 6 series (timestamps, loads, positions)
  - Sets up event markers plugin
  - Starts periodic updates
  - **Returns**: boolean (success)

##### Data Management
- `addData(sample: MonitorSample)` - Add data point
  - Appends to loadHistory
  - Trims to maxHistoryPoints
  - **Params**: MonitorSample object

- `clear()` - Clear all data
- `getDataCount()` - Get current data point count
- `setLoadUnit(config: LoadUnitConfig)` - Set load unit configuration
  - **Params**: `{label: string, decimals: number, toDisplay: (kg) => display}`

##### Visualization
- `setTimeRange(seconds: number | null)` - Set time range
  - Updates chart viewport
  - Sets button active states
  - **Params**: 10, 30, 60, 120, or null (all)

- `update()` - Update chart display (called periodically)
- `updateChartData()` - Refresh chart with current data

##### Event Markers
- `setEventMarkers(markers: Array<{time, label, color}>)` - Set event markers
- `clearEventMarkers()` - Clear event markers

##### Workout Viewing
- `viewWorkout(workout: Workout)` - View historical workout on chart
  - Sets event markers (start, warmup end, end)
  - Adjusts time scale to show workout
  - **Params**: Workout object with startTime/endTime

##### Export
- `exportCSV()` - Export data as CSV file
  - Downloads CSV with timestamp, loads, positions

##### Internal Methods
- `startPeriodicUpdates()` - Start update interval (10ms)
- `stopPeriodicUpdates()` - Stop update interval
- `formatLoadValue(value: number)` - Format load value for display

---

## Protocol Functions (protocol.js)

### Frame Builders

#### `buildInitCommand()` → Uint8Array(4)
- **Purpose**: Initial 4-byte command sent before INIT
- **Returns**: `[0x0a, 0x00, 0x00, 0x00]`

#### `buildInitPreset()` → Uint8Array(34)
- **Purpose**: INIT preset frame with coefficient table
- **Structure**: Header + coefficient data + color pattern
- **Returns**: 34-byte frame

#### `buildProgramParams(params: ProgramParams)` → Uint8Array(96)
- **Purpose**: Build 96-byte program parameters frame
- **Params**: ProgramParams object
  ```typescript
  {
    mode: number,              // ProgramMode enum
    baseMode: number,          // For Just Lift mode
    isJustLift: boolean,
    reps: number,              // 0 if Just Lift
    perCableKg: number,        // Weight per cable (kg)
    effectiveKg: number,       // perCableKg + 10.0
    progressionKg: number,     // kg per rep (can be negative)
    displayUnit: string        // "kg" | "lb"
  }
  ```
- **Frame Structure**:
  - Offset 0x00-0x03: Header (0x04, 0x00, 0x00, 0x00)
  - Offset 0x04: Reps (0xFF for Just Lift, reps+3 otherwise)
  - Offset 0x08, 0x0c, 0x1c: Float32 constants (5.0)
  - Offset 0x30-0x4F: Mode profile block (32 bytes from `getModeProfile()`)
  - Offset 0x54: effectiveKg (Float32 LE)
  - Offset 0x58: perCableKg (Float32 LE)
  - Offset 0x5C: progressionKg (Float32 LE)
- **Returns**: 96-byte frame

#### `buildEchoControl(params: EchoParams)` → Uint8Array(32)
- **Purpose**: Build 32-byte Echo mode control frame
- **Params**: EchoParams object
  ```typescript
  {
    level: number,            // 0-3 (HARD to EPIC)
    eccentricPct: number,    // 0-150
    warmupReps: number,       // Default 3
    targetReps: number,       // 0 if Just Lift
    isJustLift: boolean
  }
  ```
- **Frame Structure**:
  - Offset 0x00-0x03: Command ID (0x0000004e)
  - Offset 0x04: warmupReps (u8)
  - Offset 0x05: targetReps (u8, 0xFF for Just Lift)
  - Offset 0x08: eccentricPct (u16 LE)
  - Offset 0x0A: concentricPct (u16 LE, constant 50)
  - Offset 0x0C: smoothing (Float32 LE)
  - Offset 0x10: gain (Float32 LE)
  - Offset 0x14: cap (Float32 LE)
  - Offset 0x18: floor (Float32 LE)
  - Offset 0x1C: negLimit (Float32 LE)
- **Returns**: 32-byte frame

#### `buildColorScheme(brightness: number, colors: Array<{r, g, b}>)` → Uint8Array(34)
- **Purpose**: Build 34-byte color scheme frame
- **Params**: brightness (0.0-1.0), colors array (3 RGB objects)
- **Frame Structure**:
  - Offset 0x00-0x03: Command ID (0x00000011)
  - Offset 0x04-0x0B: Reserved (zeros)
  - Offset 0x0C: brightness (Float32 LE)
  - Offset 0x10-0x21: Colors (6 RGB triplets, mirrored)
- **Returns**: 34-byte frame

### Helper Functions

#### `bytesToHex(bytes: Uint8Array)` → string
- **Purpose**: Convert byte array to hex string for logging
- **Returns**: Space-separated hex string (e.g., "0a 00 00 00")

---

## Mode Configuration (modes.js)

### Constants

#### ProgramMode (enum)
- `OLD_SCHOOL: 0`
- `PUMP: 1`
- `TUT: 2`
- `TUT_BEAST: 3`
- `ECCENTRIC_ONLY: 4`

#### ProgramModeNames (object)
- Maps mode numbers to display names

#### EchoLevel (enum)
- `HARD: 0`
- `HARDER: 1`
- `HARDEST: 2`
- `EPIC: 3`

#### EchoLevelNames (object)
- Maps level numbers to display names

### Functions

#### `getModeProfile(mode: number)` → Uint8Array(32)
- **Purpose**: Get 32-byte mode profile block for program modes
- **Params**: ProgramMode enum value
- **Returns**: 32-byte array with mode-specific parameters

#### `getEchoParams(level: number, eccentricPct: number)` → EchoParams
- **Purpose**: Get Echo mode parameters for a level
- **Params**: EchoLevel enum, eccentric percentage (0-150)
- **Returns**: EchoParams object with gain, cap, smoothing, etc.

#### PredefinedColorSchemes (object)
- Maps preset names to color scheme objects
- Keys: "blue", "green", "teal", "yellow", "pink", "red", "purple"

---

## Data Structures

### MonitorSample
```typescript
{
  timestamp: Date,
  ticks: number,        // 32-bit tick counter
  posA: number,         // Right cable position (cm, filtered)
  posB: number,         // Left cable position (cm, filtered)
  loadA: number,        // Right cable load (kg)
  loadB: number,        // Left cable load (kg)
  raw: Uint8Array       // Original 16-byte characteristic data
}
```

### Workout
```typescript
{
  mode: string,           // Mode name (e.g., "Just Lift (Old School)")
  weightKg: number,      // Per-cable weight (0 for Echo mode)
  reps: number,          // Actual reps completed
  timestamp: Date,       // Completion timestamp
  startTime: Date,       // Workout start time
  warmupEndTime: Date | null,  // End of warmup phase
  endTime: Date          // Workout end time
}
```

### ProgramParams
```typescript
{
  mode: number,              // ProgramMode enum
  baseMode: number,          // For Just Lift mode
  isJustLift: boolean,
  reps: number,              // 0 if Just Lift
  perCableKg: number,        // Weight per cable (kg)
  perCableDisplay: number,   // Display value (kg or lb)
  effectiveKg: number,       // perCableKg + 10.0
  effectiveDisplay: number,  // Display value
  progressionKg: number,     // kg per rep (can be negative)
  progressionDisplay: number, // Display value
  displayUnit: string,       // "kg" | "lb"
  sequenceID: number         // Protocol sequence ID (0x0b)
}
```

### EchoParams
```typescript
{
  level: number,            // EchoLevel enum (0-3)
  eccentricPct: number,     // Eccentric percentage (0-150)
  warmupReps: number,        // Default 3
  targetReps: number,        // 0 if Just Lift, otherwise 1-30
  isJustLift: boolean,
  sequenceID: number         // Protocol sequence ID (0x01)
}
```

---

## Event Flow

### Connection Flow
```
User clicks "Connect"
  → app.connect()
    → device.connect()
      → navigator.bluetooth.requestDevice()
      → device.gatt.connect()
      → Discover services/characteristics
      → Enable notifications
      → app.updateConnectionStatus(true)
```

### Program Mode Start Flow
```
User clicks "Start Program"
  → app.startProgram()
    → Read form inputs
    → Validate inputs
    → Build ProgramParams object
    → device.startProgram(params)
      → buildProgramParams(params)
      → device.writeWithResponse("Program params", frame)
      → device.startPropertyPolling()
      → device.startMonitorPolling()
    → app.device.addMonitorListener(app.updateLiveStats)
    → app.device.addRepListener(app.handleRepNotification)
```

### Telemetry Flow
```
Device emits telemetry (every 100ms)
  → device.startMonitorPolling()
    → setInterval every 100ms
      → device.monitorChar.readValue()
      → device.parseMonitorData(data)
      → device.dispatchMonitor(sample)
        → app.updateLiveStats(sample)
          → Render load displays
          → Update position bars
          → Update range indicators
          → app.checkAutoStop(sample) [if Just Lift mode]
          → chartManager.addData(sample)
```

### Rep Notification Flow
```
Device emits rep notification
  → BLE notification handler
    → device.dispatchRepNotification(data)
      → app.handleRepNotification(data)
        → Parse u16 counters
        → Detect top/bottom transitions
        → Update rep counters
        → Record position ranges
        → Check auto-completion logic
        → app.maybeApplyLoadLimit()
```

### Auto-Stop Flow (Just Lift Mode)
```
Telemetry sample arrives
  → app.updateLiveStats(sample)
    → app.checkAutoStop(sample)
      → Check if position in "danger zone" (bottom 5%)
      → If yes:
        → Start timer if not started
        → Calculate progress (elapsed / 5s)
        → app.updateAutoStopUI(progress)
        → If elapsed >= 5s:
          → app.stopWorkout()
      → If no:
        → Reset timer if active
        → app.updateAutoStopUI(0)
```

### Load Limit Flow (Progression Cap)
```
Rep completes
  → app.handleRepNotification(data)
    → app.updateProgramTrackingAfterRep()
      → Increment perCableKg by progressionKg
    → app.maybeApplyLoadLimit()
      → Check if next target would exceed limit
      → If yes:
        → Set limitCapApplied = true
        → Update currentProgramParams
          → Set perCableKg = limitKg
          → Set progressionKg = 0
        → device.updateProgramParams(params)
          → buildProgramParams(params)
          → device.writeWithResponse("Program params (update)", frame)
```

---

## Browser APIs Used

### Web Bluetooth API
- `navigator.bluetooth.requestDevice()` - Device selection
- `BluetoothDevice.gatt.connect()` - GATT connection
- `BluetoothRemoteGATTServer.getPrimaryService()` - Service discovery
- `BluetoothRemoteGATTService.getCharacteristics()` - Characteristic discovery
- `BluetoothRemoteGATTCharacteristic.readValue()` - Read characteristic
- `BluetoothRemoteGATTCharacteristic.writeValueWithResponse()` - Write with response
- `BluetoothRemoteGATTCharacteristic.writeValueWithoutResponse()` - Write without response
- `BluetoothRemoteGATTCharacteristic.startNotifications()` - Enable notifications
- `characteristicvaluechanged` event - Notification handler

### Web APIs
- `localStorage` - Weight unit preference storage
- `Blob` / `URL.createObjectURL()` - CSV export
- `setInterval` / `clearInterval` - Polling timers
- `setTimeout` / `Promise` - Async delays
- `Date` - Timestamp handling
- `DataView` - Binary data parsing (little-endian)

### DOM APIs
- `document.getElementById()` - Element access
- `addEventListener()` - Event listeners
- `classList` - CSS class manipulation
- `style` - Inline style manipulation
- `innerHTML` / `textContent` - Content updates

---

## External Dependencies

### uPlot (charting library)
- **Source**: CDN (`https://leeoniya.github.io/uPlot/dist/uPlot.min.css`)
- **Purpose**: Telemetry visualization
- **Usage**: ChartManager class wraps uPlot instance
- **API**: See ChartManager methods above

---

## Error Handling Patterns

### BLE Errors
- All BLE operations wrapped in try/catch
- Errors logged via `device.log()` or `app.addLogEntry()`
- User-facing alerts for critical failures
- Connection state tracked via `device.isConnected`

### Validation Errors
- Input validation before sending commands
- Alert dialogs for invalid inputs
- Form fields disabled during active workouts

### Edge Cases
- Position spike filtering (>50000 values)
- Wraparound handling for u16 counters
- Queue management for concurrent GATT operations
- History trimming (max 72000 points)

---

## Notes

- **No Rest Timer**: The codebase does NOT contain a traditional between-sets rest timer. The only timer is the Just Lift auto-stop rest detection (5s countdown when user remains at bottom position).
- **Unit Conversion**: All weights stored internally in kg, converted to display unit (kg/lb) for UI only.
- **Protocol Endianness**: All multi-byte values use little-endian (LE) byte order.
- **State Management**: No external state management library; state lives in class instances.
- **No Framework**: Pure vanilla JavaScript; no React/Vue/Angular dependencies.


