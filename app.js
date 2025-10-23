// app.js - Main application logic and UI management

class VitruvianApp {
  constructor() {
    this.device = new VitruvianDevice();
    this.loadHistory = [];
    this.maxHistoryPoints = 300; // 30 seconds at 100ms polling
    this.maxPosA = 1000; // Dynamic max for Right Cable (A)
    this.maxPosB = 1000; // Dynamic max for Left Cable (B)
    this.warmupReps = 0;
    this.workingReps = 0;
    this.warmupTarget = 3; // Default warmup target
    this.targetReps = 0; // Target working reps
    this.workoutHistory = []; // Track completed workouts
    this.currentWorkout = null; // Current workout info
    this.setupLogging();
    this.setupGraph();
    this.resetRepCountersToEmpty();
  }

  setupLogging() {
    // Connect device logging to UI
    this.device.onLog = (message, type) => {
      this.addLogEntry(message, type);
    };
  }

  setupGraph() {
    // Initialize canvas for load graph
    this.canvas = document.getElementById("loadGraph");
    if (!this.canvas) {
      console.warn("Canvas element not found yet, will initialize later");
      return;
    }

    // Get parent container width to size canvas responsively
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 400); // Min 400px width
    const height = 300;

    // Apply devicePixelRatio for crisp rendering on high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Set canvas resolution (physical pixels)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Set display size (CSS pixels) to fill container
    this.canvas.style.width = "100%";
    this.canvas.style.height = height + "px";

    // Store logical dimensions for drawing
    this.canvasDisplayWidth = width;
    this.canvasDisplayHeight = height;

    this.ctx = this.canvas.getContext("2d", { alpha: false });

    // Scale context to match DPI
    this.ctx.scale(dpr, dpr);

    // Disable smoothing for crisp rendering
    this.ctx.imageSmoothingEnabled = false;

