// --- Initialisation et Constantes ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

// --- DOM Elements ---
const moneySpan = document.getElementById('money');
const waveSpan = document.getElementById('wave');
const healthSpan = document.getElementById('planet-health');
const selectionSpan = document.getElementById('selection');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveSpan = document.getElementById('final-wave');

// --- Classes du jeu (inchangées) ---
class Planet {
    constructor() { this.x=SCREEN_WIDTH/2; this.y=SCREEN_HEIGHT+50; this.radius=100; this.color='#0000FF'; this.health=1000; }
    draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fillStyle=this.color; ctx.fill(); ctx.closePath(); }
}
class Enemy {
    constructor(x,y,s,h,v,w,t,c) { this.x=x;this.y=y;this.speed=s;this.health=h;this.maxHealth=h;this.value=v;this.width=w;this.height=t;this.color=c; }
    update(planet) { this.y+=this.speed; if(Math.hypot(this.x-planet.x,this.y-planet.y)<planet.radius){ planet.health-=10;this.health=0; } }
    draw(ctx) { ctx.fillStyle=this.color; ctx.fillRect(this.x-this.width/2,this.y-this.height/2,this.width,this.height); if(this.health<this.maxHealth){ ctx.fillStyle='red';ctx.fillRect(this.x-this.width/2,this.y-this.height/2-8,this.width,5);ctx.fillStyle='green';ctx.fillRect(this.x-this.width/2,this.y-this.height/2-8,this.width*(this.health/this.maxHealth),5); } }
}
class BasicShip extends Enemy { constructor(x,y,s){super(x,y,s,30,10,30,30,'#FF0000');} }
class FastShip extends Enemy { constructor(x,y,s){super(x,y,s*1.5,15,15,20,20,'#FFA500');} }
class Projectile {
    constructor(x,y,t,d,c) { this.x=x;this.y=y;this.target=t;this.damage=d;this.color=c;this.speed=8;this.width=5;this.height=10;this.active=true;const dx=t.x-x;const dy=t.y-y;const dist=Math.hypot(dx,dy);this.dx=dist===0?0:dx/dist*this.speed;this.dy=dist===0?-this.speed:dy/dist*this.speed; }
    update() { this.x+=this.dx;this.y+=this.dy;if(this.x<0||this.x>SCREEN_WIDTH||this.y<0||this.y>SCREEN_HEIGHT)this.active=false; }
    draw(ctx) { ctx.fillStyle=this.color;ctx.fillRect(this.x-this.width/2,this.y-this.height/2,this.width,this.height); }
}
class Defense {
    constructor(x,y,r,fr,c,pd,pc) { this.x=x;this.y=y;this.level=1;this.range=r;this.fireRate=fr;this.cost=c;this.upgradeCost=c*1.5;this.projectileDamage=pd;this.projectileColor=pc;this.lastShotTime=0;this.radius=20; }
    findTarget(enemies){ for(const e of enemies){if(Math.hypot(this.x-e.x,this.y-e.y)<=this.range)return e;}return null;}
    update(currentTime,enemies,projectiles){ const target=this.findTarget(enemies);if(target&&currentTime-this.lastShotTime>1000/this.fireRate){projectiles.push(new Projectile(this.x,this.y,target,this.projectileDamage,this.projectileColor));this.lastShotTime=currentTime;} }
    upgrade(){this.level++;this.range+=10;this.projectileDamage+=5;this.upgradeCost=Math.floor(this.upgradeCost*1.8);}
    draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);const color=`rgb(${Math.min(255,50+this.level*25)},${Math.max(0,255-this.level*25)},0)`;ctx.fillStyle=color;ctx.fill();ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px Arial';ctx.fillText(this.level,this.x,this.y);ctx.closePath();}
}
class Turret extends Defense { constructor(x,y){super(x,y,150,1.2,50,10,'#00FFFF');} }
class LaserTurret extends Defense { constructor(x,y){super(x,y,250,0.4,120,45,'#FF00FF');} }

// --- État du jeu ---
let gameState = {};

function resetGame() {
    gameState = {
        planet: new Planet(),
        enemies: [],
        defenses: [],
        projectiles: [],
        playerMoney: 150,
        wave: 0,
        isWaveOngoing: false,
        enemiesToSpawn: 0,
        lastSpawnTime: 0,
        selectedTurretType: 'Turret',
        turretCosts: { 'Turret': 50, 'LaserTurret': 120 },
        current: 'playing' // 'start_menu', 'playing', 'game_over'
    };
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    document.getElementById('ui-container').style.display = 'block';
}

