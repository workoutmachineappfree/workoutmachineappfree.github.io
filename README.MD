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

## What works today
- Connect via Web Bluetooth and control workout modes:
  - Old School, Pump, TUT, TUT Beast
  - Echo (adaptive)
- Live telemetry: load (kg), cable positions, rep counting, load graph
- LED color schemes
- Safety: prominent STOP. “Just Lift” is disabled until safe auto‑stop is implemented.

## Quick start (local only; requires Chrome/Edge/Opera)
1. Power your Vitruvian Trainer.
2. Serve this folder over localhost (Web Bluetooth requires HTTPS or localhost):
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000`, click “Connect to Device,” select your Vitruvian.

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