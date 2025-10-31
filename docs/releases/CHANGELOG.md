# Changelog denoting new features, bug fixes, and refactoring (AGENTS: update this as you make changes)

### 2025-10-30
- **View Previous Workouts**: Added feature to view historical workout data on graph (PRs #8, #6)
- **Chart Data Fix**: Ensure latest workout is loaded before displaying
- **Stop at Top**: Added config option to stop at top of final rep (for squats)

### 2025-10-25
- **GATT Queue**: Added operation queue to prevent "GATT operation already in progress" errors
- **Position Bars**: Fixed both position bars to have same max height

### 2025-10-24
- **Weight Units**: Added weight unit selector (kg/lbs)
- **Improved Graph**: Enhanced graph visualization

### 2025-10-23
- **New Modes**: Added Just Lift, Eccentric Only, Progression/Regression modes

# Unreleased Features and Bugs (AGENTS: mark these done [x] as they are resolved and update change log accordingly)
---
1. [ ] FEATURE: weight/load limit control (very bugged feature needs a lot of work, something about the code for this feature bugs just lift and program modes)
    - user wants to set a limit on the weight/load per cable during progression/regression in Program Mode. When set, progression/regression stops once either cable reaches the limit but the session continues at the capped weight for the remainder of the reps (or indefinitely if Just Lift Mode is enabled).
    - **Status**: In progress, [feature documentation](../planning/feat_weight_limit.md) pending bug fix and audit.
    - UI: new field in Program section that is only visible when "Progression/Regression" has a value other than 0.
    - [ ] Bug A: Workout programs/sessions are Prematurely stopped when I set a per-cable load limit, regardless of how many reps I set or if just lift mode is enabled or disabled. Workout sessions work perfectly fine so long as per-cable load limit is set to zero. I suspect this is an incomplete feature add per @feat_weight_limit.md.
    - [ ] Bug B: Just Lift Mode - **Expected behavior**: f I set the starting per-cable limit to 10 kilograms with a limit of 12 and a progression modifier of 1 kg per rep: The expected behavior is the first three reps are unloaded calibration reps, the fourth rep is loaded at 10 kilos per cable, the fifth at 11kg, and the sixth at 12. On the seventh weighted rep (and higher), it should stick at 12kg until session end
        **Bugged behavior**: First six reps are not weighted (no resistance). 7th rep is immeidately loaded at 12kg (instead of startinga at 10kg and progressing to 12kg) and stays at 12kg until session end.
    - [ ] Bug C: Program Mode - **Expected behavior** is I'd be able to have a starting per-cable limit of 10 kilograms (or whatever), set the progression modifier to 1 kilogram (or whatever), set the load limit or weight limit to 12 kilograms (or whatever), and then have the workout progress and end when I reach the number of reps or until I press the stop button.
        **Bugged behavior**: Similar bugged behavior as Bug B, but when it reaches desired number of sets (in program mode not just lift mode) the data tracker stops as if it were in program mode but the machine physically feels and behaves as if it were in just lift mode.

---
2. [ ] FEATURE: Add number of sets to Program Mode
    - e.g. Users want to abilit to set number of sets per workout session in Program Mode.
    - **Status**: Unplanned.
---
3. [ ] FEATURE: Add number rest timer between sets
    - e.g. Users want to ability to set a rest timer between sets in Program Mode.
    - **Status**: Unplanned.
---
4. [ ] FEATURE: Make "Start Program" dynamically adapt to a "STOP" button during an active program/session.
    - e.g. As a user, I want to set my program mode parameters, press the Start Program button, and have the Start Program button dynamically changed to a red Stop button that, when pressed as a red Stop button, will stop the program, and have the Start Program button reappear and function as the normal Start Program button.
    - Dev note: We'll have to remove the current stop button currenlty displaued in the "live workout" section as it will be replaced by the new dynamically adapted Start/Stop Program button. Curious: Could the current stop button be repurposed as a "pause" or reset session button?
    - **Status**: Unplanned.
5. [ ] FEATURE: Increase Just Lift mode auto-stop time to 8 seconds.