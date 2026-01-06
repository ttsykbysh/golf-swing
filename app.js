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
const MIN_SWING_THRESHOLD = 8.0;   // ★ これが最重要
const REQUIRED_ACTIVE_FRAMES = 3;  // 連続判定（ノイズ除去）

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

  // iOS permission
  if (typeof DeviceMotionEvent?.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") return;
  }

  // reset state
  peakAcceleration = 0;
  activeFrameCount = 0;
  swingDetected = false;
  listening = true;

  window.addEventListener("devicemotion", handleMotion);

  // 🔊 効果音（2秒後）
  setTimeout(() => {
    swingSound.currentTime = 0;
    swingSound.play();
  }, 2000);

  // 計測終了
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

    if (swings.length === 3) evaluateResult();
  }, 1200);
};

function handleMotion(event) {
  if (!listening) return;

  const a = event.accelerationIncludingGravity;
  const magnitude = Math.sqrt(
    a.x * a.x + a.y * a.y + a.z * a.z
  );

  // ピーク更新
  if (magnitude > peakAcceleration) {
    peakAcceleration = magnitude;
  }

  // ★ 有効スイング判定
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
  const average =
    swings.reduce((sum, d) => sum + d, 0) / swings.length;

  const variance =
    swings.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / swings.length;

  const stdDev = Math.sqrt(variance);
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
