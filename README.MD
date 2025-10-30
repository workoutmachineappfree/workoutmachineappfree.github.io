# Vitruvian Trainer Rescue — Open‑Source Web Bluetooth Control

Keep your Vitruvian Trainer usable without company servers. This project is a lightweight, browser‑based controller that talks directly to the hardware over Bluetooth Low Energy (BLE) using the Web Bluetooth API. No accounts, no cloud, no subscriptions.

## Why this exists
- The company behind Vitruvian entered administration; future server support is uncertain (decision reportedly pending Oct 27, 2025).
- Even with “offline mode,” many users report the official app periodically requires a server check‑in.
- Goal: prevent $3k+ hardware from becoming e‑waste by enabling fully local control.

## Documentation map
- README.md — TL;DR, quick start, and links
- docs/SITUATION-BRIEF.md — background and minimal technical summary
- AGENTS.md — operating guidance for AI agents and developers
- docs/API-MAP.md — API reference, event flow, data structures
- docs/DEPENDENCY-MAP.md — dependencies, modules, browser APIs

## What works today
- Connect via Web Bluetooth and control workout modes:
  - Old School, Pump, TUT, TUT Beast
  - Echo (adaptive)
- Live telemetry: load (kg), cable positions, rep counting, load graph
- Session controls: per-cable weight, ±3 kg per-rep progression/regression, optional per-cable load cap
- LED color schemes
- Safety: prominent STOP. “Just Lift” is disabled until safe auto‑stop is implemented.

## Quick start (local only; requires Chrome/Edge/Opera)
1. Power your Vitruvian Trainer.
2. Serve this folder over localhost (Web Bluetooth requires HTTPS or localhost):
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000`, click "Connect to Device," select your Vitruvian.

## Test Mode (UI Development Without Hardware)

Test mode enables UI development and testing without requiring a physical device or Web Bluetooth support. This is useful for:
- Developing and testing UI layouts and interactions
- Refactoring UI code without hardware access
- Testing form validation and accessibility features
- Verifying responsive design across different screen sizes

### How to Enable Test Mode

You can enable test mode in two ways:

1. **URL parameter**: Add `?testMode=true` to the URL:
   ```
   http://localhost:8000?testMode=true
   ```

2. **localStorage**: Set `vitruvianTestMode = "true"` in your browser's console:
   ```javascript
   localStorage.setItem("vitruvianTestMode", "true");
   ```

### Using Test Mode

1. Enable test mode using one of the methods above
2. Reload the page - you'll see a "TEST MODE" badge in the sidebar header
3. Click "Connect to Device" - the connection will proceed without Web Bluetooth
4. All UI sections (Program Mode, Echo Mode, Color Scheme) will become visible
5. You can now interact with all UI elements and test layouts

**Note**: Test mode uses mock Bluetooth characteristics, so actual device communication won't occur. Hardware testing is still required for protocol changes and end-to-end validation.

## Contributing (fork/PR)
```bash
git remote -v
git remote add upstream https://github.com/workoutmachineappfree/workoutmachineappfree.github.io.git
git fetch upstream && git checkout main && git merge upstream/main && git push origin main
git checkout -b feature/your-change
# commit, push, then open PR: base=upstream/main ← compare=origin/feature/your-change
```

## Background and links
- Background (timeline, technical summary): see `docs/SITUATION-BRIEF.md` (this README is the TL;DR).
- Company status (community report): [Administrators take control](https://www.reddit.com/r/Vitruvian_Form/comments/1nrwmnn/vitruvian_investments_administrators_take_control/)
- Community response threads: [Open‑source app](https://www.reddit.com/r/Vitruvian_Form/comments/1jiz966/open_source_app/), [Follow‑up](https://www.reddit.com/r/Vitruvian_Form/comments/1obx3ce/whatever_happened_to_this/)
- Upstream repo: [workoutmachineappfree/workoutmachineappfree.github.io](https://github.com/workoutmachineappfree/workoutmachineappfree.github.io)

Note: Use light loads when testing. Confirm STOP works before heavy use.