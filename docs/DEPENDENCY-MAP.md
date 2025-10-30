# Dependency Map - Vitruvian Web Control

**Last Updated:** October 2025  
**Purpose:** Comprehensive mapping of all dependencies, external libraries, browser APIs, and module relationships.

---

## Overview

This document maps all dependencies (external libraries, browser APIs, internal modules) and their relationships. The app follows a dependency-free philosophy with minimal external dependencies.

---

## External Dependencies

### uPlot (Charting Library)
- **Type**: External JavaScript Library (CDN)
- **Source**: `https://leeoniya.github.io/uPlot/dist/uPlot.min.css`
- **Version**: Latest from CDN (version not pinned)
- **Purpose**: Time-series chart visualization for telemetry data
- **Usage**: Used exclusively by `ChartManager` class in `chart.js`
- **Dependencies**: None (standalone library)
- **Browser Support**: Modern browsers (ES6+)
- **License**: MIT (typical for uPlot)

### uPlot CSS
- **Source**: `https://leeoniya.github.io/uPlot/dist/uPlot.min.css`
- **Purpose**: Styling for uPlot charts
- **Load Order**: Loaded in `<head>` section of `index.html`

---

## Browser APIs (Web Standards)

### Web Bluetooth API ⚠️
- **Status**: Experimental API (not available in all browsers)
- **Browser Support**:
  - ✅ Chrome/Chromium (desktop & Android)
  - ✅ Edge (Chromium)
  - ✅ Opera
  - ❌ Safari (no support)
  - ❌ Firefox (no support)
- **Required Permissions**: User gesture required for `requestDevice()`
- **HTTPS Requirement**: Requires HTTPS or localhost
- **Usage Locations**:
  - `device.js` - All BLE operations
  - `app.js` - Connection UI management

#### Web Bluetooth Methods Used:
- `navigator.bluetooth.requestDevice(options)`
- `BluetoothDevice.gatt.connect()`
- `BluetoothDevice.addEventListener('gattserverdisconnected')`
- `BluetoothRemoteGATTServer.getPrimaryService(uuid)`
- `BluetoothRemoteGATTService.getCharacteristics()`
- `BluetoothRemoteGATTCharacteristic.readValue()`
- `BluetoothRemoteGATTCharacteristic.writeValueWithResponse(data)`
- `BluetoothRemoteGATTCharacteristic.writeValueWithoutResponse(data)`
- `BluetoothRemoteGATTCharacteristic.startNotifications()`
- `BluetoothRemoteGATTCharacteristic.addEventListener('characteristicvaluechanged')`

### Web Storage API
- **Usage**: `localStorage`
- **Purpose**: Persist weight unit preference (`vitruvian.weightUnit`)
- **Browser Support**: Universal (IE8+, all modern browsers)
- **Usage Locations**:
  - `app.js` - `loadStoredWeightUnit()`, `saveWeightUnitPreference()`

### Web APIs (Standard DOM)
- **Usage**: Various DOM APIs
- **Methods Used**:
  - `document.getElementById()`
  - `document.createElement()`
  - `element.addEventListener()`
  - `element.classList`
  - `element.style`
  - `element.innerHTML` / `textContent`
  - `window.addEventListener('resize')`
- **Browser Support**: Universal
- **Usage Locations**: All files (DOM manipulation)

### File API
- **Usage**: `Blob`, `URL.createObjectURL()`, `URL.revokeObjectURL()`
- **Purpose**: CSV export functionality
- **Browser Support**: Universal (IE10+, all modern browsers)
- **Usage Locations**:
  - `chart.js` - `exportCSV()`

### Typed Arrays API
- **Usage**: `Uint8Array`, `DataView`, `ArrayBuffer`
- **Purpose**: Binary protocol frame construction and parsing
- **Browser Support**: Universal (IE11+, all modern browsers)
- **Usage Locations**:
  - `protocol.js` - Frame builders
  - `device.js` - Data parsing
  - `app.js` - Rep notification parsing

