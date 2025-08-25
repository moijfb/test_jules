// --- Initialisation et Constantes ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

// --- DOM Elements ---
const moneySpan = document.getElementById('money');
const waveSpan = document.getElementById('wave');
const healthSpan = document.getElementById('planet-health');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveSpan = document.getElementById('final-wave');
const turretChoices = document.querySelectorAll('.turret-choice');
const infoNameSpan = document.getElementById('info-name');
const infoLevelSpan = document.getElementById('info-level');
const infoDamageSpan = document.getElementById('info-damage');
const infoRangeSpan = document.getElementById('info-range');
const infoFirerateSpan = document.getElementById('info-firerate');
const infoUpgradeCostSpan = document.getElementById('info-upgrade-cost');
const nextWaveBtn = document.getElementById('next-wave-btn');

// --- Asset Loading ---
const assetSources = {
    planet: 'https://placehold.co/200x200/0033cc/001a66.png?text=O',
    basicShip: 'https://placehold.co/30x30/ff0000/000000.png?text=V',
    fastShip: 'https://placehold.co/25x25/ffa500/000000.png?text=v',
    turret: 'https://placehold.co/40x40/00ffff/000000.png?text=T',
    laserTurret: 'https://placehold.co/40x40/ff00ff/000000.png?text=L',
    projectile: 'https://placehold.co/5x10/ffff00/000000.png'
};
const assets = {};

function loadAssets(callback) {
    let assetsLoaded = 0;
    const numAssets = Object.keys(assetSources).length;
    startScreen.innerHTML = `<h2>Chargement des assets... ${numAssets}</h2>`;

    for (const key in assetSources) {
        assets[key] = new Image();
        assets[key].src = assetSources[key];
        assets[key].onload = () => {
            assetsLoaded++;
            if (assetsLoaded === numAssets) {
                startScreen.innerHTML = `<h2>Planet Defender</h2><p>Appuyez sur une touche pour commencer</p>`;
                callback();
            }
        };
        assets[key].onerror = () => { console.error(`Failed to load asset: ${assetSources[key]}`); };
    }
}


