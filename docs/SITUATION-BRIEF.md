# Vitruvian Trainer Rescue — Situation Brief (Background)

This document gives context beyond the README TL;DR. It summarizes the situation, links sources, and captures a minimal technical overview for contributors.

Note: README.md is the entry point for users; this brief focuses on background and technical summary.

For operating guidance (tools, workflow, safety), see ../AGENTS.md.

## Situation snapshot
- Company status: community reports indicate administration with a decision pending Oct 27, 2025.
- Risk: when company servers disappear, the official app’s periodic check‑in can block usage, stranding $3k+ hardware.
- Community response: open‑source, local‑only Web Bluetooth controller to keep hardware usable.

Sources (community reports):
- Administrators take control: https://www.reddit.com/r/Vitruvian_Form/comments/1nrwmnn/vitruvian_investments_administrators_take_control/
- Open‑source app thread: https://www.reddit.com/r/Vitruvian_Form/comments/1jiz966/open_source_app/
- Follow‑up: https://www.reddit.com/r/Vitruvian_Form/comments/1obx3ce/whatever_happened_to_this/

## What this project does (short)
- Direct browser ↔ device control via Web Bluetooth API (no server).
- Supports Old School, Pump, TUT, TUT Beast, and Echo modes.
- Live telemetry (load per cable, positions, rep counting) and LED color control.
- Safety: STOP button; “Just Lift” disabled until safe auto‑stop is implemented.

## Minimal technical summary
- Protocol: reverse‑engineered, frame‑based over a Nordic UART‑like GATT service.
- Key frames (from `protocol.js`):
  - 4‑byte init command
  - 34‑byte init preset / color scheme
  - 32‑byte Echo control
  - 96‑byte program parameters
- Data flow (`device.js` and `app.js`):
  - Connect → send init → start Echo or Program → poll monitor/property → UI updates
  - Monitor polling ~100ms: ticks, positions, loads; rep notifications via separate characteristic

## Contributing (quick)
- Fork, branch, PR. See README “Contributing” for remotes and PR targets.
- Test changes on real hardware before PR where protocol behavior changes.

## Ethos
- Purpose: prevent e‑waste; keep purchased hardware usable.
- Scope: interoperability only; no proprietary code.

Back to README (TL;DR): ../README.md