### Promise API
- **Usage**: `async/await`, `Promise`, `setTimeout`
- **Purpose**: Asynchronous BLE operations
- **Browser Support**: Universal (IE11+ with polyfill, native in modern browsers)
- **Usage Locations**: All files (async operations)

### setInterval / setTimeout
- **Usage**: Polling timers, async delays
- **Purpose**: 
  - Property polling (500ms interval)
  - Monitor polling (100ms interval)
  - Chart updates (10ms interval)
  - Command delays (50ms sleep)
- **Browser Support**: Universal
- **Usage Locations**:
  - `device.js` - Polling intervals
  - `chart.js` - Update interval
  - `app.js` - Auto-stop timer (manual calculation, not interval-based)

---

## Internal Module Dependencies

### Module Dependency Graph

```
index.html
├── uPlot CSS (CDN)
└── Scripts (in order):
    ├── modes.js (no dependencies)
    ├── protocol.js (depends on: modes.js)
    ├── device.js (depends on: protocol.js)
    ├── chart.js (depends on: uPlot library)
    └── app.js (depends on: device.js, chart.js)
```

### Detailed Module Dependencies

#### modes.js
- **Dependencies**: None (pure constants and utility functions)
- **Exports**: 
  - `ProgramMode` enum
  - `ProgramModeNames` object
  - `EchoLevel` enum
  - `EchoLevelNames` object
  - `PredefinedColorSchemes` object
  - `getModeProfile(mode)` function
  - `getEchoParams(level, eccentricPct)` function
- **Used By**: `protocol.js`, `app.js`

#### protocol.js
- **Dependencies**: `modes.js`
  - Uses `getModeProfile()` for program frame building
  - Uses `getEchoParams()` for Echo frame building
- **Exports**:
  - `buildInitCommand()`
  - `buildInitPreset()`
  - `buildProgramParams(params)`
  - `buildEchoControl(params)`
  - `buildColorScheme(brightness, colors)`
  - `bytesToHex(bytes)`
- **Used By**: `device.js`

#### device.js
- **Dependencies**: `protocol.js`
  - Uses all `build*()` functions for frame construction
- **Exports**: `VitruvianDevice` class
- **Used By**: `app.js`
- **Internal Dependencies**:
  - Web Bluetooth API (native browser API)
  - Typed Arrays API (native browser API)

#### chart.js
- **Dependencies**: 
  - uPlot library (external CDN)
  - No internal module dependencies
- **Exports**: `ChartManager` class
- **Used By**: `app.js`
- **Internal Dependencies**:
  - DOM APIs (native browser APIs)
  - File API (Blob, URL) for CSV export

#### app.js
- **Dependencies**: `device.js`, `chart.js`
  - Creates `VitruvianDevice` instance
  - Creates `ChartManager` instance
- **Exports**: `VitruvianApp` class (global `app` instance)
- **Used By**: `index.html` (DOM event handlers)
- **Internal Dependencies**:
  - DOM APIs (native browser APIs)
  - Web Storage API (localStorage)
  - All constants from `modes.js` (via global scope)

#### index.html
- **Dependencies**: All modules
  - Loads scripts in dependency order
  - Provides DOM structure for UI
  - Contains inline event handlers referencing `app` global

---

## Module Interaction Patterns

### Initialization Flow
```
index.html loads
  → Load uPlot CSS
  → Load modes.js (defines constants)
  → Load protocol.js (uses modes.js)
  → Load device.js (uses protocol.js)
  → Load chart.js (uses uPlot)
  → Load app.js (uses device.js, chart.js)
  → Create global app instance
  → DOM ready → app.setupLogging(), app.setupChart(), etc.
```

### Runtime Data Flow
```
User Action
  → DOM Event Handler (index.html)
    → app.js method
      → device.js method (if BLE operation)
        → protocol.js builder (if frame construction)
          → modes.js helper (if mode-specific)
      → chart.js method (if visualization)
```

