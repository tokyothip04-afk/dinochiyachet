const game = document.getElementById("game");
const dino = document.getElementById("dino");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const cloud = document.getElementById("cloud");

const CLOUD_SPRITES = [
  "cloud1.webp",
  "cloud2.webp"
];

const TREE_SPRITES = [
  "tree1.webp",
  "tree2.webp"
];

const BUSH_SPRITES = [
  "bush1.webp",
  "bush2.webp"
];

let cloudSpeed = 0.25;
let scenery = [];

const BASE_WIDTH = 900;
const GROUND_Y = 14;
const DINO_X = 10;

const SPEED_BASE = 420;
const SPEED_RAMP = 10;

const ENEMY = {
  dog: {
    height: 75,
    ratio: 1.05,
    sprite: "circle2.webp",
    hitbox: { w: 0.7, h: 0.7, x: 0.15, y: 0.15 }
  },
  dad: {
    height: 125,
    ratio: 0.66,
    sprite: "dad.webp",
    hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 },
    dropIn: true
  },
  drunk: {
    height: 115,
    ratio: 0.56,
    sprite: "circle1.webp",
    hitbox: { w: 0.6, h: 0.8, x: 0.2, y: 0.1 }
  },
  boy: {
    height: 105,
    ratio: 0.67,
    sprite: "circle.webp",
    hitbox: { w: 0.65, h: 0.75, x: 0.18, y: 0.15 },
    mole: true
  }
};

const ENEMY_POOL = ["dog","dog","dad","drunk","drunk","boy"];

let running = false;
let dead = false;

let y = 0;
let vy = 0;

const GRAVITY = 3000;
const JUMP_MIN = 1000;
const HOLD_GRAVITY = 1200;
const MAX_HOLD_TIME = 0.2;

let jumpHold = false;
let jumpHoldLeft = 0;

let obstacles = [];
let spawnTimer = 0;

let speed = SPEED_BASE;
let score = 0;
let scoreAcc = 0;
let best = Number(localStorage.getItem("dino_best") || 0);

bestEl.textContent = best;

let cloudX = 0;
let lastT = performance.now();

const rand = (a,b)=>a+Math.random()*(b-a);
const pick = arr=>arr[(Math.random()*arr.length)|0];

function randomCloud(){
  return pick(CLOUD_SPRITES);
}

function reset(){

  running=false;
  dead=false;
  speed=SPEED_BASE;

  score=0;
  scoreAcc=0;
  scoreEl.textContent="0";

  y=0;
  vy=0;

  dino.className="dino";
  dino.style.left=DINO_X+"px";
  dino.style.bottom=(GROUND_Y+y)+"px";

  obstacles.forEach(o=>o.el.remove());
  obstacles=[];

  spawnTimer=0;

  overlay.classList.remove("show");

  document.querySelector(".hint").style.opacity=1;

  cloud.src=randomCloud();
  cloud.style.top=rand(20,70)+"px";

  cloudSpeed=rand(.18,.35);
  cloudX=game.clientWidth+40;

  cloud.style.left=cloudX+"px";

}

function start(){

  if(dead)return;

  running=true;
  dino.classList.add("running");

  document.querySelector(".hint").style.opacity=0;

}

function gameOver(){

  dead=true;
  running=false;

  dino.classList.remove("running");

  overlay.classList.add("show");

  if(score>best){

    best=score;
    localStorage.setItem("dino_best",best);
    bestEl.textContent=best;

  }

  document.getElementById("title").textContent="Nooooooooooooooo";
  document.getElementById("subtitle").textContent="แตะจอเพื่อเริ่มใหม่";

}

function jump(){

  if(dead)return;

  if(!running)start();

  if(y<=0.001){

    vy=JUMP_MIN;
    jumpHold=true;
    jumpHoldLeft=MAX_HOLD_TIME;

  }

}

function addObstacle({type,bottom}){

  const enemy=ENEMY[type];

  const el=document.createElement("div");
  el.className="obstacle";

  const h=enemy.height;
  const w=h*enemy.ratio;

  let x=game.clientWidth+20;

  el.style.left=x+"px";
  el.style.bottom=bottom+"px";

  el.style.height=h+"px";
  el.style.width=w+"px";

  el.style.backgroundImage=`url(${enemy.sprite})`;
  el.style.backgroundSize="contain";
  el.style.backgroundRepeat="no-repeat";
  el.style.backgroundPosition="bottom center";

  const hb=enemy.hitbox;

  const hit=document.createElement("div");
  hit.className="enemyHitbox";

  hit.style.position="absolute";
  hit.style.left=(hb.x*100)+"%";
  hit.style.bottom=(hb.y*100)+"%";
  hit.style.width=(hb.w*100)+"%";
  hit.style.height=(hb.h*100)+"%";

  el.appendChild(hit);

  game.appendChild(el);

  obstacles.push({el,hit,x,w,h});

}

function spawnEnemy(){

  const type=pick(ENEMY_POOL);

  addObstacle({
    type,
    bottom:GROUND_Y
  });

}

function rectsOverlap(a,b){

  return !(
    a.right<b.left||
    a.left>b.right||
    a.bottom<b.top||
    a.top>b.bottom
  );

}

function update(dt){

  if(running&&!dead){

    speed+=SPEED_RAMP*dt;

    scoreAcc+=60*dt;

    const add=Math.floor(scoreAcc);

    if(add>0){

      score+=add;
      scoreAcc-=add;

      scoreEl.textContent=score;

    }

    spawnTimer-=dt;

    if(spawnTimer<=0){

      spawnEnemy();
      spawnTimer=rand(.9,1.4);

    }

    let gravity=GRAVITY;

    if(jumpHold&&jumpHoldLeft>0&&vy>0){

      gravity=HOLD_GRAVITY;
      jumpHoldLeft-=dt;

    }

    vy-=gravity*dt;

    y+=vy*dt;

    if(y<0){

      y=0;
      vy=0;

    }

    dino.style.bottom=(GROUND_Y+y)+"px";

    const toRemove=[];

    for(const o of obstacles){

      o.x-=speed*dt;

      o.el.style.left=o.x+"px";

      if(o.x+o.w<-60)toRemove.push(o);

    }

    for(const o of toRemove){

      o.el.remove();
      obstacles.splice(obstacles.indexOf(o),1);

    }

    const hit=dino.querySelector(".dinoHitbox");
    const dRect=(hit?hit:dino).getBoundingClientRect();

    for(const o of obstacles){

      const oRect=(o.hit?o.hit:o.el).getBoundingClientRect();

      if(rectsOverlap(dRect,oRect)){

        gameOver();
        break;

      }

    }

  }

}

function loop(t){

  const dt=Math.min(.033,(t-lastT)/1000);

  lastT=t;

  update(dt);

  requestAnimationFrame(loop);

}

window.addEventListener("keydown",e=>{

  if(e.code==="Space"){

    e.preventDefault();

    if(dead){

      reset();
      start();
      return;

    }

    jump();

  }

});

window.addEventListener("keyup",e=>{

  if(e.code==="Space")jumpHold=false;

});

game.addEventListener("pointerdown",e=>{

  if(dead){

    reset();
    start();
    return;

  }

  jump();
  jumpHold=true;

},{passive:true});

game.addEventListener("pointerup",()=>{

  jumpHold=false;

});

reset();
requestAnimationFrame(loop);
