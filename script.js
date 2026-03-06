const game = document.getElementById("game");
const dino = document.getElementById("dino");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const cloud = document.getElementById("cloud");
const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbyxzYULoMltIpiJeoabeCipMgxhK6eF7KxVMjNHTl17b7fR6a6tJKGYyrGIWBDPZd1l/exec"; // <-- paste the new web app URL

const CLOUD_SPRITES = [
  "ccc.webp",
  "sc.webp"
];

const TREE_SPRITES = [
  "t1.webp",
  "t2.webp"
];

const BUSH_SPRITES = [
  "b1.webp",
  "b2.webp"
];

let cloudSpeed = 0.25;
let scenery = [];

const BASE_WIDTH = 900;
const GROUND_Y = 14;
const DINO_X = 10;
const DEBUG_HITBOX = false;

const SPEED_BASE = 420;
const SPEED_RAMP = 10;

const ENEMY = {
  dog: {
    height: 110,
    ratio: 1.05454545455,
    sprite: "papa.webp",
    hitbox: { w: 0.7, h: 0.7, x: 0.15, y: 0.15 }
  },
  dad: {
    height: 135,
    ratio: 0.6610738255,
    sprite: "dad.webp",
    hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 },
    dropIn: true
  },
  drunk: {
    height: 145,
    ratio: 0.5670103093,
    sprite: "rl.webp",
    hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 }
  },
    go: {
    height: 175,
    ratio: 0.5670103093,
    sprite: "go.webp",
    hitbox: { w: 0.6, h: 0.75, x: 0.2, y: 0.1 }
  },
    W: {
    height: 175,
    ratio: 0.5670103093,
    sprite: "w.webp",
    hitbox: { w: 0.6, h: 0.75, x: 0.2, y: 0.1 }
  },
  boy: {
    height: 145,
    ratio: 0.6782608696,
    sprite: "luis.webp",
    hitbox: { w: 0.65, h: 0.75, x: 0.18, y: 0.15 },
    mole: true
  }
};

// If you want to control odds, change weights here
const ENEMY_POOL = ["W", "dog", "dad", "go", "drunk", "boy"];
const SPAWN_GAP = 300;
const SPEED_GAP_CAP = 280;

let running = false;
let dead = false;

// Dino physics
let y = 0;
let vy = 0;
const GRAVITY = 3000;
const JUMP_V = 1000;
const JUMP_MIN = 1000;       // tap jump strength (tweak)
const HOLD_GRAVITY = 1200; // weaker gravity while holding
const MAX_HOLD_TIME = 0.20;  // seconds
let jumpHold = false;
let jumpHoldLeft = 0;

// Obstacles
let obstacles = [];
let spawnTimer = 0;

// Mole
const MOLE_ZONE_W = 60;     // width of the "right region"
const MOLE_POP_MS = 210;     // animation speed
const MOLE_ARM_MS = 95;      // delay before hitbox becomes active after popping
const MOLE_HIDE_EXTRA = 30; // how much deeper underground

// Jumper
const DROP_ZONE_W = 60;      // hwidth of the "right region"
const DROP_MS = 200;         // animation speed
const DROP_ARM_MS = 90;      // delay before hitbox becomes active after dropping
const DROP_HIDE_EXTRA = 30;  // how much higher from above

// Drunk
const DRUNK_FALL_CHANCE = 0;      // % of drunk enemies will fall
const DRUNK_FALL_AFTER_FRAC = 1/3;   // fall after crossing define amount of game width from the right
const DRUNK_FALL_ARM_MS = 360;       // match animation duration so collision doesn't feel unfair

// Speed/score
let speed = SPEED_BASE;
let score = 0;
let scoreAcc = 0;
let best = Number(localStorage.getItem("dino_best") || 0);
bestEl.textContent = best;

// Cloud & Scenery
let cloudX = 0;
const SCENERY_GAP = 220; // increase if still overlaps

// Time
let lastT = performance.now();

// Helpers
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
let scoreSubmitted = false;

function isMobile(){
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
}

function randomCloud(){
  return CLOUD_SPRITES[(Math.random() * CLOUD_SPRITES.length) | 0];
}