### Event Flow (Observer Pattern)
```
device.js emits events
  → device.dispatchMonitor(sample)
    → app.js listeners (app.updateLiveStats)
  → device.dispatchRepNotification(data)
    → app.js listeners (app.handleRepNotification)
  → device.dispatchProperty(data)
    → app.js listeners (currently unused)
```

---

## BLE Service & Characteristic UUIDs

### GATT Services
- **NUS Service**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
  - Nordic UART Service (standard)
  - Used for command/response communication
- **GATT Service**: `00001801-0000-1000-8000-00805f9b34fb`
  - Generic Attribute Profile Service Changed
  - Used for service change notifications

### GATT Characteristics

#### Command Write (RX)
- **UUID**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **Properties**: Write (with/without response)
- **Usage**: Send commands to device
- **Accessed In**: `device.js` (`rxChar`)

#### Monitor Polling
- **UUID**: `90e991a6-c548-44ed-969b-eb541014eae3`
- **Properties**: Read
- **Usage**: Read telemetry data (position, load)
- **Polling Interval**: 100ms
- **Accessed In**: `device.js` (`monitorChar`)

#### Property Polling
- **UUID**: `5fa538ec-d041-42f6-bbd6-c30d475387b7`
- **Properties**: Read
- **Usage**: Read device properties (unknown purpose)
- **Polling Interval**: 500ms
- **Accessed In**: `device.js` (`propertyChar`)

#### Rep Notification
- **UUID**: `8308f2a6-0875-4a94-a86f-5c5c5e1b068a`
- **Properties**: Notify
- **Usage**: Receive rep completion notifications
- **Accessed In**: `device.js` (`repNotifyChar`)

#### Other Notify Characteristics
- `383f7276-49af-4335-9072-f01b0f8acad6`
- `74e994ac-0e80-4c02-9cd0-76cb31d3959b`
- `67d0dae0-5bfc-4ea2-acc9-ac784dee7f29`
- `c7b73007-b245-4503-a1ed-9e4e97eb9802`
- `36e6c2ee-21c7-404e-aa9b-f74ca4728ad4`
- `ef0e485a-8749-4314-b1be-01e57cd1712e`
- **Usage**: Enabled but handlers are generic (logged only)

---

## Data Format Dependencies

### Binary Protocol Format
- **Endianness**: Little-endian (LE) for all multi-byte values
- **Data Types Used**:
  - `u8` - Unsigned 8-bit integer
  - `u16` - Unsigned 16-bit integer (LE)
  - `u32` - Unsigned 32-bit integer (LE)
  - `i16` - Signed 16-bit integer (LE)
  - `f32` - 32-bit float (IEEE 754, LE)
- **Tools**: `DataView` API for multi-byte parsing
- **Frame Sizes**:
  - Init command: 4 bytes
  - Init preset: 34 bytes
  - Program params: 96 bytes
  - Echo control: 32 bytes
  - Color scheme: 34 bytes

### Monitor Data Format (16 bytes)
- **Structure**: Array of u16 little-endian values
- **Layout**:
  - Offset 0-1: ticks (low 16 bits)
  - Offset 2-3: ticks (high 16 bits)
  - Offset 4-5: posA (right cable position)
  - Offset 8-9: loadA (right cable load, kg * 100)
  - Offset 10-11: posB (left cable position)
  - Offset 14-15: loadB (left cable load, kg * 100)

### Rep Notification Format (6+ bytes)
- **Structure**: Array of u16 little-endian values
- **Layout**:
  - Offset 0-1: u16[0] - Top counter
  - Offset 2-3: u16[1] - Unknown counter
  - Offset 4-5: u16[2] - Complete counter

---

## Storage Dependencies

### localStorage Keys
- `vitruvian.weightUnit` - Stores user's weight unit preference ("kg" | "lb")

