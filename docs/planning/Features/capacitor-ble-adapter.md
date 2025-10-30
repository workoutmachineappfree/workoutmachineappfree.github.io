## Option 1 — Capacitor native BLE adapter (implementation plan)

### Overview
Wrap the existing Web Bluetooth app in Capacitor (iOS/Android) and introduce a small BLE adapter that maps current GATT usage to `@capacitor-community/bluetooth-le`. Preserve the UI, protocol, and offline behavior with minimal diffs.

### Scope and constraints
- Keep UI (`index.html`, `app.js`, `chart.js`) and protocol builders (`protocol.js`, `modes.js`) unchanged.
- Replace direct Web Bluetooth in `device.js` with a thin `bleAdapter` abstraction while keeping existing logging, lifecycle hooks (`onDisconnect`, `removeAllListeners()`), GATT queue, and telemetry/rep logic.
- Deliver iOS + Android shells via Capacitor with assets bundled offline.

### Current BLE touch points to adapt
- UUIDs and notify set live in `device.js`:
```1:21:/Users/jstar/Projects/vitruvian/workoutmachineappfree.github.io/device.js
// device.js - Vitruvian BLE device connection and management
const GATT_SERVICE_UUID = "00001801-0000-1000-8000-00805f9b34fb";
const SERVICE_CHANGED_CHAR_UUID = "00002a05-0000-1000-8000-00805f9b34fb";
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const MONITOR_CHAR_UUID = "90e991a6-c548-44ed-969b-eb541014eae3";
const PROPERTY_CHAR_UUID = "5fa538ec-d041-42f6-bbd6-c30d475387b7";
const REP_NOTIFY_CHAR_UUID = "8308f2a6-0875-4a94-a86f-5c5c5e1b068a";
const NOTIFY_CHAR_UUIDS = [
  "383f7276-49af-4335-9072-f01b0f8acad6",
  "74e994ac-0e80-4c02-9cd0-76cb31d3959b",
  "67d0dae0-5bfc-4ea2-acc9-ac784dee7f29",
  REP_NOTIFY_CHAR_UUID,
  "c7b73007-b245-4503-a1ed-9e4e97eb9802",
  "36e6c2ee-21c7-404e-aa9b-f74ca4728ad4",
  "ef0e485a-8749-4314-b1be-01e57cd1712e",
];
```
- Connect, discover, and characteristic handles (swap to adapter):
```104:171:/Users/jstar/Projects/vitruvian/workoutmachineappfree.github.io/device.js
async connect() {
  // navigator.bluetooth.requestDevice({...})
  // device.gatt.connect()
  // server.getPrimaryService(NUS_SERVICE_UUID)
  // nusService.getCharacteristics()
  // char.startNotifications()
}
```
- Notifications and reads/writes (map 1:1 to adapter methods):
```177:218:/Users/jstar/Projects/vitruvian/workoutmachineappfree.github.io/device.js
await char.startNotifications();
char.addEventListener("characteristicvaluechanged", (event) => { /* ... */ });
```
```220:249:/Users/jstar/Projects/vitruvian/workoutmachineappfree.github.io/device.js
await this.rxChar.writeValueWithResponse(payload);
await this.rxChar.writeValueWithoutResponse(payload);
```
```386:409:/Users/jstar/Projects/vitruvian/workoutmachineappfree.github.io/device.js
const value = await this.queueGattOperation(() => this.propertyChar.readValue());
```

### High-level design
- Add `bleAdapter` with two backends and identical verbs:
  - web: uses current Web Bluetooth (`navigator.bluetooth`).
  - native: uses Capacitor BLE `BleClient` from `@capacitor-community/bluetooth-le`.
- Runtime choose backend: `Capacitor?.isNativePlatform()` → native; else web. App continues to work in browsers.
- Keep `VitruvianDevice` queues, logging, lifecycle callbacks, and program logic; only route BLE I/O via adapter.

### Adapter interface (verbs we need)
- initialize()
- requestDevice({ filters, optionalServices }) → { deviceId, name }
- connect(deviceId, onDisconnect)
- writeWithResponse(deviceId, service, char, data: Uint8Array)
- writeWithoutResponse(deviceId, service, char, data: Uint8Array)
- read(deviceId, service, char) → Uint8Array
- startNotifications(deviceId, service, char, cb: (value: Uint8Array) => void)
- disconnect(deviceId)