function drawHitbox(rect){
  const el = document.createElement("div");
  el.className = "hitboxDebug";
  el.style.left = rect.left + "px";
  el.style.top = rect.top + "px";
  el.style.width = rect.width + "px";
  el.style.height = rect.height + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 16);
}

function reset() {
  document.querySelector(".charRight")?.classList.remove("runAway");
  jumpHold = false;
  jumpHoldLeft = 0;
  running = false;
  dead = false;
  speed = SPEED_BASE;
  score = 0;
  scoreAcc = 0;
  scoreEl.textContent = "0";

  y = 0;
  vy = 0;

  dino.className = "dino";
  dino.style.left = DINO_X + "px";
  dino.style.bottom = (GROUND_Y + y) + "px";

  for (const o of obstacles) o.el.remove();
  obstacles = [];
  spawnTimer = 0;

  for (let i = 0; i < 3; i++) spawnScenery();
  cloud.src = randomCloud();
  cloud.style.top = rand(20, 70) + "px";
  cloudSpeed = rand(0.18, 0.35);
  cloudX = game.clientWidth + 40;
  cloud.style.left = cloudX + "px";

  overlay.classList.remove("show");
  document.querySelector(".hint").style.opacity = 1;
  scoreModal.classList.remove("show");
  rankMsg.textContent = "";
  playerName.value = "";
  scoreSubmitted = false;
  sendScoreBtn.textContent = "ส่งคะแนน";
  closeModalBtn.style.display = "";
  rankMsg.textContent = "";
  scheduleNextSpawn();
}

function start() {
  if (dead) return;
  running = true;
  dino.classList.add("running");
  document.querySelector(".hint").style.opacity = 0;
}

function gameOver() {
  document.querySelector(".charRight")?.classList.add("runAway");
  dead = true;
  running = false;
  dino.classList.remove("running");
  overlay.classList.add("show");



  if (score > best) {
    best = score;
    localStorage.setItem("dino_best", String(best));
    bestEl.textContent = best;
    document.getElementById("title").textContent = "พาปลาเชดไปหาฝ่าบาท";
    document.getElementById("subtitle").textContent = "แตะจอเพื่อเริ่มใหม่";
  } else {
    document.getElementById("title").textContent = "Nooooooooooooooo";
    document.getElementById("subtitle").textContent = "แตะจอเพื่อเริ่มใหม่";
  }
}

function jump() {
  if (dead) return;
  if (!running) start();

  if (y <= 0.001) {
    vy = JUMP_MIN;          // ✅ tap starts smaller
    jumpHold = true;
    jumpHoldLeft = MAX_HOLD_TIME;
  }
}

function addObstacle({ type, bottom, speedMult = 1 }) {
  const enemy = ENEMY[type];
  if (!enemy) return;

  const el = document.createElement("div");
  el.className = "obstacle";
  el.style.position = "absolute"; // important for inner hitbox positioning
  el.style.backgroundColor = "transparent";

  const h = enemy.height;
  const w = h * enemy.ratio;
  const x = game.clientWidth + 20;

  el.style.setProperty("--ow", w + "px");
  el.style.left = x + "px";
  el.style.bottom = bottom + "px";
  el.style.height = h + "px";
  el.style.width = w + "px";

  el.style.backgroundImage = `url(${enemy.sprite})`;
  el.style.backgroundSize = "contain";
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = "bottom center";

 

  // ✅ add smaller hitbox inside the sprite
  const hb = enemy.hitbox || { w: 0.7, h: 0.7, x: 0.15, y: 0.15 }; // default shrink
  const hit = document.createElement("div");
  hit.className = "enemyHitbox";
  hit.style.position = "absolute";
  hit.style.left = (hb.x * 100) + "%";
  hit.style.bottom = (hb.y * 100) + "%";
  hit.style.width = (hb.w * 100) + "%";
  hit.style.height = (hb.h * 100) + "%";
  // optional debug outline (remove if you don’t want)
  // hit.style.outline = "2px solid red";

  el.appendChild(hit);

  // Mole behavior
  let mole = false;
  let popped = true;
  let armAt = 0;

// Jump behavior
let drop = false;
let dropped = true;
let dropAt = 0;

// Drunk behavior

let drunkFall = false;
let drunkFallen = false;
let drunkArmAt = 0;

if (type === "drunk" && Math.random() < DRUNK_FALL_CHANCE) {
  drunkFall = true;
}

if (enemy.mole) {
  mole = true;
  popped = false;

  // hide underground
  el.style.transform = `translateY(${h + MOLE_HIDE_EXTRA}px)`;
  el.style.transition = `transform ${MOLE_POP_MS}ms ease-out`;

  // make sure it can’t collide yet
  el.dataset.armed = "0";
}

if (enemy.dropIn) {
  drop = true;
  dropped = false;

  // start hidden above
  el.style.transform = `translateY(-${h + DROP_HIDE_EXTRA}px)`;
  el.style.transition = `transform ${DROP_MS}ms ease-in`;
  el.dataset.armed = "0";
}

  game.appendChild(el);
  obstacles.push({
  el, hit, type, x, w, h, bottom, speedMult,
  mole, popped, armAt,
  drop, dropped, dropAt,
  drunkFall, drunkFallen, drunkArmAt
});
}