// --- Classes du jeu (avec Sprites) ---
class Planet {
    constructor() {
        this.image = assets.planet;
        this.width = this.image.width;
        this.height = this.image.height;
        this.x = SCREEN_WIDTH / 2;
        this.y = SCREEN_HEIGHT + this.height/2 - 50;
        this.radius = this.width / 2; // Collision radius
        this.health = 1000;
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.x - this.width / 2, this.y - this.height / 2);
    }
}
class Enemy {
    constructor(x,y,s,h,v,image) { this.x=x;this.y=y;this.speed=s;this.health=h;this.maxHealth=h;this.value=v;this.image=image;this.width=image.width;this.height=image.height; }
    update(planet) { this.y+=this.speed; if(Math.hypot(this.x-planet.x,this.y-planet.y)<planet.radius){ planet.health-=10;this.health=0; } }
    draw(ctx) { ctx.drawImage(this.image,this.x-this.width/2,this.y-this.height/2); if(this.health<this.maxHealth){ ctx.fillStyle='red';ctx.fillRect(this.x-this.width/2,this.y-this.height/2-8,this.width,5);ctx.fillStyle='green';ctx.fillRect(this.x-this.width/2,this.y-this.height/2-8,this.width*(this.health/this.maxHealth),5); } }
}
class BasicShip extends Enemy { constructor(x,y,s){super(x,y,s,30,10,assets.basicShip);} }
class FastShip extends Enemy { constructor(x,y,s){super(x,y,s*1.5,15,15,assets.fastShip);} }
class Projectile {
    constructor(x,y,t,d,image) { this.x=x;this.y=y;this.target=t;this.damage=d;this.image=image;this.width=image.width;this.height=image.height;this.speed=8;this.active=true;const dx=t.x-x;const dy=t.y-y;const dist=Math.hypot(dx,dy);this.dx=dist===0?0:dx/dist*this.speed;this.dy=dist===0?-this.speed:dy/dist*this.speed; }
    update() { this.x+=this.dx;this.y+=this.dy;if(this.x<0||this.x>SCREEN_WIDTH||this.y<0||this.y>SCREEN_HEIGHT)this.active=false; }
    draw(ctx) { ctx.drawImage(this.image,this.x-this.width/2,this.y-this.height/2); }
}
class Defense {
    constructor(x,y,r,fr,c,pd,image) { this.x=x;this.y=y;this.level=1;this.range=r;this.fireRate=fr;this.cost=c;this.upgradeCost=c*1.5;this.projectileDamage=pd;this.image=image;this.width=image.width;this.height=image.height;this.lastShotTime=0;this.radius=this.width/2;}
    findTarget(enemies){ for(const e of enemies){if(Math.hypot(this.x-e.x,this.y-e.y)<=this.range)return e;}return null;}
    update(currentTime,enemies,projectiles){ const target=this.findTarget(enemies);if(target&&currentTime-this.lastShotTime>1000/this.fireRate){projectiles.push(new Projectile(this.x,this.y,target,this.projectileDamage,assets.projectile));this.lastShotTime=currentTime;} }
    upgrade(){this.level++;this.range+=10;this.projectileDamage+=5;this.upgradeCost=Math.floor(this.upgradeCost*1.8);}
    draw(ctx){ctx.drawImage(this.image,this.x-this.width/2,this.y-this.height/2);ctx.fillStyle='white';ctx.strokeStyle='black';ctx.lineWidth=2;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px Arial';ctx.strokeText(this.level,this.x,this.y);ctx.fillText(this.level,this.x,this.y);}
}
class Turret extends Defense { constructor(x,y){super(x,y,150,1.2,50,10,assets.turret);} }
class LaserTurret extends Defense { constructor(x,y){super(x,y,250,0.4,120,45,assets.laserTurret);} }

// --- État du jeu ---
let turretTypes = {
    'Turret': { class: Turret, cost: 50, info: { name: 'Tourelle', damage: 10, range: 150, firerate: '1.2/s' } },
    'LaserTurret': { class: LaserTurret, cost: 120, info: { name: 'Laser', damage: 45, range: 250, firerate: '0.4/s' } }
};
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
        selectedObject: null,
        current: 'playing'
    };
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    document.getElementById('ui-container').style.display = 'flex';
    nextWaveBtn.style.display = 'block';
    updateInfoPanel();
}

// --- Logique de jeu ---
function updateUI() { moneySpan.textContent=gameState.playerMoney;waveSpan.textContent=gameState.wave;healthSpan.textContent=Math.max(0,gameState.planet.health); }
function updateInfoPanel() {
    const selection = gameState.selectedObject;
    let info = { name: '-', level: '-', damage: '-', range: '-', firerate: '-', upgradeCost: '-' };
    if (selection) {
        if (typeof selection === 'string') {
            const baseStats = turretTypes[selection].info;
            info = { ...baseStats, level: 1, upgradeCost: turretTypes[selection].cost * 1.5 };
        } else {
            info = { name: selection.constructor.name.replace('Turret', ''), level: selection.level, damage: selection.projectileDamage, range: selection.range, firerate: selection.fireRate+'/s', upgradeCost: `${selection.upgradeCost}$` };
        }
    }
    infoNameSpan.textContent = info.name; infoLevelSpan.textContent = info.level; infoDamageSpan.textContent = info.damage; infoRangeSpan.textContent = info.range; infoFirerateSpan.textContent = info.firerate; infoUpgradeCostSpan.textContent = info.upgradeCost;
}
function startNextWave() { gameState.wave++;gameState.isWaveOngoing=true;gameState.enemiesToSpawn=5+gameState.wave*2; }
function spawnEnemy() { const x=Math.random()*(SCREEN_WIDTH-100)+50;const y=-30;const speed=1+Math.random()*1+gameState.wave*0.2;if(Math.random()<0.2+(gameState.wave*0.02)){gameState.enemies.push(new FastShip(x,y,speed));}else{gameState.enemies.push(new BasicShip(x,y,speed));}}
function handleCollisions() { for(let i=gameState.projectiles.length-1;i>=0;i--){const p=gameState.projectiles[i];for(let j=gameState.enemies.length-1;j>=0;j--){const e=gameState.enemies[j];if(Math.hypot(p.x-e.x,p.y-e.y)<e.width/2){e.health-=p.damage;p.active=false;if(e.health<=0)gameState.playerMoney+=e.value;break;}}}}

