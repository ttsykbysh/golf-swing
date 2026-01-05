// ===== 認証 =====
const VALID_TOKEN = "GOLF2026";
const params = new URLSearchParams(window.location.search);
if (params.get("token") !== VALID_TOKEN) {
  document.body.innerHTML = "<h2>認証に失敗しました</h2>";
  throw new Error("Unauthorized");
}

// ===== 状態 =====
let swings = [];
let listening = false;
let peak = 0;

// ===== 要素 =====
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const results = document.getElementById("results");
const finalResult = document.getElementById("finalResult");

// ===== スイング処理 =====
startBtn.onclick = async () => {
  if (swings.length >= 3) return alert("3回完了しています");

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") return;
  }

  peak = 0;
  listening = true;

  window.addEventListener("devicemotion", handleMotion);

  setTimeout(() => {
    listening = false;
    window.removeEventListener("devicemotion", handleMotion);

    const distance = calcDistance(peak);
    swings.push(distance);

    const li = document.createElement("li");
    li.textContent = `スイング${swings.length}：${distance.toFixed(1)} yd`;
    results.appendChild(li);

    if (swings.length === 3) evaluate();
  }, 1200);
};

function handleMotion(e) {
  if (!listening) return;
  const a = e.accelerationIncludingGravity;
  const mag = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
  if (mag > peak) peak = mag;
}

function calcDistance(acc) {
  const k = 0.045;
  const raw = 300 * (1 - Math.exp(-k * acc));
  return Math.min(raw, 300);
}

// ===== 評価 =====
function evaluate() {
  const avg = swings.reduce((a,b)=>a+b)/3;
  const variance = swings.reduce((a,b)=>a+(b-avg)**2,0)/3;
  const std = Math.sqrt(variance);
  const penalty = std * 0.8;
  const final = Math.max(avg - penalty, 0);

  finalResult.innerHTML = `
    <h2>結果</h2>
    <p>平均飛距離：${avg.toFixed(1)} yd</p>
    <p>安定性ペナルティ：-${penalty.toFixed(1)} yd</p>
    <h3>最終評価：${final.toFixed(1)} yd</h3>
  `;
}

// ===== リセット =====
resetBtn.onclick = () => {
  swings = [];
  results.innerHTML = "";
  finalResult.innerHTML = "";
};