let lastEnemy = null;
function spawnEnemy() {
  let type = pick(ENEMY_POOL);

  // avoid too many repeats
  if (type === lastEnemy && Math.random() < 0.65) {
    type = pick(ENEMY_POOL);
  }
  lastEnemy = type;

  addObstacle({ type, bottom: GROUND_Y });
}

function scheduleNextSpawn() {
  // simple but fair
  const difficulty = Math.min(1, Math.sqrt(score / 9000));
  // const difficulty = Math.min(1, score / 6000);
  const minGap = 0.85 - difficulty * 0.22;
  const maxGap = 1.45 - difficulty * 0.25;

  spawnTimer = rand(Math.max(0.60, minGap), Math.max(0.90, maxGap));

  if (score < 400) spawnTimer = Math.max(spawnTimer, 1.0);
}

function spawnObstacle() {
  spawnEnemy();
  scheduleNextSpawn();
}

function canSpawn() {
  if (obstacles.length === 0) return true;

  const last = obstacles[obstacles.length - 1];

  // distance from last obstacle to the right edge of the screen
  const distanceFromRightEdge = (game.clientWidth - last.x);

  // pro rule: required spacing grows with speed (and respects mobile scaling)
  const rawScale = game.clientWidth / BASE_WIDTH;
  const widthScale = Math.max(0.85, Math.min(1.35, rawScale));

  const ws = Math.min(1.2, widthScale);
  const speedGap = Math.min(SPEED_GAP_CAP, speed * ws * 0.25);
  const required = (SPAWN_GAP / ws) + speedGap;

  return distanceFromRightEdge > required;
}

/*
// Bird enemy reserved for future:
function spawnBird() {
  // If you add bird later, add ENEMY.bird and call addObstacle({ type:"bird", bottom: ... })
}
*/

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function spawnScenery(){
  const el = document.createElement("img");
  el.className = "scenery";

  const isBush = Math.random() < 0.45;
  const sprite = isBush ? pick(BUSH_SPRITES) : pick(TREE_SPRITES);
  el.src = sprite;

  // ✅ different size ranges
  const h = isBush ? rand(40, 60) : rand(120, 180);
  el.style.height = h + "px";
  el.style.width = "auto";

  // ✅ spacing rule
  const last = scenery.length ? scenery[scenery.length - 1] : null;
  const startX = game.clientWidth + 80;
  const x = last ? Math.max(startX, last.x + SCENERY_GAP + rand(0, 120)) : startX;

  el.style.left = x + "px";

  game.appendChild(el);

  scenery.push({
    el,
    x,
    speed: isBush ? rand(0.16, 0.28) : rand(0.10, 0.22) // bushes move a bit faster
  });
}