function update(currentTime) {
    if (gameState.current !== 'playing') return;
    if (!gameState.isWaveOngoing && gameState.enemies.length === 0) { nextWaveBtn.style.display = 'block'; }
    else if (gameState.isWaveOngoing) { if(gameState.enemiesToSpawn>0&&currentTime-gameState.lastSpawnTime>1000){spawnEnemy();gameState.enemiesToSpawn--;gameState.lastSpawnTime=currentTime;}else if(gameState.enemiesToSpawn===0&&gameState.enemies.length===0){gameState.isWaveOngoing=false;} }
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
window.addEventListener('keydown', (e) => { if (gameState.current === 'start_menu' || gameState.current === 'game_over') { resetGame(); } });
turretChoices.forEach(choice => {
    choice.addEventListener('click', () => { if(gameState.current!=='playing')return;gameState.selectedTurretType=choice.dataset.turret;gameState.selectedObject=gameState.selectedTurretType;turretChoices.forEach(c=>c.classList.remove('active'));choice.classList.add('active');updateInfoPanel(); });
});
nextWaveBtn.addEventListener('click', () => { if(gameState.current==='playing'&&!gameState.isWaveOngoing){startNextWave();nextWaveBtn.style.display='none';} });
canvas.addEventListener('click', (e) => {
    if(gameState.current!=='playing')return;
    const rect=canvas.getBoundingClientRect();const mouseX=e.clientX-rect.left;const mouseY=e.clientY-rect.top;
    let clickedOnDefense=false;
    for(const d of gameState.defenses){
        if(Math.hypot(mouseX-d.x,mouseY-d.y)<d.radius){
            if(e.ctrlKey){if(gameState.playerMoney>=d.upgradeCost){gameState.playerMoney-=d.upgradeCost;d.upgrade();}}
            gameState.selectedObject=d;updateInfoPanel();clickedOnDefense=true;break;
        }
    }
    if(clickedOnDefense)return;
    const cost=turretTypes[gameState.selectedTurretType].cost;
    if(gameState.playerMoney>=cost){
        const dist=Math.hypot(mouseX-gameState.planet.x,mouseY-gameState.planet.y);
        if(dist>gameState.planet.radius-30&&dist<gameState.planet.radius+30){
            const angle=Math.atan2(mouseY-gameState.planet.y,mouseX-gameState.planet.x);
            const px=gameState.planet.x+Math.cos(angle)*(gameState.planet.radius);
            const py=gameState.planet.y+Math.sin(angle)*(gameState.planet.radius);
            const TurretClass=turretTypes[gameState.selectedTurretType].class;
            gameState.defenses.push(new TurretClass(px,py));
            gameState.playerMoney-=cost;gameState.selectedObject=null;updateInfoPanel();
        }
    }
});

// --- Boucle de jeu ---
function gameLoop(currentTime) { update(currentTime); draw(); requestAnimationFrame(gameLoop); }

// Démarrer
gameState.current = 'start_menu';
document.getElementById('ui-container').style.display = 'none';
loadAssets(() => {
    console.log("Assets loaded, ready to play.");
    // The keydown listener will start the game by calling resetGame()
});
