const game = document.getElementById("game");
const dino = document.getElementById("dino");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const cloud = document.getElementById("cloud");
const scoreModal = document.getElementById("scoreModal");
const playerName = document.getElementById("playerName");
const sendScoreBtn = document.getElementById("sendScoreBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const rankMsg = document.getElementById("rankMsg");

const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbyxzYULoMltIpiJeoabeCipMgxhK6eF7KxVMjNHTl17b7fR6a6tJKGYyrGIWBDPZd1l/exec"; 

const CLOUD_SPRITES = ["ccc.webp", "sc.webp"];
const TREE_SPRITES = ["t1.webp", "t2.webp"];
const BUSH_SPRITES = ["b1.webp", "b2.webp"];

let cloudSpeed = 0.25;
let scenery = [];

const BASE_WIDTH = 900;
const GROUND_Y = 14;
const DINO_X = 10;
const DEBUG_HITBOX = false;

const SPEED_BASE = 420;
const SPEED_RAMP = 10;

const ENEMY = {
  dog: { height: 110, ratio: 1.0545, sprite: "papa.webp", hitbox: { w: 0.7, h: 0.7, x: 0.15, y: 0.15 } },
  dad: { height: 135, ratio: 0.661, sprite: "dad.webp", hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 }, dropIn: true },
  drunk: { height: 145, ratio: 0.567, sprite: "rl.webp", hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 } },
  go: { height: 175, ratio: 0.567, sprite: "go.webp", hitbox: { w: 0.6, h: 0.75, x: 0.2, y: 0.1 } },
  W: { height: 175, ratio: 0.567, sprite: "w.webp", hitbox: { w: 0.6, h: 0.75, x: 0.2, y: 0.1 } },
  boy: { height: 145, ratio: 0.678, sprite: "luis.webp", hitbox: { w: 0.65, h: 0.75, x: 0.18, y: 0.15 }, mole: true }
};

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
const JUMP_MIN = 1000;       
const HOLD_GRAVITY = 1200; 
const MAX_HOLD_TIME = 0.20;  
let jumpHold = false;
let jumpHoldLeft = 0;

// Obstacles & Game state
let obstacles = [];
let spawnTimer = 0;

const MOLE_ZONE_W = 60;     
const MOLE_POP_MS = 210;     
const MOLE_ARM_MS = 95;      
const MOLE_HIDE_EXTRA = 30; 

const DROP_ZONE_W = 60;      
const DROP_MS = 200;         
const DROP_ARM_MS = 90;      
const DROP_HIDE_EXTRA = 30;  

const DRUNK_FALL_CHANCE = 0;      
const DRUNK_FALL_AFTER_FRAC = 1/3;   
const DRUNK_FALL_ARM_MS = 360;       

let speed = SPEED_BASE;
let score = 0;
let scoreAcc = 0;
let best = Number(localStorage.getItem("dino_best") || 0);
bestEl.textContent = best;

let cloudX = 0;
const SCENERY_GAP = 220; 
let lastT = performance.now();
let scoreSubmitted = false;
let lastEnemy = null;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function isMobile() { return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1; }
function randomCloud() { return CLOUD_SPRITES[(Math.random() * CLOUD_SPRITES.length) | 0]; }

function drawHitbox(rect) {
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

  for (const s of scenery) s.el.remove();
  scenery = [];
  for (let i = 0; i < 3; i++) spawnScenery();

  cloud.src = randomCloud();
  cloud.style.top = rand(20, 70) + "px";
  cloudSpeed = rand(0.18, 0.35);
  cloudX = game.clientWidth + 40;
  cloud.style.transform = `translate3d(${cloudX}px, 0, 0)`;

  overlay.classList.remove("show");
  document.querySelector(".hint").style.opacity = 1;
  scoreModal.classList.remove("show");
  rankMsg.textContent = "";
  playerName.value = "";
  scoreSubmitted = false;
  sendScoreBtn.textContent = "ส่งคะแนน";
  closeModalBtn.style.display = "";
  
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
    vy = JUMP_MIN;         
    jumpHold = true;
    jumpHoldLeft = MAX_HOLD_TIME;
  }
}

