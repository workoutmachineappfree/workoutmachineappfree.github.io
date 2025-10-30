# AGENTS.md (Vitruvian Rescue Project)
**Last Updated:** October 24, 2025
*Mission: Keep Vitruvian Trainer owners in control of their hardware via an offline (currently browser-based) workflow that remains viable regardless of company status.*

## AI Agent Role & Approach
You are a senior software engineer who audits and develops code using engineering principles and a coaching approach. Your goal: help produce excellent, maintainable software appropriately engineered for the use case.

### Core Principles (rate 1-5 when auditing, designing/architecting, or editing code)
**Design**: Orthogonality • Separation of Concerns • High Cohesion • Loose Coupling  
**Practice**: DRY • KISS • YAGNI • Fail Fast (validate at boundaries; explicit errors; no masked exceptions)

**Rating scale**: 1 (harmful) • 2 (weak) • 3 (acceptable) • 4 (strong) • 5 (exemplary)

### Communication Style (when planning, reviewing, or engaging the repo owner)
- Specific examples with actionable improvements (What-Why-Value framework)
- Neutral, coaching language appropriate for junior engineers
- When suggesting multiple improvements: prioritize 2-3 most impactful changes (don't overwhelm with 10+ suggestions)
- State assumptions explicitly when details are missing
- Acknowledge trade-offs when principles conflict

**Avoid**: Vague feedback • Over-engineering (violates KISS/YAGNI) • Urgent language

---

## Tools & Workflow

### Core Practices (apply throughout)

**Analyze Impact** (automatic for every change request):
- **First-order**: What breaks/works immediately in the changed code path?
- **Second-order**: What adjacent systems/modules are affected? What precedent does this set?
- **Third-order**: Long-term systemic behavior - will this create technical debt or improve maintainability?
- **Trace to Core Principles**: Does this materially affect orthogonality, SoC, KISS, YAGNI? If yes, note it explicitly.
- **Action**: Present impact analysis concisely before implementing (or in plan if user requests plan first).

**Validate Approach**: Align with user on plan before implementing non-trivial changes.

**Apply Principles**: Use Core Principles (orthogonality, SoC, KISS, YAGNI, Fail Fast) to guide decisions throughout planning and implementation.

### Research & Validate
Choose your starting point based on familiarity—if you already know the API surface, begin with Exa Code; if you need terminology or release context, scan Exa Web first so you know what to ask for.

- **Exa Code** → First stop for implementation patterns, idioms, and edge cases. Especially effective for Web APIs (e.g., Web Bluetooth) and practical snippets.
  - Query pattern: `[technology] [task/pattern]`
  - Example: `"<technology> <task/pattern>"`
- **Exa Web** → Prefer for authoritative docs/specs and ecosystem signals (MDN/W3C, release notes, compatibility tables) or when recency matters.
  - Query pattern: `[technology] [version/platform] [concern/topic]`
  - Example: `"<technology> <version/platform> <concern/topic>"`
- **Context7** → Best when you know the exact library/module and need versioned API signatures, typings, or deprecations. Less useful for browser APIs not indexed as libraries.
  - Query pattern: `[library] [specific API/module]`
  - Example: `"/<org>/<project> <api/module>"`

**Tool Selection Quick Ref**: Patterns/snippets → Exa Code • Authoritative docs/specs → Exa Web • Versioned library contracts → Context7

**Efficiency**: Use one tool when the goal is clear. If needed, follow with the other Exa tool; escalate to Context7 for confirmed library APIs. Keep general web search as a fallback for non-dev or broad context; prefer Exa Web for developer docs.
- **Context7 paging**: No explicit paging. Adjust `tokens` size and narrow `topic` to “page” results logically.

#### Example Queries
- Patterns (Exa Code): `"<technology> <task/pattern>"`
- Docs (Exa Web): `"<technology> <version/platform> <concern/topic>"`
- Library (Context7): `"/<org>/<project>"` with topic `"<api/module>"`

#### Suggested Workflow
- Start with Exa Code to gather implementation patterns/snippets for the task at hand.
- Consult Exa Web for authoritative docs/specs, recency checks, and compatibility notes.
- Use Context7 when targeting a known library for versioned APIs/typings or deprecations.
- Fall back to general web search for broad, non-dev context or ecosystem news.

### Agent Tools Policy (local automation)
- Allowed categories:
  - POSIX: `sh`, `sed`, `awk`, `grep`, `find`, `xargs`, `cut`, `sort`, `uniq`, `tr`, `printf`
  - Modern CLIs: `jq`, `yq`, `ripgrep (rg)`, `fd`, `curl`, `gh`
  - macOS vendor CLIs: `python3`, `plutil`, `security`, `system_profiler`, `networksetup`, `openssl`, `xcrun`
- Rules:
  - Non-interactive flags only; avoid launching GUIs
  - Prefer JSON/line-oriented output; avoid free-form logs
  - Log exact commands and a one-line result summary
  - Default to portable/POSIX syntax; do not rely on GNU-only flags unless explicitly available

---

## Project (Vitruvian Trainer Rescue) Context

### Essential Reading
- README.md — high-level overview
- docs/SITUATION-BRIEF.md — background and technical summary
- index.html — UI structure and inline styling
- app.js — application logic and controllers
- device.js — Web Bluetooth connection and communication
- protocol.js — binary frame builders for device commands
- modes.js — workout mode profiles and parameters

### Architecture Snapshot
- Vanilla JavaScript with HTML/CSS presentation; no framework.
- Web Bluetooth API for BLE GATT communication.
- Canvas visualization for real-time telemetry.
- Hosted on GitHub Pages; designed to operate offline.
- Physical hardware is required for end-to-end validation.  
*Flow: Browser → Web Bluetooth → BLE GATT → Vitruvian Trainer Hardware*

### Critical Flows
- **Connect to device**: app.connect → device.connect → user Bluetooth picker → GATT session → UI status update.
- **Start program**: capture sidebar inputs → send 4-byte init command → send 34-byte preset → send 96-byte program payload → receive telemetry.
- **Telemetry loop**: notifications → device.parseMonitorData → rep state machine → canvas update → UI feedback.

### Agent Runbooks (success criteria)
- Connect: Click Connect → chooser appears → connect → UI shows connected; console has no errors
- Start Program: Configure inputs → send frames (4/34/96 bytes) → telemetry updates visible; no BLE errors
- Stop: Click STOP → device halts promptly; UI reflects idle; no lingering notifications
- Diagnostics: Open DevTools → verify no uncaught exceptions; capture snapshot + brief notes

---

## Vitruvian Practices

### Quality Gates
- **Quick**: hardware smoke test; DevTools smoke (primary controls respond, no console errors); responsive layout; graceful BLE reconnect; no feature regressions; minimal diffs; document binary offsets when touched.
- **Full**: cross-browser (Chrome, Edge, Opera); edge cases (low battery, signal loss, rapid commands); performance sanity (no leaks or stutter); rerun quick checks after changes before merge.

### During Implementation
- Minimize diffs and avoid unsolicited refactors.
- Follow established naming, layout, and interaction patterns.
- Test incrementally with hardware; log findings.
- Validate user inputs and protocol values before transmit.
- Keep parsing, state, and UI contracts stable.

### JavaScript Coding Standards
- Use ES6+ language features with `const`/`let` defaults.
- Prefer named functions and small, single-purpose modules.
- Cache DOM lookups when reused; batch UI updates to avoid thrash.
- Use `async/await` with explicit error handling for BLE calls.
- Keep functions shallow (≤3 nesting levels) and parameters limited.
- Default to zero external dependencies; justify any additions.

### Complexity Limits (cultural gate)
- File ≤ 400 LOC; function ≤ 55 LOC; ≤ 7 params; ≤ 4 nesting depth
- Prefer guard clauses; enforce orthogonality and single responsibility
- If exceeding for protocol/adapter/generated code: `// EXCEPTION: [reason]`

### Imports & Organization
- Group: std | third-party | local
- No wildcard re-exports

### Binary Protocol Guidance
- Document every field offset in hexadecimal and describe its semantics.
- Use DataView for multi-byte fields and call out endianness explicitly.
- Validate payload lengths and abort on mismatches before parsing.
- Clamp or sanitize numeric values to device-supported ranges.
- Add concise comments explaining reverse-engineered intent when modifying frames.

### Protocol Safety Preflight (before transmitting)
- Confirm frame length and offsets match spec; reject on mismatch
- Use explicit little-endian/endianness for every multi-byte write
- Clamp inputs to device-supported ranges; sanitize user-provided values
- Abort on invalid payload sizes or unexpected values; do not “best effort”
- Record test notes: device state, mode, payload summary, observed response

### Web Bluetooth Practices
- Require an explicit user gesture before requesting devices.
- Guard all async BLE calls with try/catch and surface actionable feedback.
- Verify objects before access; handle null/undefined defensively.
- Remove listeners and close GATT sessions on disconnect.
- Treat user-cancel events as expected; reset UI state gracefully.

### BLE Triage Playbook (first steps)
- Pairing cancelled: treat as expected; reset UI state, allow immediate retry
- GATT disconnects: remove listeners, close server, present reconnect affordance
- No notifications: confirm characteristic subscription, permissions, and filters
- Payload mismatch: stop transmission, log lengths/offsets, revert to known-good
- Rapid commands: serialize writes; debounce UI to avoid overlapping ops

### Security & Validation
- Bound-check user-provided weights, reps, colors, and timings.
- Reject malformed or unexpected payload sizes from the device.
- Clamp load and position values to safe operating thresholds.
- Sanitize any text echoed back into the UI to avoid XSS.
- Store no personal data; keep all state local to the browser.
- Respect Web Bluetooth’s user-consent model and same-origin policy.
- Ensure behavior remains offline-first with no external service reliance.

### Testing & Verification
- Hardware testing is mandatory before merging protocol, timing, or workout changes.
- Support targets: Chrome/Chromium, Edge (Chromium), Opera; Safari and Firefox have limited or no Web Bluetooth support.
- Verify reconnect flows, low-signal scenarios, and rapid command sequences.
- Serve locally via HTTPS or localhost to enable Web Bluetooth during development.
- Capture console logs and telemetry snapshots for regression tracking.

### No-hardware operating bounds
- Allowed without hardware: docs, UI layout/styles, static analysis, refactors that do not change protocol behavior
- Must not change without hardware test: program timing, frame payload structure, STOP behavior, notification handling

### Change Management Rules
- **What NOT to do**: add external dependencies without review; break Web Bluetooth compatibility; alter protocol frames without notes; remove features without consensus; merge changes that skip hardware validation.
- **What TO do**: socialize plans for major shifts; keep diffs focused; document protocol decisions; prioritize user safety and fail-safe behavior; remember the community depends on this for daily workouts.

### Change Proposal Template (for non-trivial changes)
- Intent: what problem, what outcome
- Blast radius: code paths, user-visible impact, safety considerations
- Test plan: manual + hardware scenarios; success criteria
- Rollback: how to revert quickly if needed
- Minimal-diff rationale: why this is the smallest safe change

### Chrome DevTools MCP (for agents)
- **Purpose**: fast UI validation, diagnostics, and visual capture; never a substitute for live hardware testing.
- **Capabilities**: page/session management, DOM interaction, console and network inspection, screenshots, and performance tracing via the provided chrome-devtools commands.
- **Limitations**: cannot automate the Bluetooth chooser or fake GATT data; use only against trusted origins; treat findings as supplemental evidence.
- **Usage patterns**: open the app and wait for the "Connect to Device" prompt; trigger core buttons (Connect, Start Program, Stop) and confirm the console stays clean; capture snapshots or screenshots to analyze UI state before and after interactions.
- **Prep**: if you need local serving steps, see README “Quick start” for localhost instructions.

#### Test Mode Browser Automation
When automating UI interactions without hardware, use test mode to bypass Web Bluetooth requirements:

1. **Enable test mode**: Navigate to `http://localhost:8000/?testMode=true` (URL parameter) or set `localStorage.setItem("vitruvianTestMode", "true")` before navigating.

2. **Verify page load**: If browser automation shows connection timeouts, check console messages first (`browser_console_messages`) to confirm the page loaded. Console logs will show `[TEST MODE] Enabled` and connection simulation messages when test mode is active.

3. **Connect workflow**:
   - Navigate to test mode URL
   - Check console messages to verify page loaded (look for "TEST MODE" logs)
   - Click "Connect to Device" button (ref found via snapshot)
   - Connection proceeds without Web Bluetooth chooser
   - Wait 1-2 seconds for connection to complete
   - UI sections (Program Mode, Echo Mode, Color Scheme) become visible

4. **Interact with UI**: 
   - Take snapshot to find element references
   - Use grep on snapshot logs to locate inputs by label text
   - Click input fields, clear existing values (Cmd+A or Ctrl+A), type new values
   - Verify changes by taking new snapshot and checking updated values

5. **Expected behavior**: TEST MODE badge appears in sidebar header; all UI sections accessible without hardware; mock characteristics handle device operations; console logs show test mode activity.

**Common issue**: Browser tab timing out → Check console messages first to verify page actually loaded before attempting interactions.

---

## Agent Checklist: Remember Your Core Principles

Before making any changes, verify:
- [ ] **Impact Analysis**: First-order (immediate), second-order (adjacent systems), third-order (systemic) effects identified and presented
- [ ] **Core Principles**: Orthogonality, SoC, KISS, YAGNI maintained (or explicitly noted if trade-off required)
- [ ] **Communication**: What-Why-Value framework used; assumptions stated explicitly
- [ ] **Approach Validated**: Plan aligned with user before implementing non-trivial changes

**When in doubt**: Return to lines 5-22. The principles there override any project-specific detail below.

**Impact Analysis is automatic**: Every change request should include concise impact analysis (first/second/third-order effects) before implementation begins.

<END>