    this.drawGraph();
  }

  drawGraph() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvasDisplayWidth || this.canvas.width;
    const height = this.canvasDisplayHeight || this.canvas.height;
    const ctx = this.ctx;

    if (width === 0 || height === 0) return; // Canvas not sized yet

    // Clear canvas
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    // Set text rendering for crisp fonts
    ctx.textRendering = "optimizeLegibility";

    if (this.loadHistory.length < 2) {
      // Not enough data to draw
      ctx.fillStyle = "#6c757d";
      ctx.font = "14px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Waiting for data...",
        Math.round(width / 2),
        Math.round(height / 2),
      );
      return;
    }

    // Find max load for scaling
    let maxLoad = 0;
    for (const point of this.loadHistory) {
      const totalLoad = point.loadA + point.loadB;
      if (totalLoad > maxLoad) maxLoad = totalLoad;
    }

    // Add some headroom
    maxLoad = maxLoad * 1.2 || 10;

    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Draw horizontal grid lines
    ctx.strokeStyle = "#dee2e6";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = Math.round(padding + (graphHeight / 5) * i) + 0.5; // +0.5 for crisp 1px lines
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Draw Y-axis labels (load)
      const loadValue = maxLoad * (1 - i / 5);
      ctx.fillStyle = "#6c757d";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        loadValue.toFixed(1) + " kg",
        padding - 5,
        Math.round(y + 4),
      );
    }

    // Draw X-axis time labels (t-30, t-20, t-10, t-0)
    const timeLabels = [
      { label: "t-30", position: 0 },
      { label: "t-20", position: 0.333 },
      { label: "t-10", position: 0.667 },
      { label: "t-0", position: 1 },
    ];

    ctx.fillStyle = "#6c757d";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";

    timeLabels.forEach((item) => {
      const x = padding + graphWidth * item.position;
      ctx.fillText(item.label, Math.round(x), height - padding + 15);
    });

    // Draw lines for each cable and total
    // Calculate spacing based on actual number of points to fill the graph width
    const numPoints = this.loadHistory.length;
    const pointSpacing = numPoints > 1 ? graphWidth / (numPoints - 1) : 0;

    // Helper to draw a line
    const drawLine = (getData, color, lineWidth = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      let started = false;
      for (let i = 0; i < this.loadHistory.length; i++) {
        const point = this.loadHistory[i];
        const value = getData(point);
        const x = padding + i * pointSpacing;
        const y = padding + graphHeight - (value / maxLoad) * graphHeight;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Draw total load (thicker line)
    drawLine((p) => p.loadA + p.loadB, "#667eea", 3);

    // Draw individual cables (thinner lines)
    drawLine((p) => p.loadA, "#51cf66", 1.5);
    drawLine((p) => p.loadB, "#ff6b6b", 1.5);

    // Draw compact horizontal legend at top
    const legendItems = [
      { label: "Total", color: "#667eea" },
      { label: "Right", color: "#51cf66" },
      { label: "Left", color: "#ff6b6b" },
    ];

    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "left";

    let legendX = padding + 10;
    const legendY = padding - 20;

    legendItems.forEach((item, i) => {
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(Math.round(legendX), Math.round(legendY - 6), 10, 8);

      // Draw label
      ctx.fillStyle = "#495057";
      ctx.fillText(item.label, Math.round(legendX + 13), Math.round(legendY));

      // Move to next position (compact spacing)
      legendX += ctx.measureText(item.label).width + 28;
    });
  }

  addLogEntry(message, type = "info") {
    const logDiv = document.getElementById("log");
    const entry = document.createElement("div");
    entry.className = `log-line log-${type}`;
    entry.textContent = message;
    logDiv.appendChild(entry);

    // Auto-scroll to bottom
    logDiv.scrollTop = logDiv.scrollHeight;

    // Limit log entries to prevent memory issues
    const maxEntries = 500;
    while (logDiv.children.length > maxEntries) {
      logDiv.removeChild(logDiv.firstChild);
    }
  }

  updateConnectionStatus(connected) {
    const statusDiv = document.getElementById("status");
    const connectBtn = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const programSection = document.getElementById("programSection");
    const echoSection = document.getElementById("echoSection");
    const colorSection = document.getElementById("colorSection");

    if (connected) {
      statusDiv.textContent = "Connected";
      statusDiv.className = "status connected";
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      programSection.classList.remove("hidden");
      echoSection.classList.remove("hidden");
      colorSection.classList.remove("hidden");
    } else {
      statusDiv.textContent = "Disconnected";
      statusDiv.className = "status disconnected";
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      programSection.classList.add("hidden");
      echoSection.classList.add("hidden");
      colorSection.classList.add("hidden");
    }
  }

  updateLiveStats(sample) {
    // Update numeric displays
    document.getElementById("loadA").innerHTML =
      `${sample.loadA.toFixed(1)} <span class="stat-unit">kg</span>`;
    document.getElementById("loadB").innerHTML =
      `${sample.loadB.toFixed(1)} <span class="stat-unit">kg</span>`;
    document.getElementById("totalLoad").innerHTML =
      `${(sample.loadA + sample.loadB).toFixed(1)} <span class="stat-unit">kg</span>`;
    document.getElementById("ticks").textContent = sample.ticks;

    // Update position values
    document.getElementById("posAValue").textContent = sample.posA;
    document.getElementById("posBValue").textContent = sample.posB;

    // Auto-adjust max positions (max seen + 100)
    if (sample.posA > this.maxPosA) {
      this.maxPosA = sample.posA + 100;
    }
    if (sample.posB > this.maxPosB) {
      this.maxPosB = sample.posB + 100;
    }

    // Update position bars with dynamic scaling
    const heightA = Math.min((sample.posA / this.maxPosA) * 100, 100);
    const heightB = Math.min((sample.posB / this.maxPosB) * 100, 100);

    document.getElementById("barA").style.height = heightA + "%";
    document.getElementById("barB").style.height = heightB + "%";

    // Add to load history
    this.loadHistory.push({
      timestamp: sample.timestamp,
      loadA: sample.loadA,
      loadB: sample.loadB,
    });

    // Trim history to max points
    if (this.loadHistory.length > this.maxHistoryPoints) {
      this.loadHistory.shift();
    }

    // Redraw graph
    this.drawGraph();
  }

  // Mobile sidebar toggle
  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  }

  closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  updateRepCounters() {
    // Update warmup counter
    const warmupEl = document.getElementById("warmupCounter");
    if (warmupEl) {
      if (this.currentWorkout) {
        warmupEl.textContent = `${this.warmupReps}/${this.warmupTarget}`;
      } else {
        warmupEl.textContent = `-/3`;
      }
    }

    // Update working reps counter
    const workingEl = document.getElementById("workingCounter");
    if (workingEl) {
      if (this.currentWorkout) {
        if (this.targetReps > 0) {
          workingEl.textContent = `${this.workingReps}/${this.targetReps}`;
        } else {
          workingEl.textContent = `${this.workingReps}`;
        }
      } else {
        workingEl.textContent = `-/-`;
      }
    }
  }

  resetRepCountersToEmpty() {
    this.warmupReps = 0;
    this.workingReps = 0;
    this.currentWorkout = null;
    this.updateRepCounters();
  }

  addToWorkoutHistory(workout) {
    this.workoutHistory.unshift(workout); // Add to beginning
    this.updateHistoryDisplay();
  }

  updateHistoryDisplay() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    if (this.workoutHistory.length === 0) {
      historyList.innerHTML = `
        <div style="color: #6c757d; font-size: 0.9em; text-align: center; padding: 20px;">
          No workouts completed yet
        </div>
      `;
      return;
    }

    historyList.innerHTML = this.workoutHistory
      .map((workout) => {
        const weightStr =
          workout.weight > 0 ? `${workout.weight}kg` : "Adaptive";
        return `
      <div class="history-item">
        <div class="history-item-title">${workout.mode}</div>
        <div class="history-item-details">${weightStr} • ${workout.reps} reps</div>
      </div>
    `;
      })
      .join("");
  }

  completeWorkout() {
    if (this.currentWorkout) {
      // Add to history
      this.addToWorkoutHistory({
        mode: this.currentWorkout.mode,
        weight: this.currentWorkout.weight,
        reps: this.workingReps, // Actual reps completed
        timestamp: new Date(),
      });

      // Reset to empty state
      this.resetRepCountersToEmpty();
      this.addLogEntry("Workout completed and saved to history", "success");
    }
  }

  handleRepNotification(data) {
    // Parse rep notification
    if (data.length < 6) {
      return; // Not enough data
    }

    // Parse as u16 array
    const numU16 = data.length / 2;
    const u16Values = [];
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let i = 0; i < numU16; i++) {
      u16Values.push(view.getUint16(i * 2, true));
    }

    // u16[2] is the rep complete counter
    if (u16Values.length >= 3) {
      const completeCounter = u16Values[2];

      // Track last counter value to detect increments
      if (this.lastRepCounter === undefined) {
        this.lastRepCounter = completeCounter;
        return;
      }

      // Check if counter incremented
      let delta = 0;
      if (completeCounter >= this.lastRepCounter) {
        delta = completeCounter - this.lastRepCounter;
      } else {
        // Handle wrap-around
        delta = 0xffff - this.lastRepCounter + completeCounter + 1;
      }

      if (delta > 0) {
        // Rep completed!
        const totalReps = this.warmupReps + this.workingReps + 1;

        if (totalReps <= this.warmupTarget) {
          // Still in warmup
          this.warmupReps++;
          this.addLogEntry(
            `Warmup rep ${this.warmupReps}/${this.warmupTarget} complete`,
            "success",
          );
        } else {
          // Working reps
          this.workingReps++;
          if (this.targetReps > 0) {
            this.addLogEntry(
              `Working rep ${this.workingReps}/${this.targetReps} complete`,
              "success",
            );
          } else {
            this.addLogEntry(
              `Working rep ${this.workingReps} complete`,
              "success",
            );
          }

          // Auto-complete workout when target reps are reached
          if (this.targetReps > 0 && this.workingReps >= this.targetReps) {
            this.addLogEntry(
              "Target reps reached! Auto-completing workout...",
              "success",
            );
            this.completeWorkout();
          }
        }

        this.updateRepCounters();
      }

      this.lastRepCounter = completeCounter;
    }
  }

  async connect() {
    try {
      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        alert(
          "Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.",
        );
        return;
      }

      await this.device.connect();
      this.updateConnectionStatus(true);

      // Send initialization sequence
      await this.device.sendInit();
    } catch (error) {
      console.error("Connection error:", error);
      this.addLogEntry(`Connection failed: ${error.message}`, "error");
      this.updateConnectionStatus(false);
    }
  }

  async disconnect() {
    try {
      await this.device.disconnect();
      this.updateConnectionStatus(false);
    } catch (error) {
      console.error("Disconnect error:", error);
      this.addLogEntry(`Disconnect failed: ${error.message}`, "error");
    }
  }

  async stopWorkout() {
    try {
      await this.device.sendStopCommand();
      this.addLogEntry("Workout stopped by user", "info");

      // Complete the workout and save to history
      this.completeWorkout();
    } catch (error) {
      console.error("Stop workout error:", error);
      this.addLogEntry(`Failed to stop workout: ${error.message}`, "error");
      alert(`Failed to stop workout: ${error.message}`);
    }
  }

  async startProgram() {
    try {
      const modeSelect = document.getElementById("mode");
      const weightInput = document.getElementById("weight");
      const repsInput = document.getElementById("reps");

      const mode = parseInt(modeSelect.value);
      const perCableKg = parseFloat(weightInput.value);
      const reps =
        mode === ProgramMode.JUST_LIFT ? 0 : parseInt(repsInput.value);

      // Validate inputs
      if (isNaN(perCableKg) || perCableKg < 0 || perCableKg > 100) {
        alert("Please enter a valid weight (0-100 kg)");
        return;
      }

      if (
        mode !== ProgramMode.JUST_LIFT &&
        (isNaN(reps) || reps < 1 || reps > 100)
      ) {
        alert("Please enter a valid number of reps (1-100)");
        return;
      }

      // Calculate effective weight (per_cable_kg + 10)
      const effectiveKg = perCableKg + 10.0;

      const params = {
        mode: mode,
        reps: reps,
        perCableKg: perCableKg,
        effectiveKg: effectiveKg,
        sequenceID: 0x0b,
      };

      // Set rep targets before starting
      this.warmupTarget = 3; // Programs always use 3 warmup reps
      this.targetReps = reps;
      this.lastRepCounter = undefined;

      // Reset workout state and set current workout info
      this.warmupReps = 0;
      this.workingReps = 0;
      this.currentWorkout = {
        mode: ProgramModeNames[mode] || "Program",
        weight: perCableKg,
        targetReps: reps,
      };
      this.updateRepCounters();

      await this.device.startProgram(params);

      // Set up monitor listener
      this.device.addMonitorListener((sample) => {
        this.updateLiveStats(sample);
      });

      // Set up rep listener
      this.device.addRepListener((data) => {
        this.handleRepNotification(data);
      });

      // Close sidebar on mobile after starting
      this.closeSidebar();
    } catch (error) {
      console.error("Start program error:", error);
      this.addLogEntry(`Failed to start program: ${error.message}`, "error");
      alert(`Failed to start program: ${error.message}`);
    }
  }

  async startEcho() {
    try {
      const levelSelect = document.getElementById("echoLevel");
      const eccentricInput = document.getElementById("eccentric");
      const targetInput = document.getElementById("targetReps");

      const level = parseInt(levelSelect.value) - 1; // Convert to 0-indexed
      const eccentricPct = parseInt(eccentricInput.value);
      const warmupReps = 3; // Hardcoded warmup reps for Echo mode
      const targetReps = parseInt(targetInput.value);

      // Validate inputs
      if (isNaN(eccentricPct) || eccentricPct < 0 || eccentricPct > 200) {
        alert("Please enter a valid eccentric percentage (0-200)");
        return;
      }

      if (isNaN(targetReps) || targetReps < 0 || targetReps > 30) {
        alert("Please enter valid target reps (0-30)");
        return;
      }

      const params = {
        level: level,
        eccentricPct: eccentricPct,
        warmupReps: warmupReps,
        targetReps: targetReps,
        sequenceID: 0x01,
      };

      // Set rep targets before starting
      this.warmupTarget = 3; // Always 3 for Echo mode
      this.targetReps = targetReps;
      this.lastRepCounter = undefined;

      // Reset workout state and set current workout info
      this.warmupReps = 0;
      this.workingReps = 0;
      this.currentWorkout = {
        mode: `Echo ${EchoLevelNames[level]}`,
        weight: 0, // Echo mode doesn't have fixed weight
        targetReps: targetReps,
      };
      this.updateRepCounters();

      await this.device.startEcho(params);

      // Set up monitor listener
      this.device.addMonitorListener((sample) => {
        this.updateLiveStats(sample);
      });

      // Set up rep listener
      this.device.addRepListener((data) => {
        this.handleRepNotification(data);
      });

      // Close sidebar on mobile after starting
      this.closeSidebar();
    } catch (error) {
      console.error("Start Echo error:", error);
      this.addLogEntry(`Failed to start Echo mode: ${error.message}`, "error");
      alert(`Failed to start Echo mode: ${error.message}`);
    }
  }

  loadColorPreset() {
    const presetSelect = document.getElementById("colorPreset");
    const preset = presetSelect.value;

    if (!preset) {
      return; // Custom option selected
    }

    const scheme = PredefinedColorSchemes[preset];
    if (!scheme) {
      return;
    }

    // Update color pickers
    const colorToHex = (color) => {
      return (
        "#" +
        color.r.toString(16).padStart(2, "0") +
        color.g.toString(16).padStart(2, "0") +
        color.b.toString(16).padStart(2, "0")
      );
    };

    document.getElementById("color1").value = colorToHex(scheme.colors[0]);
    document.getElementById("color2").value = colorToHex(scheme.colors[1]);
    document.getElementById("color3").value = colorToHex(scheme.colors[2]);
  }

  async setColorScheme() {
    try {
      const color1Input = document.getElementById("color1");
      const color2Input = document.getElementById("color2");
      const color3Input = document.getElementById("color3");

      // Use fixed brightness of 0.4 (adjusting brightness doesn't seem to work)
      const brightness = 0.4;

      // Parse colors from hex inputs
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 0, g: 0, b: 0 };
      };

      const colors = [
        hexToRgb(color1Input.value),
        hexToRgb(color2Input.value),
        hexToRgb(color3Input.value),
      ];

      await this.device.setColorScheme(brightness, colors);
    } catch (error) {
      console.error("Set color scheme error:", error);
      this.addLogEntry(`Failed to set color scheme: ${error.message}`, "error");
      alert(`Failed to set color scheme: ${error.message}`);
    }
  }
}

// Create global app instance
const app = new VitruvianApp();

// Log startup message
app.addLogEntry("Vitruvian Web Control Ready", "success");
app.addLogEntry('Click "Connect to Device" to begin', "info");
app.addLogEntry("", "info");
app.addLogEntry("Requirements:", "info");
app.addLogEntry("- Chrome, Edge, or Opera browser", "info");
app.addLogEntry("- HTTPS connection (or localhost)", "info");
app.addLogEntry("- Bluetooth enabled on your device", "info");