function addObstacle({ type, bottom, speedMult = 1 }) {
  const enemy = ENEMY[type];
  if (!enemy) return;

  const el = document.createElement("div");
  el.className = "obstacle";
  const h = enemy.height;
  const w = h * enemy.ratio;
  const x = game.clientWidth + 20;

  el.style.left = x + "px";
  el.style.bottom = bottom + "px";
  el.style.height = h + "px";
  el.style.width = w + "px";
  el.style.backgroundImage = `url(${enemy.sprite})`;
  el.style.backgroundSize = "contain";
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = "bottom center";

  const hb = enemy.hitbox || { w: 0.7, h: 0.7, x: 0.15, y: 0.15 };
  const hit = document.createElement("div");
  hit.className = "enemyHitbox";
  hit.style.position = "absolute";
  hit.style.left = (hb.x * 100) + "%";
  hit.style.bottom = (hb.y * 100) + "%";
  hit.style.width = (hb.w * 100) + "%";
  hit.style.height = (hb.h * 100) + "%";
  el.appendChild(hit);

  let mole = false, popped = true, armAt = 0;
  let drop = false, dropped = true, dropAt = 0;
  let drunkFall = false, drunkFallen = false, drunkArmAt = 0;

  if (type === "drunk" && Math.random() < DRUNK_FALL_CHANCE) drunkFall = true;

  if (enemy.mole) {
    mole = true; popped = false;
    el.style.transform = `translateY(${h + MOLE_HIDE_EXTRA}px)`;
    el.style.transition = `transform ${MOLE_POP_MS}ms ease-out`;
  }

  if (enemy.dropIn) {
    drop = true; dropped = false;
    el.style.transform = `translateY(-${h + DROP_HIDE_EXTRA}px)`;
    el.style.transition = `transform ${DROP_MS}ms ease-in`;
  }

  game.appendChild(el);
  obstacles.push({ el, hit, type, x, w, h, bottom, speedMult, mole, popped, armAt, drop, dropped, dropAt, drunkFall, drunkFallen, drunkArmAt });
}

function spawnEnemy() {
  let type = pick(ENEMY_POOL);
  if (type === lastEnemy && Math.random() < 0.65) type = pick(ENEMY_POOL);
  lastEnemy = type;
  addObstacle({ type, bottom: GROUND_Y });
}

function scheduleNextSpawn() {
  const difficulty = Math.min(1, Math.sqrt(score / 9000));
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
  const distanceFromRightEdge = (game.clientWidth - last.x);
  const rawScale = game.clientWidth / BASE_WIDTH;
  const widthScale = Math.max(0.85, Math.min(1.35, rawScale));
  const ws = Math.min(1.2, widthScale);
  const speedGap = Math.min(SPEED_GAP_CAP, speed * ws * 0.25);
  const required = (SPAWN_GAP / ws) + speedGap;
  return distanceFromRightEdge > required;
}

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function spawnScenery() {
  const el = document.createElement("img");
  el.className = "scenery";
  const isBush = Math.random() < 0.45;
  el.src = isBush ? pick(BUSH_SPRITES) : pick(TREE_SPRITES);

  const h = isBush ? rand(40, 60) : rand(120, 180);
  el.style.height = h + "px";
  el.style.width = "auto";

  const last = scenery.length ? scenery[scenery.length - 1] : null;
  const startX = game.clientWidth + 80;
  const x = last ? Math.max(startX, last.x + SCENERY_GAP + rand(0, 120)) : startX;

  el.style.transform = `translate3d(${x}px, 0, 0)`;
  game.appendChild(el);

  scenery.push({ el, x, speed: isBush ? rand(0.16, 0.28) : rand(0.10, 0.22) });
}

