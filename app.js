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

// ============================
// Elements
// ============================
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const rulesBtn = document.getElementById("rulesBtn");

const results = document.getElementById("results");
const finalResult = document.getElementById("finalResult");

const swingSound = document.getElementById("swingSound");
const announceSound = document.getElementById("announceSound");
const applauseSound = document.getElementById("applauseSound");
const rulesSound = document.getElementById("rulesSound");

// ============================
// Rules Audio
// ============================
rulesBtn.onclick = () => {
  rulesSound.currentTime = 0;
  rulesSound.play();
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

  // 2 seconds silent → swing sound
  setTimeout(() => {
    swingSound.currentTime = 0;
    swingSound.play();
  }, 2000);

  // Measurement window
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
      evaluateResult();
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

  const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

  if (magnitude > peakAcceleration) {
    peakAcceleration = magnitude;
  }

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
  const d = 300 * (1 - Math.exp(-k * acc));
  return Math.min(d, 300);
}

// ============================
// Final Evaluation
// ============================
function evaluateResult() {
  const validSwings = swings.filter(d => d > 0);

  let average = 0;
  let penalty = 0;
  let finalDistance = 0;

  if (validSwings.length > 0) {
    average = validSwings.reduce((s, d) => s + d, 0) / validSwings.length;

    const variance =
      validSwings.reduce((s, d) => s + Math.pow(d - average, 2), 0) /
      validSwings.length;

    penalty = Math.sqrt(variance) * 0.8;
    finalDistance = Math.max(average - penalty, 0);
  }

  finalResult.innerHTML = `
    <p>Average Distance: ${average.toFixed(1)} yd</p>
    <p>Stability Penalty: -${penalty.toFixed(1)} yd</p>
    <strong>Final Result: ${finalDistance.toFixed(1)} yd</strong>
  `;

  // 3 sec delay → announce → applause
  announceSound.currentTime = 0;
  applauseSound.currentTime = 0;

  setTimeout(() => {
    announceSound.play();
    announceSound.onended = () => {
      applauseSound.play();
    };
  }, 3000);
}

// ============================
// Reset
// ============================
resetBtn.onclick = () => {
  swings = [];
  results.innerHTML = "";
  finalResult.innerHTML = "";
};

