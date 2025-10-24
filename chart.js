// chart.js - Chart management and visualization

class ChartManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.chart = null;
    this.loadHistory = [];
    this.maxHistoryPoints = 72000; // 2hrs at 100ms polling (7200s / 0.1s = 72000 points)
    this.currentTimeRange = 30; // Current time range in seconds (default 30s)
    this.live = true;
    this.onLog = null; // Callback for logging
    this.updateInterval = null; // Interval handle for periodic updates
    this.updateFrequency = 10; // Update chart every 10ms
  }

  // Initialize uPlot chart
  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn("Chart container not found yet, will initialize later");
      return false;
    }

    // uPlot expects data in this format: [timestamps, series1, series2, ...]
    const data = [
      [], // timestamps (Unix time in seconds)
      [], // Total Load
      [], // Left Cable Load (B)
      [], // Right Cable Load (A)
      [], // Left Cable Position (B)
      [], // Right Cable Position (A)
    ];

    const opts = {
      width: container.clientWidth || 800,
      height: 300,
      cursor: {
        drag: {
          x: true,
          y: false,
        },
      },
      scales: {
        x: { time: true },

        load: {
          auto: true,
          range: (u, min, max) => {
            // Handle invalid data
            if (!isFinite(max) || max <= 0) {
              return [0, 10]; // Default to 0–10 when no data or all zeros
            }

            // Always start from 0, pad 10% above data max
            const paddedMax = max + max * 0.1;
            return [0, paddedMax];
          },
        },

        position: {
          auto: true,
          range: (u, min, max) => {
            if (!isFinite(max) || max <= 0) {
              return [0, 100]; // Default to 0–100 when no data or all zeros
            }

            const paddedMax = max + max * 0.1;
            return [0, paddedMax];
          },
        },
      },
      series: [
        {
          label: "Time",
          value: (u, v) => {
            if (v == null) return "-";
            const date = new Date(v * 1000);
            return date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });
          },
        },
        {
          label: "Total Load",
          stroke: "#667eea",
          width: 1.5,
          scale: "load",
          value: (u, v) => (v == null ? "-" : v.toFixed(1) + " kg"),
        },
        {
          label: "Left Load",
          stroke: "#ff6b6b",
          width: 1.5,
          scale: "load",
          value: (u, v) => (v == null ? "-" : v.toFixed(1) + " kg"),
        },
        {
          label: "Right Load",
          stroke: "#51cf66",
          width: 1.5,
          scale: "load",
          value: (u, v) => (v == null ? "-" : v.toFixed(1) + " kg"),
        },
        {
          label: "Left Position",
          stroke: "#ffa94d",
          width: 1.5,
          scale: "position",
          dash: [5, 5],
          value: (u, v) => (v == null ? "-" : v.toFixed(0)),
        },
        {
          label: "Right Position",
          stroke: "#94d82d",
          width: 1.5,
          scale: "position",
          dash: [5, 5],
          value: (u, v) => (v == null ? "-" : v.toFixed(0)),
        },
      ],
      axes: [
        {
          stroke: "#6c757d",
          grid: {
            show: true,
            stroke: "#dee2e6",
            width: 1,
          },
          ticks: {
            show: true,
            stroke: "#dee2e6",
          },
          values: (u, vals) => {
            // Format x-axis timestamps as HH:MM:SS only
            return vals.map((v) => {
              const date = new Date(v * 1000);
              return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });
            });
          },
        },
        {
          scale: "load",
          label: "Load (kg)",
          labelSize: 20,
          stroke: "#6c757d",
          size: 35,
          grid: {
            show: true,
            stroke: "#dee2e6",
            width: 1,
          },
          ticks: {
            show: true,
            stroke: "#dee2e6",
          },
        },
        {
          scale: "position",
          label: "Position (cm)",
          labelSize: 20,
          stroke: "#6c757d",
          size: 35,
          side: 1, // 1 = right side
          grid: {
            show: false, // Don't show grid for position to avoid clutter
          },
          ticks: {
            show: true,
            stroke: "#dee2e6",
          },
        },
      ],
      legend: {
        show: true,
        live: true,
      },
    };

    this.chart = new uPlot(opts, data, container);

    // Handle window resize
    window.addEventListener("resize", () => {
      if (this.chart && container) {
        this.chart.setSize({
          width: container.clientWidth,
          height: 300,
        });
      }
    });

    // Start periodic updates
    this.startPeriodicUpdates();

    return true;
  }

  // Start periodic chart updates
  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update chart every 10ms, separate from data collection
    this.updateInterval = setInterval(() => {
      this.update();
    }, this.updateFrequency);
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Add new data point to chart
  addData(sample) {
    // Add to load history
    this.loadHistory.push({
      timestamp: sample.timestamp,
      loadA: sample.loadA,
      loadB: sample.loadB,
      posA: sample.posA,
      posB: sample.posB,
    });

    // Trim history to max points (2hr limit)
    if (this.loadHistory.length > this.maxHistoryPoints) {
      const removed = this.loadHistory.shift();

      // Log when we hit the limit for the first time
      if (this.loadHistory.length === this.maxHistoryPoints && this.onLog) {
        this.onLog(
          "Reached 2hr data limit. Oldest data points will be removed as new data arrives.",
          "info",
        );
      }
    }

    // Chart updates happen on periodic interval
  }

  // Update function called periodically to either add new data or if not live, do nothing.
  update() {
    if (!this.chart || this.loadHistory.length === 0 || !this.live) return;
    this.updateChartData();
  }

  // Update chart with all data and trim time scale to current time range.
  updateChartData() {
    // Create fresh arrays each time
    const timestamps = [];
    const totalLoads = [];
    const loadsB = [];
    const loadsA = [];
    const positionsB = [];
    const positionsA = [];

    for (const point of this.loadHistory) {
      timestamps.push(point.timestamp.getTime() / 1000); // Convert to Unix seconds
      totalLoads.push(point.loadA + point.loadB);
      loadsB.push(point.loadB);
      loadsA.push(point.loadA);
      positionsB.push(point.posB);
      positionsA.push(point.posA);
    }

    // Data order: timestamps, Total Load, Left Load (B), Right Load (A), Left Pos (B), Right Pos (A)
    const data = [
      timestamps,
      totalLoads,
      loadsB,
      loadsA,
      positionsB,
      positionsA,
    ];
    this.chart.setData(data);

    // Auto-scroll to show latest data if user hasn't manually panned
    if (this.currentTimeRange !== null && timestamps.length > 0) {
      const latestTime = timestamps[timestamps.length - 1];
      const minTime = latestTime - this.currentTimeRange;
      this.chart.setScale("x", { min: minTime, max: latestTime });
    }
  }

  // Set time range for chart view
  setTimeRange(seconds) {
    this.currentTimeRange = seconds;

    // Update button active states
    document.getElementById("range10s").classList.remove("active");
    document.getElementById("range30s").classList.remove("active");
    document.getElementById("range60s").classList.remove("active");
    document.getElementById("range2m").classList.remove("active");
    document.getElementById("rangeAll").classList.remove("active");

    if (seconds) {
      this.live = true;
    }

    if (seconds === 10) {
      document.getElementById("range10s").classList.add("active");
    } else if (seconds === 30) {
      document.getElementById("range30s").classList.add("active");
    } else if (seconds === 60) {
      document.getElementById("range60s").classList.add("active");
    } else if (seconds === 120) {
      document.getElementById("range2m").classList.add("active");
    } else {
      this.live = false;
      this.updateChartData(); // Update chart with all data
      document.getElementById("rangeAll").classList.add("active");
    }

    // Update chart view
    this.update();
  }

  // Export chart data as CSV
  exportCSV() {
    if (this.loadHistory.length === 0) {
      alert("No data to export yet!");
      return;
    }

    // Build CSV content
    let csv =
      "Timestamp,Total Load (kg),Right Load (kg),Left Load (kg),Right Position,Left Position\n";

    for (const point of this.loadHistory) {
      const timestamp = point.timestamp.toISOString();
      const totalLoad = (point.loadA + point.loadB).toFixed(2);
      const loadA = point.loadA.toFixed(2);
      const loadB = point.loadB.toFixed(2);
      const posA = point.posA;
      const posB = point.posB;
      csv += `${timestamp},${totalLoad},${loadA},${loadB},${posA},${posB}\n`;
    }

    // Create download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout_${new Date().toISOString().split("T")[0]}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (this.onLog) {
      this.onLog(
        `Exported ${this.loadHistory.length} data points to CSV`,
        "success",
      );
    }
  }

  // Clear all data
  clear() {
    this.loadHistory = [];
    this.update();
  }

  // Get current data point count
  getDataCount() {
    return this.loadHistory.length;
  }
}