function update(dt) {
  const rawScale = game.clientWidth / BASE_WIDTH;
  const widthScale = Math.max(0.85, Math.min(1.35, rawScale)); 

  if (running && !dead) {
    speed += SPEED_RAMP * dt;
    scoreAcc += 60 * dt;               // 60 points per second
    const add = Math.floor(scoreAcc);
    if (add > 0) {
      score += add;
      scoreAcc -= add;
      scoreEl.textContent = score;
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && canSpawn()) spawnObstacle();

// Dino physics (variable height via gravity while holding)
let gravity = GRAVITY;

if (jumpHold && jumpHoldLeft > 0 && vy > 0) {
  gravity = HOLD_GRAVITY;
  jumpHoldLeft -= dt;
}

vy -= gravity * dt;

y += vy * dt;
if (y < 0) { y = 0; vy = 0; }
dino.style.bottom = (GROUND_Y + y) + "px";

    // Move obstacles
const toRemove = [];
for (const o of obstacles) {
  o.x -= (speed * widthScale * o.speedMult) * dt;
  o.el.style.left = o.x + "px";

  // 🟢 MOLE LOGIC (boy pop-up after leaving right zone)
  if (o.mole && !o.popped) {
    const popLine = game.clientWidth - MOLE_ZONE_W;

    // pop only after leaving the right zone
    if (o.x <= popLine) {
      o.popped = true;

      // rise from ground
      o.el.style.transform = "translateY(0)";

      // activate hitbox slightly after popping
      o.armAt = performance.now() + MOLE_ARM_MS;
    }
  }

// 🔵 DROP-IN LOGIC (dad drops after leaving right zone)
if (o.drop && !o.dropped) {
  const dropLine = game.clientWidth - DROP_ZONE_W;

  if (o.x <= dropLine) {
    o.dropped = true;

    // drop into place
    o.el.style.transform = "translateY(0)";

    // activate hitbox slightly after dropping
    o.dropAt = performance.now() + DROP_ARM_MS;
  }
}

// 🍺 DRUNK FALL: trigger after it crosses 1/3 of the game from the right
if (o.drunkFall && !o.drunkFallen) {
  const fallLine = game.clientWidth * (1 - DRUNK_FALL_AFTER_FRAC); // = 2/3 width

  if (o.x <= fallLine) {
    o.drunkFallen = true;
    o.el.classList.add("drunkFallRight");
    o.drunkArmAt = performance.now() + DRUNK_FALL_ARM_MS;
  }
}

  if (o.x + o.w < -60) toRemove.push(o);
}

for (const o of toRemove) {
  o.el.remove();
  obstacles.splice(obstacles.indexOf(o), 1);
}

    // Cloud
    cloudX -= (speed * widthScale * cloudSpeed) * dt;

const cloudW = cloud.getBoundingClientRect().width || 80;
if (cloudX < -cloudW - 10) {
  cloudX = game.clientWidth + 40;

  cloud.src = randomCloud();
  cloud.style.top = rand(20, 70) + "px";
  cloudSpeed = rand(0.18, 0.35);
}

cloud.style.left = cloudX + "px";

// Scenery (trees/bush)
for (let i = scenery.length - 1; i >= 0; i--) {
  const s = scenery[i];
  s.x -= (speed * widthScale * s.speed) * dt;
  s.el.style.left = s.x + "px";

  const w = s.el.getBoundingClientRect().width || 120;
  if (s.x < -w - 10) {
    s.el.remove();
    scenery.splice(i, 1);
    spawnScenery();
  }
}

    // Collision
    const hit = dino.querySelector(".dinoHitbox");
    const dRect = (hit ? hit : dino).getBoundingClientRect();
    if (DEBUG_HITBOX) drawHitbox(dRect);

    for (const o of obstacles) {
      // Skip collision if mole boy hasn't popped / armed yet
      if (o.mole && (!o.popped || performance.now() < o.armAt)) continue;
      if (o.drop && (!o.dropped || performance.now() < o.dropAt)) continue;
      if (o.drunkFall && o.drunkFallen && performance.now() < o.drunkArmAt) continue;
      const oRect = (o.hit ? o.hit : o.el).getBoundingClientRect();
      if (DEBUG_HITBOX) drawHitbox(oRect);
      if (rectsOverlap(dRect, oRect)) {
        gameOver();
        break;
      }
    }
  } else {
    cloudX -= (40 * cloudSpeed) * dt;

const cloudW = cloud.getBoundingClientRect().width || 80;
if (cloudX < -cloudW - 10) {
  cloudX = game.clientWidth + 40;

  cloud.src = randomCloud();
  cloud.style.top = rand(20, 70) + "px";
  cloudSpeed = rand(0.18, 0.35);
}

cloud.style.left = cloudX + "px";
// Scenery (trees/bush) - idle drift
for (let i = scenery.length - 1; i >= 0; i--) {
  const s = scenery[i];
  s.x -= (40 * s.speed) * dt;
  s.el.style.left = s.x + "px";

  const w = s.el.getBoundingClientRect().width || 120;
  if (s.x < -w - 10) {
    s.el.remove();
    scenery.splice(i, 1);
    spawnScenery();
  }
}
  }
}