function update(dt) {
  const rawScale = game.clientWidth / BASE_WIDTH;
  const widthScale = Math.max(0.85, Math.min(1.35, rawScale)); 

  if (running && !dead) {
    speed += SPEED_RAMP * dt;
    scoreAcc += 60 * dt;
    const add = Math.floor(scoreAcc);
    if (add > 0) {
      score += add;
      scoreAcc -= add;
      scoreEl.textContent = score;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && canSpawn()) spawnObstacle();

    let gravity = GRAVITY;
    if (jumpHold && jumpHoldLeft > 0 && vy > 0) {
      gravity = HOLD_GRAVITY;
      jumpHoldLeft -= dt;
    }
    vy -= gravity * dt;
    y += vy * dt;
    if (y < 0) { y = 0; vy = 0; }
    dino.style.bottom = (GROUND_Y + y) + "px";

    const toRemove = [];
    for (const o of obstacles) {
      o.x -= (speed * widthScale * o.speedMult) * dt;
      o.el.style.left = o.x + "px";

      if (o.mole && !o.popped && o.x <= game.clientWidth - MOLE_ZONE_W) {
        o.popped = true;
        o.el.style.transform = "translateY(0)";
        o.armAt = performance.now() + MOLE_ARM_MS;
      }

      if (o.drop && !o.dropped && o.x <= game.clientWidth - DROP_ZONE_W) {
        o.dropped = true;
        o.el.style.transform = "translateY(0)";
        o.dropAt = performance.now() + DROP_ARM_MS;
      }

      if (o.drunkFall && !o.drunkFallen && o.x <= game.clientWidth * (1 - DRUNK_FALL_AFTER_FRAC)) {
        o.drunkFallen = true;
        o.el.classList.add("drunkFallRight");
        o.drunkArmAt = performance.now() + DRUNK_FALL_ARM_MS;
      }

      if (o.x + o.w < -60) toRemove.push(o);
    }

    for (const o of toRemove) {
      o.el.remove();
      obstacles.splice(obstacles.indexOf(o), 1);
    }

    cloudX -= (speed * widthScale * cloudSpeed) * dt;
    const cloudW = cloud.getBoundingClientRect().width || 80;
    if (cloudX < -cloudW - 10) {
      cloudX = game.clientWidth + 40;
      cloud.src = randomCloud();
      cloud.style.top = rand(20, 70) + "px";
      cloudSpeed = rand(0.18, 0.35);
    }
    cloud.style.transform = `translate3d(${cloudX}px, 0, 0)`;

    for (let i = scenery.length - 1; i >= 0; i--) {
      const s = scenery[i];
      s.x -= (speed * widthScale * s.speed) * dt;
      s.el.style.transform = `translate3d(${s.x}px, 0, 0)`;

      const w = s.el.getBoundingClientRect().width || 120;
      if (s.x < -w - 10) {
        s.el.remove();
        scenery.splice(i, 1);
        spawnScenery();
      }
    }

    const hit = dino.querySelector(".dinoHitbox");
    const dRect = (hit ? hit : dino).getBoundingClientRect();
    if (DEBUG_HITBOX) drawHitbox(dRect);

    for (const o of obstacles) {
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
    // Idle background movement
    cloudX -= (40 * cloudSpeed) * dt;
    const cloudW = cloud.getBoundingClientRect().width || 80;
    if (cloudX < -cloudW - 10) {
      cloudX = game.clientWidth + 40;
      cloud.src = randomCloud();
      cloud.style.top = rand(20, 70) + "px";
      cloudSpeed = rand(0.18, 0.35);
    }
    cloud.style.transform = `translate3d(${cloudX}px, 0, 0)`;

    for (let i = scenery.length - 1; i >= 0; i--) {
      const s = scenery[i];
      s.x -= (40 * s.speed) * dt;
      s.el.style.transform = `translate3d(${s.x}px, 0, 0)`;
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
  return s.replace(/\s+/g, " ").trim();
}

// ---------------- Leaderboard Modal Events ----------------

closeModalBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  scoreModal.classList.remove("show");
});

sendScoreBtn.addEventListener("click", async (e) => {
  e.stopPropagation();

  if (scoreSubmitted) {
    scoreModal.classList.remove("show");
    reset(); 
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
    scoreSubmitted = true;
    sendScoreBtn.textContent = "เล่นอีกครั้ง";
    sendScoreBtn.disabled = false;
    closeModalBtn.style.display = "none";
    closeModalBtn.disabled = true;
  } catch (err){
    rankMsg.textContent = "ส่งคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง";
  } finally {
    if (!scoreSubmitted) {
      sendScoreBtn.disabled = false;
      closeModalBtn.disabled = false;
    }
  }
});

// Controls
window.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (dead) { reset(); start(); return; }
    jump();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") jumpHold = false;
});

game.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, input, .leaderboard, .scoreModal")) return;
  if (e.pointerType !== "mouse") return;
  if (dead) { reset(); start(); return; }
  jump();                
  jumpHold = true;       
}, { passive: true });

game.addEventListener("pointerup", (e) => {
  if (e.pointerType === "mouse") jumpHold = false;      
}, { passive: true });

window.addEventListener("pointerup", (e) => {
  if (e.pointerType === "mouse") jumpHold = false;
});

game.addEventListener("touchstart", (e) => {
  if (e.target.closest("button, input, .scoreModal")) return;
  e.preventDefault();
  if (dead) { reset(); start(); return; }
  jump();
}, { passive: false });

game.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
game.addEventListener("touchend", () => jumpHold = false);
game.addEventListener("touchcancel", () => jumpHold = false);

// Init
reset();
requestAnimationFrame(loop);
