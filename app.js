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
// Constants (Swing Detection Tuning)
// ============================
const MIN_SWING_THRESHOLD = 5.0;   // 重力除外後の有効スイング閾値
const REQUIRED_ACTIVE_FRAMES = 3;  // 連続フレーム数（ノイズ除去）

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
const results = document.getElementById("results");
const finalResult = document.getElementById("finalResult");
const swingSound = document.getElementById("swingSound");

// ============================
// Swing Measurement
// ============================
startBtn.onclick = async () => {
  if (swings.length >= 3) {
    alert("3 swings already completed");
    return;
  }

  // iOS permission request
  if (typeof DeviceMotionEvent?.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") return;
  }

  // Reset measurement state
  peakAcceleration = 0;
  activeFrameCount = 0;
  swingDetected = false;
  listening = true;

  window.addEventListener("devicemotion", handleMotion);

  // 🔊 Play swing sound after 2 seconds (silent preparation time)
  setTimeout(() => {
    swingSound.currentTime = 0;
    swingSound.play();
  }, 2000);

  // End measurement window
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
// Motion Handling (Gravity Excluded)
// ============================
function handleMotion(event) {
  if (!listening) return;

  const a = event.acceleration; // 重力除外
  if (!a) return;

  const magnitude = Math.sqrt(
    a.x * a.x +
    a.y * a.y +
    a.z * a.z
  );

  // Track peak acceleration
  if (magnitude > peakAcceleration) {
    peakAcceleration = magnitude;
  }

  // Swing detection using consecutive frames
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
  const distance = 300 * (1 - Math.exp(-k * acc));
  return Math.min(distance, 300);
}

// ============================
// Final Evaluation
// ============================
function evaluateResult() {

  // Exclude 0-yard (no swing) records
  const validSwings = swings.filter(d => d > 0);

  // If no valid swings at all
  if (validSwings.length === 0) {
    finalResult.innerHTML = `
      <p>Average Distance: 0.0 yd</p>
      <p>Stability Penalty: -0.0 yd</p>
      <strong>Final Result: 0.0 yd</strong>
    `;
    return;
  }

  // Average distance (valid swings only)
  const average =
    validSwings.reduce((sum, d) => sum + d, 0) / validSwings.length;

  // Variance & standard deviation (valid swings only)
  const variance =
    validSwings.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / validSwings.length;

  const stdDev = Math.sqrt(variance);

  // Stability penalty
  const penalty = stdDev * 0.8;

  const finalDistance = Math.max(average - penalty, 0);

  finalResult.innerHTML = `
    <p>Average Distance: ${average.toFixed(1)} yd</p>
    <p>Stability Penalty: -${penalty.toFixed(1)} yd</p>
    <strong>Final Result: ${finalDistance.toFixed(1)} yd</strong>
  `;
}

// ============================
// Reset
// ============================
resetBtn.onclick = () => {
  swings = [];
  results.innerHTML = "";
  finalResult.innerHTML = "";
};