// --- Logique de jeu ---
function updateUI() { moneySpan.textContent=gameState.playerMoney;waveSpan.textContent=gameState.wave;healthSpan.textContent=Math.max(0,gameState.planet.health);selectionSpan.textContent=`${gameState.selectedTurretType} (${gameState.turretCosts[gameState.selectedTurretType]}$)`; }
function startNextWave() { gameState.wave++;gameState.isWaveOngoing=true;gameState.enemiesToSpawn=5+gameState.wave*2; }
function spawnEnemy() { const x=Math.random()*(SCREEN_WIDTH-100)+50;const y=-30;const speed=1+Math.random()*1+gameState.wave*0.2;if(Math.random()<0.2+(gameState.wave*0.02)){gameState.enemies.push(new FastShip(x,y,speed));}else{gameState.enemies.push(new BasicShip(x,y,speed));}}
function handleCollisions() { for(let i=gameState.projectiles.length-1;i>=0;i--){const p=gameState.projectiles[i];for(let j=gameState.enemies.length-1;j>=0;j--){const e=gameState.enemies[j];if(Math.hypot(p.x-e.x,p.y-e.y)<e.width/2){e.health-=p.damage;p.active=false;if(e.health<=0)gameState.playerMoney+=e.value;break;}}}}

function update(currentTime) {
    if (gameState.current !== 'playing') return;
    if(!gameState.isWaveOngoing&&gameState.enemies.length===0)startNextWave();
    if(gameState.isWaveOngoing){if(gameState.enemiesToSpawn>0&&currentTime-gameState.lastSpawnTime>1000){spawnEnemy();gameState.enemiesToSpawn--;gameState.lastSpawnTime=currentTime;}else if(gameState.enemiesToSpawn===0&&gameState.enemies.length===0){gameState.isWaveOngoing=false;}}
    gameState.enemies.forEach(e=>e.update(gameState.planet));gameState.defenses.forEach(d=>d.update(currentTime,gameState.enemies,gameState.projectiles));gameState.projectiles.forEach(p=>p.update());
    handleCollisions();
    gameState.enemies=gameState.enemies.filter(e=>e.health>0);gameState.projectiles=gameState.projectiles.filter(p=>p.active);
    if(gameState.planet.health<=0){gameState.current='game_over';finalWaveSpan.textContent=gameState.wave;gameOverScreen.style.display='flex';document.getElementById('ui-container').style.display='none';}
    updateUI();
}
function draw() {
    ctx.clearRect(0,0,SCREEN_WIDTH,SCREEN_HEIGHT);
    if (gameState.current === 'playing') {
        gameState.planet.draw(ctx);
        gameState.enemies.forEach(e=>e.draw(ctx));
        gameState.defenses.forEach(d=>d.draw(ctx));
        gameState.projectiles.forEach(p=>p.draw(ctx));
    }
}
// --- Event Listeners ---
window.addEventListener('keydown', (e) => {
    if (gameState.current === 'start_menu' || gameState.current === 'game_over') {
        resetGame();
    } else if (gameState.current === 'playing') {
        if(e.key==='1')gameState.selectedTurretType='Turret';
        else if(e.key==='2')gameState.selectedTurretType='LaserTurret';
    }
});
canvas.addEventListener('click', (e) => {
    if(gameState.current!=='playing')return;
    const rect=canvas.getBoundingClientRect();const mouseX=e.clientX-rect.left;const mouseY=e.clientY-rect.top;
    let clickedOnDefense=false;
    for(const d of gameState.defenses){if(Math.hypot(mouseX-d.x,mouseY-d.y)<d.radius){if(gameState.playerMoney>=d.upgradeCost){gameState.playerMoney-=d.upgradeCost;d.upgrade();}clickedOnDefense=true;break;}}
    if(clickedOnDefense)return;
    const cost=gameState.turretCosts[gameState.selectedTurretType];
    if(gameState.playerMoney>=cost){const dist=Math.hypot(mouseX-gameState.planet.x,mouseY-gameState.planet.y);if(dist>gameState.planet.radius-20&&dist<gameState.planet.radius+20){const angle=Math.atan2(mouseY-gameState.planet.y,mouseX-gameState.planet.x);const px=gameState.planet.x+Math.cos(angle)*(gameState.planet.radius-20);const py=gameState.planet.y+Math.sin(angle)*(gameState.planet.radius-20);const TurretClass=gameState.selectedTurretType==='Turret'?Turret:LaserTurret;gameState.defenses.push(new TurretClass(px,py));gameState.playerMoney-=cost;}}
});

// --- Boucle de jeu ---
function gameLoop(currentTime) { update(currentTime); draw(); requestAnimationFrame(gameLoop); }

// Démarrer
gameState.current = 'start_menu';
document.getElementById('ui-container').style.display = 'none';
gameLoop(0);