function loop(t) {
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  update(dt);
  requestAnimationFrame(loop);
}

function safeNameLocal(raw){
  let s = String(raw || "").trim();
  if (s.length > 30) s = s.slice(0, 30);
  s = s.replace(/[\u0000-\u001F\u007F]/g, "");
  s = s.replace(/[<>]/g, "");
  s = s.replace(/[^\p{L}\p{M}\p{N} ._\-()'’]/gu, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function renderLeaderboard(top){
  const body = document.getElementById("lbBody");
  if (!body) return;

  // ✅ If top is not a proper array, do nothing (keep current table)
  if (!Array.isArray(top)) return;

  body.innerHTML = "";

  top.slice(0, 10).forEach((row, i) => {
    const tr = document.createElement("tr");

    const tdRank = document.createElement("td");
    tdRank.style.padding = "6px 0px";
    tdRank.style.textAlign = "center";
    tdRank.textContent = String(i + 1);

    const tdName = document.createElement("td");
    tdName.style.padding = "6px 4px";
    tdName.textContent = row.name || "-";

    const tdScore = document.createElement("td");
    tdScore.style.padding = "6px 4px";
    tdScore.style.textAlign = "center";
    tdScore.textContent = String(row.score ?? 0);

    tr.appendChild(tdRank);
    tr.appendChild(tdName);
    tr.appendChild(tdScore);

    body.appendChild(tr);
  });
}

// ---------------- Leaderboard (cached toggle) ----------------

const lbFilterBtn = document.getElementById("lbFilterBtn");

let lbMode = "all"; // all | mobile | desktop
let lbCache = { all: null, mobile: null, desktop: null };
let lbLoading = { all: false, mobile: false, desktop: false };

function lbIcon(mode){
  if (mode === "mobile") return "📱";
  if (mode === "desktop") return "💻";
  return "📱💻";
}

function setLbBtn(mode, loading){
  if (!lbFilterBtn) return;
  lbFilterBtn.textContent = loading ? "⏳" : lbIcon(mode);
  lbFilterBtn.style.opacity = loading ? "0.65" : "1";
  lbFilterBtn.style.pointerEvents = loading ? "none" : "auto";
}

async function fetchTop10(mode){
  if (!LEADERBOARD_URL) return null;
  if (lbLoading[mode]) return null;

  lbLoading[mode] = true;
  try{
    const params = new URLSearchParams({ action: "top10" });
    if (mode !== "all") params.set("device", mode);

    const url =
      LEADERBOARD_URL +
      (LEADERBOARD_URL.includes("?") ? "&" : "?") +
      params.toString();

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data && data.ok){
      lbCache[mode] = data.top || [];
      return lbCache[mode];
    }
    return null;
  } finally {
    lbLoading[mode] = false;
  }
}

async function showLeaderboard(mode, forceFetch = false){
  lbMode = mode;

  // instant if cached
  if (!forceFetch && lbCache[mode]){
    setLbBtn(mode, false);
    renderLeaderboard(lbCache[mode]);
    return;
  }

  // fetch with small loading on button
  setLbBtn(mode, true);
  const top = await fetchTop10(mode);
  setLbBtn(mode, false);

  if (top) renderLeaderboard(top);
}

// stop bubbling into game
if (lbFilterBtn){
  lbFilterBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  lbFilterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const next =
      lbMode === "all" ? "mobile" :
      lbMode === "mobile" ? "desktop" :
      "all";

    // if cached, instant, else fetch
    showLeaderboard(next).catch(()=>{});
  });
}

