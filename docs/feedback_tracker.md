# Bug Reports
[ ] STOP button does not work 

# Feature Requests
[ ]: Brainstorm with Ai appropriate tests for this repo and consider adjusting to a Test/Behavior Driven Development approach.
# Ractoring Suggestions

# Feedback From Reddit Users (r/vitruvian_form)
    - User: sudden_Hunter-9342
        Feedback: `trialled it. Connects easily. functions are pretty cool, with echo easy to use.
        1. [x] BUG: Mid-exercise STOP button does not work possible fixes:
            a. disconnect and reconnect
            b. Choose and start an exercise mode a few times until the error goes away(warm up reps and working reps reset)
           Notes: Fixed via PR #1 (STOP retries + UI debouncing). STOP now retries 3× with BLE cleanup; UI reflects fallback disconnect so users no longer need to reconnect manually.
        2. [ ] BUG: Seems the final rep is not executed. (i.e. 8th rep out of 8 deloads). Not a big deal, i just add an extra rep.
        3. [x] FEATURE: Stop the chart graphing at the end of reps. otherwise main data in the chart disappears to the side.
           Notes: Addressed in PR #1 by freezing the graph when STOP/auto-complete fires and exposing a Resume button so the last 30s stays visible.
        4. [ ] FEATURE: Adding rest periods/timer
        Dev Notes: Addressing in vitruvian-change-plan.md