### Mapping (Web Bluetooth → Capacitor BLE)
- requestDevice → `BleClient.requestDevice`
- gatt.connect → `BleClient.connect`
- char.writeValueWithResponse → `BleClient.write`
- char.writeValueWithoutResponse → `BleClient.writeWithoutResponse`
- char.readValue → `BleClient.read`
- char.startNotifications + event → `BleClient.startNotifications(cb)`
- gattserverdisconnected → `BleClient.connect(..., onDisconnect)` (adapter must fire the same callback `VitruvianDevice` exposes so UI cleanup runs once; polling continues until the callback triggers)

### File and code edits (minimal-diff)
1) New files (JS, no build tooling change):
   - `ble/adapter.js` (factory + shared types)
   - `ble/webBackend.js` (thin wrapper over existing Web Bluetooth path)
   - `ble/nativeBackend.js` (Capacitor BLE wrapper; mirrors adapter verbs)

2) Edit `device.js` only at BLE boundaries:
   - Replace direct calls to `navigator.bluetooth`, `char.*` with adapter verbs.
   - Keep UUID constants and GATT queue intact; pass service/char UUIDs into adapter methods.
   - In `enableCoreNotifications()`, iterate `NOTIFY_CHAR_UUIDS` calling `adapter.startNotifications(...)` and invoke existing dispatchers.

3) No changes to `protocol.js`, `modes.js`, `app.js`, `index.html` beyond optionally injecting the adapter script tag.

### Capacitor project setup
- Create `mobile/` Capacitor shell that serves web assets from repo root (or `www/`).
  - `npx cap init vitruvian-control com.vitruvian.control`
  - `cap.config`: `{ webDir: "../", server: { androidScheme: "https" } }` (adjust if you choose `www/`).
  - `npx cap add ios && npx cap add android`
- Install plugin: `npm i @capacitor-community/bluetooth-le` (in `mobile/`), then `npx cap sync`.

### Platform configuration
- iOS (Xcode):
  - Info.plist keys: `NSBluetoothAlwaysUsageDescription` with clear purpose string.
  - Verify plugin’s iOS setup; call `BleClient.initialize()` on app start before BLE operations.
  - Add Privacy Manifest if flagged (Capacitor v7 guidance) to declare Bluetooth usage reasons.
- Android (Android Studio):
  - For targetSdk ≥ 31 (Android 12+): add `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` with runtime requests as needed.
  - For ≤ Android 11: retain `ACCESS_FINE_LOCATION` for BLE scan if required by plugin.
  - Declare features: `android.hardware.bluetooth_le` (not required=true to keep installable where BLE absent).

### Integration details (non-breaking)
- Detection: `const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());`
- On native:
  - `await BleClient.initialize();`
  - `const dev = await BleClient.requestDevice({ filters: [{ namePrefix: 'Vee' }], optionalServices: [NUS_SERVICE_UUID, GATT_SERVICE_UUID] });`
  - `await BleClient.connect(dev.deviceId, () => onDisconnect());`
  - Reads/Writes/Notifications use UUID triplets with `Uint8Array` payloads.
- Maintain `queueGattOperation` in `device.js`; adapter methods remain async and serializable, and should propagate the richer protocol validation errors surfaced by the baseline refactor so app logging remains consistent.

### Safety and protocol invariants
- Do NOT alter frame sizes, offsets, or timing in `protocol.js`.
- Keep the STOP command path exactly as-is.
- Validate payload lengths before writes (already logged); adapter must not transform bytes.

### Testing plan (hardware required)
- Quick: Connect → send init (4/34) → start Program (96) → see telemetry; STOP works; no errors in console.
- Full: iOS (two devices, fresh install), Android 12+/11; rapid commands; reconnect flows; notification throughput sanity.

### Rollback plan
- Adapter is additive; web backend keeps current behavior. If native shows issues, switch `isNative=false` to force Web Bluetooth (for Android Chrome) until resolved.

### Risks and mitigations
- Permission friction (Android 12+): handle runtime prompts and fallbacks; show friendly errors.
- iOS privacy manifest/App Store strings: follow Capacitor v7 guide to avoid rejection.
- Timing differences: keep existing intra-command delays (e.g., 50ms) intact in `device.js`.

### Implementation TODOs
- Create mobile/ Capacitor shell (webDir pointing to repo assets), add iOS/Android
- Install `@capacitor-community/bluetooth-le` and sync native projects
- Configure iOS Info.plist and Android 12+ BLE permissions; add privacy manifest if needed
- Add `ble/adapter.js` with web/native backends implementing unified verbs
- Swap `device.js` BLE calls to adapter; keep queues/logging/protocol intact
- Wire adapter selection (native vs web) and ensure browser fallback remains
- Build and run on devices; verify connect/init/program/stop
- Run quick and full hardware tests per runbook; capture logs and findings
- Document mobile build steps, permissions, test notes in README and docs