### In-Memory Storage
- **Workout History**: Array stored in `app.workoutHistory` (not persisted)
- **Telemetry History**: Array stored in `chartManager.loadHistory` (max 72000 points)

---

## Environment Dependencies

### HTTPS Requirement
- **Web Bluetooth**: Requires HTTPS (or localhost for development)
- **Rationale**: Browser security policy
- **Impact**: Must serve via HTTPS in production (GitHub Pages provides HTTPS)

### Browser Feature Detection
- **Web Bluetooth**: `if (!navigator.bluetooth)` check in `app.connect()`
- **localStorage**: `if (typeof window !== 'undefined' && window.localStorage)` checks

---

## Testing Dependencies

### Hardware Dependency
- **Vitruvian Trainer Device**: Required for end-to-end testing
- **BLE Connection**: Requires physical device (cannot be mocked)
- **Protocol Validation**: Requires hardware to verify frame correctness

### Browser Testing Targets
- Chrome/Chromium (desktop & Android)
- Edge (Chromium)
- Opera
- **Excluded**: Safari, Firefox (no Web Bluetooth support)

---

## Build & Deployment Dependencies

### None (Static Site)
- **Build Tool**: None (pure HTML/CSS/JS)
- **Bundler**: None (no module bundling)
- **Transpiler**: None (ES6+ assumed)
- **Package Manager**: None (no npm/yarn)

### Deployment
- **Platform**: GitHub Pages (static hosting)
- **HTTPS**: Provided by GitHub Pages
- **CDN**: uPlot loaded from external CDN

---

## Security Considerations

### No External Service Dependencies
- All functionality runs client-side
- No API calls to external services
- No tracking or analytics libraries

### Data Privacy
- No data leaves the browser
- Workout history stored only in memory
- Weight unit preference stored in localStorage (local only)

### Web Bluetooth Security
- User must explicitly grant permission
- Requires user gesture to initiate connection
- Same-origin policy applies

---

## Future Dependency Considerations

### Potential Additions
1. **Rest Timer Feature** (planned, not implemented)
   - Would require timer management (likely `setInterval` or `setTimeout`)
   - No external dependencies needed

2. **Sets Feature** (planned, not implemented)
   - Would require workout state management
   - No external dependencies needed

3. **Offline Support** (Service Worker)
   - Would require Service Worker API
   - No external dependencies needed

### Unlikely Additions
- Framework dependencies (React/Vue/Angular) - against project philosophy
- State management libraries (Redux/MobX) - not needed
- HTTP libraries (fetch is sufficient) - already available
- Date/time libraries (native Date is sufficient) - already used

---

## Dependency Risk Assessment

### Low Risk
- ✅ **uPlot**: Stable library, CDN fallback, can be self-hosted if needed
- ✅ **Browser APIs**: Standard APIs, well-supported
- ✅ **localStorage**: Universal support, graceful degradation

### Medium Risk
- ⚠️ **Web Bluetooth**: Experimental API, limited browser support
  - **Mitigation**: Browser detection, user messaging
  - **Impact**: Core functionality unavailable in Safari/Firefox

### High Risk
- ⚠️ **External CDN**: uPlot loaded from external CDN
  - **Risk**: CDN downtime, malicious modification
  - **Mitigation**: Could self-host uPlot if needed
  - **Current Impact**: Low (library is stable, CDN is reliable)

---

## Summary

**Total External Dependencies**: 1 (uPlot library)

**Browser API Dependencies**: 
- Web Bluetooth (experimental, Chrome/Edge/Opera only)
- Standard DOM APIs (universal)
- Web Storage API (universal)
- File API (universal)
- Typed Arrays API (universal)

**Module Dependencies**: Minimal, unidirectional dependency graph

**Build Dependencies**: None (static site)

**Runtime Dependencies**: None (all client-side)

**Data Dependencies**: None (no external services)


