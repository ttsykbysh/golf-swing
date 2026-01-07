// ============================
// Token Authentication
// ============================
const VALID_TOKEN = "GOLF2026";
const params = new URLSearchParams(window.location.search);

if (params.get("token") !== VALID_TOKEN) {
  document.body.innerHTML = "<h2>Authentication Failed</h2>";
  throw new Error("Unauthorized");
}

// ============================
// Constants
// ============================
const MIN_SWING_THRESHOLD = 8.5;
const REQUIRED_ACTIVE_FRAMES = 3;

// ============================
// State
// ============================
let swings = [];
let listening = false;
let peakAcceleration = 0;
let activeFrameCount = 0;
let swingDetected = false;
let silentMode = false;

// ============================
// Elements
// ============================
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const rulesBtn = document.getElementById("rulesBtn");
const silentBtn = document.getElementById("silentBtn");

const results = document.getElementById("results");
const finalResult = document.getElementById("finalResult");

const swingSound = document.getElementById("swingSound");
const rulesSound = document.getElementById("rulesSound");
const drumRollSound = document.getElementById("drumRollSound");
const announceSound = document.getElementById("announceSound");
const thankYouSound = document.getElementById("thankYouSound");
const silentOnSound = document.getElementById("silentOnSound");
const silentOffSound = document.getElementById("silentOffSound");

// ============================
// Utility
// ============================
function playSound(audio) {
  if (silentMode) return;
  audio.currentTime = 0;
  audio.play();
}

// ============================
// Silent Mode Toggle
// ============================
silentBtn.onclick = () => {
  silentMode = !silentMode;
  silentBtn.classList.toggle("active", silentMode);

  if (silentMode) {
    silentOnSound.currentTime = 0;
    silentOnSound.play();
  } else {
    silentOffSound.currentTime = 0;
    silentOffSound.play();
  }
};

// ============================
// Rules Audio
// ============================
rulesBtn.onclick = () => {
  playSound(rulesSound);
};

// ============================
// Swing Measurement
// ============================
startBtn.onclick = async () => {
  if (swings.length >= 3) return;

  if (typeof DeviceMotionEvent?.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") return;
  }

  peakAcceleration = 0;
  activeFrameCount = 0;
  swingDetected = false;
  listening = true;

  window.addEventListener("devicemotion", handleMotion);

  setTimeout(() => {
    playSound(swingSound);
  }, 2000);

  setTimeout(() => {
    listening = false;
    window.removeEventListener("devicemotion", handleMotion);

    let distance = 0;
    if (swingDetected) {
      distance = calculateDistance(peakAcceleration);
    }

    swings.push(distance);

    const li = document.createElement("li");
    li.textContent = swingDetected
      ? `Swing ${swings.length}: ${distance.toFixed(1)} yd`
      : `Swing ${swings.length}: No Swing (0 yd)`;

    results.appendChild(li);

    if (swings.length === 3) {
      evaluateResultWithSounds();
    }
  }, 1200);
};

// ============================
// Motion Handling
// ============================
function handleMotion(event) {
  if (!listening) return;
  const a = event.acceleration;
  if (!a) return;

  const magnitude = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);

  if (magnitude > peakAcceleration) peakAcceleration = magnitude;

  if (magnitude >= MIN_SWING_THRESHOLD) {
    activeFrameCount++;
    if (activeFrameCount >= REQUIRED_ACTIVE_FRAMES) {
      swingDetected = true;
    }
  } else {
    activeFrameCount = 0;
  }
}

// ============================
// Distance Calculation
// ============================
function calculateDistance(acc) {
  const k = 0.045;
  return Math.min(300 * (1 - Math.exp(-k * acc)), 300);
}

// ============================
// Final Evaluation
// ============================
function evaluateResultWithSounds() {

  setTimeout(() => {
    playSound(drumRollSound);

    drumRollSound.onended = () => {
      playSound(announceSound);

      announceSound.onended = () => {

        const valid = swings.filter(d => d > 0);
        let avg = 0, penalty = 0, finalD = 0;

        if (valid.length > 0) {
          avg = valid.reduce((s, d) => s + d, 0) / valid.length;
          const variance =
            valid.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / valid.length;
          penalty = Math.sqrt(variance) * 0.8;
          finalD = Math.max(avg - penalty, 0);
        }

        finalResult.innerHTML = `
          <p>Average Distance: ${avg.toFixed(1)} yd</p>
          <p>Stability Penalty: -${penalty.toFixed(1)} yd</p>
          <strong>Final Result: ${finalD.toFixed(1)} yd</strong>
        `;

        playSound(thankYouSound);
      };
    };
  }, 2000);
}

// ============================
// Reset
// ============================
resetBtn.onclick = () => {

  // Silent Mode解除
  if (silentMode) {
    silentMode = false;
    silentBtn.classList.remove("active");
    silentOffSound.currentTime = 0;
    silentOffSound.play();
  }

  swings = [];
  results.innerHTML = "";
  finalResult.innerHTML = "";
};