// ------- leaderboard modal behavior -------


const scoreModal = document.getElementById("scoreModal");
const playerName = document.getElementById("playerName");
const sendScoreBtn = document.getElementById("sendScoreBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const rankMsg = document.getElementById("rankMsg");


closeModalBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  scoreModal.classList.remove("show");
});

sendScoreBtn.addEventListener("click", async (e) => {
  e.stopPropagation();

  // ✅ If already submitted, this button becomes "Play again"
  if (scoreSubmitted) {
    scoreModal.classList.remove("show");
    reset(); // back to default tap-to-start
    return;
  }

  if (!LEADERBOARD_URL) return;

  const name = safeNameLocal(playerName.value);
  if (!name){
    rankMsg.textContent = "กรุณาใส่ชื่อก่อน";
    return;
  }

  sendScoreBtn.disabled = true;
  closeModalBtn.disabled = true;
  rankMsg.textContent = "กำลังส่งคะแนน...";

  try{
    const res = await fetch(LEADERBOARD_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submit",
        name,
        score,
        ua: navigator.userAgent,
        device: isMobile() ? "mobile" : "desktop"
      })
    });

    const data = await res.json();
    if (!data || !data.ok) throw new Error(data?.error || "submit failed");

    rankMsg.innerHTML = `คุณอยู่อันดับ <strong style="font-size:1.2em">${data.rank}</strong> จาก <strong style="font-size:1.2em">${data.totalPlayers}</strong> คน`;

// ✅ Switch button mode
scoreSubmitted = true;
sendScoreBtn.textContent = "เล่นอีกครั้ง";

// allow "play again" click
sendScoreBtn.disabled = false;

// remove/lock cancel
closeModalBtn.style.display = "none";
closeModalBtn.disabled = true;

// allow UI to repaint before leaderboard refresh
await new Promise(requestAnimationFrame);

// Invalidate caches so next view is fresh
lbCache.all = null;
lbCache.mobile = null;
lbCache.desktop = null;

// Refresh the CURRENT view using the normal GET flow (same as toggle)
await showLeaderboard(lbMode, true);

// Optional: warm the other tabs again so toggling stays instant
fetchTop10("mobile").catch(()=>{});
fetchTop10("desktop").catch(()=>{});

  } catch (err){
    rankMsg.textContent = "ส่งคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง";
  } finally {
    sendScoreBtn.disabled = false;
    closeModalBtn.disabled = false;
  }
});

// -----------------------------------

// Controls
window.addEventListener("keydown", (e) => {
  // ignore typing inside inputs or textarea
  if (e.target.closest("input, textarea")) return;

  if (e.code === "Space") {
    e.preventDefault();
    if (dead) { reset(); start(); return; }
    jump();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    jumpHold = false;
  }
});

// mouse click for desktop
// Mouse (desktop): hold to jump higher
game.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, input, .leaderboard, .scoreModal")) return;
  if (e.pointerType !== "mouse") return;
  if (dead) { reset(); start(); return; }
  jump();                // starts jump + hold
  jumpHold = true;       // ensure hold is on
}, { passive: true });

game.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "mouse") return;
  jumpHold = false;      // release hold
}, { passive: true });

window.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "mouse") return;
  jumpHold = false;
});

// instant tap for mobile
game.addEventListener("touchstart", (e) => {
  if (e.target.closest("button, input, .scoreModal")) return;
  e.preventDefault();
  if (dead) { reset(); start(); return; }
  jump();
}, { passive:false });

game.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, { passive:false });

game.addEventListener("touchend", () => {
  jumpHold = false;
});

game.addEventListener("touchcancel", () => {
  jumpHold = false;
});

// Init
reset();
requestAnimationFrame(loop);

// Init leaderboard
showLeaderboard("all", true).catch(()=>{});

// Preload other tabs in background (so toggle becomes instant)
fetchTop10("mobile").catch(()=>{});
fetchTop10("desktop").catch(()=>{});
