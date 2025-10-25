// --- BEGIN Sidebar Features and Logic ---

const EXERCISES = {
  chest: [
    { name: "Bench Press", image: "images/bench-press.gif" },
    { name: "Incline Press", image: "images/incline-press.gif" },
    { name: "Chest Fly", image: "images/chest-fly.gif" }
  ],
  back: [
    { name: "Pull-Ups", image: "images/pull-ups.gif" },
    { name: "Lat Pulldown", image: "images/lat-pulldown.gif" },
    { name: "Seated Row", image: "images/seated-row.gif" }
  ],
  legs: [
    { name: "Squats", image: "images/squat.gif" },
    { name: "Lunges", image: "images/lunge.gif" },
    { name: "Leg Press", image: "images/leg-press.gif" }
  ],
  shoulders: [
    { name: "Overhead Press", image: "images/overhead-press.gif" },
    { name: "Lateral Raise", image: "images/lateral-raise.gif" }
  ],
  arms: [
    { name: "Bicep Curl", image: "images/bicep-curl.gif" },
    { name: "Tricep Pushdown", image: "images/tricep-pushdown.gif" }
  ],
  core: [
    { name: "Plank", image: "images/plank.gif" },
    { name: "Russian Twist", image: "images/russian-twist.gif" }
  ]
};

let selectedExercise = null;
let personalBests = JSON.parse(localStorage.getItem('vitruvian_pbs') || '{}');
let leaderboard = JSON.parse(localStorage.getItem('vitruvian_leaderboard') || '[]');

function initSidebarFeatures() {
  renderExercises();
  renderPersonalBests();
  renderLeaderboard();

  const searchEl = document.getElementById('exerciseSearch');
  const filterEl = document.getElementById('muscleFilter');
  const startBtn = document.getElementById('startBtn');

  if (searchEl) searchEl.oninput = renderExercises;
  if (filterEl) filterEl.onchange = renderExercises;
  if (startBtn) startBtn.onclick = startWorkoutFromSidebar;
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>\