const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiLayer = document.getElementById('ui-layer');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game state
let isPlaying = false;
let isGameOver = false;
let lastTime = 0;
let score = 0;

// Internal resolution
const GAME_WIDTH = 480;
const GAME_HEIGHT = 800;

// Obstacles
let obstacles = [];
let gameSpeed = 3.5;
let obstacleSpawnTimer = 0;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_GAP = 180;
const SPAWN_RATE = 1500; // ms

// Resize canvas to match internal resolution
function resizeCanvas() {
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Player Object
const player = {
    x: GAME_WIDTH * 0.2, // 20% from left
    y: GAME_HEIGHT / 2,
    radius: 14, // Visual radius
    hitboxRadius: 8, // Smaller for leniency!
    velocity: 0,
    gravity: 0.25,
    jumpStrength: -6.5,
    maxVelocity: 8,
    color: '#00ffff',
    rotation: 0
};

function resetGame() {
    player.y = GAME_HEIGHT / 2;
    player.velocity = 0;
    player.rotation = 0;
    score = 0;
    scoreEl.innerText = score;
    isGameOver = false;
    obstacles = [];
    obstacleSpawnTimer = 0;
}

function spawnObstacle() {
    const minHeight = 50;
    const maxHeight = GAME_HEIGHT - OBSTACLE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    obstacles.push({
        x: GAME_WIDTH,
        topHeight: topHeight,
        bottomY: topHeight + OBSTACLE_GAP,
        passed: false,
        width: OBSTACLE_WIDTH
    });
}

function circleRectCollide(circle, rx, ry, rw, rh) {
    let testX = circle.x;
    let testY = circle.y;

    if (circle.x < rx) testX = rx;
    else if (circle.x > rx + rw) testX = rx + rw;

    if (circle.y < ry) testY = ry;
    else if (circle.y > ry + rh) testY = ry + rh;

    let distX = circle.x - testX;
    let distY = circle.y - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));

    return distance <= circle.hitboxRadius;
}

function jump() {
    if (!isPlaying && !isGameOver) return; // Menu state
    if (isGameOver) return; // Prevent jump after death

    player.velocity = player.jumpStrength;
    // Add audio cue here later
}

function update(deltaTime) {
    if (!isPlaying || isGameOver) return;

    // Physics
    player.velocity += player.gravity;
    if (player.velocity > player.maxVelocity) {
        player.velocity = player.maxVelocity;
    }
    player.y += player.velocity;

    // Rotation based on velocity
    player.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (player.velocity * 0.1)));

    // Floor and Ceiling Collision
    if (player.y + player.hitboxRadius >= GAME_HEIGHT) {
        player.y = GAME_HEIGHT - player.hitboxRadius;
        triggerGameOver();
    } else if (player.y - player.hitboxRadius <= 0) {
        player.y = player.hitboxRadius;
        player.velocity = 0; 
    }

    // Obstacle logic
    obstacleSpawnTimer += deltaTime;
    if (obstacleSpawnTimer > SPAWN_RATE) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed * (deltaTime / 16.66); // Normalize speed to 60fps

        let hitTop = circleRectCollide(player, obs.x, 0, obs.width, obs.topHeight);
        let hitBottom = circleRectCollide(player, obs.x, obs.bottomY, obs.width, GAME_HEIGHT - obs.bottomY);
        
        if (hitTop || hitBottom) {
            triggerGameOver();
        }

        if (!obs.passed && player.x > obs.x + obs.width) {
            score++;
            scoreEl.innerText = score;
            obs.passed = true;
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a14'; // Background matching CSS
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (!isPlaying) {
        // Draw decorative elements for menu if we want to add later
        return;
    }

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
    
    // Draw visual core for the hitbox 
    ctx.beginPath();
    ctx.arc(0, 0, player.hitboxRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.closePath();

    ctx.restore();

    // Draw obstacles
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    
    for (let obs of obstacles) {
        // Draw top body
        ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
        ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
        // Draw bottom body
        ctx.fillRect(obs.x, obs.bottomY, obs.width, GAME_HEIGHT - obs.bottomY);
        
        // Draw crisp borders
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(obs.x, 0, 2, obs.topHeight);
        ctx.fillRect(obs.x + obs.width - 2, 0, 2, obs.topHeight);
        ctx.fillRect(obs.x, obs.topHeight - 2, obs.width, 2); // cap

        ctx.fillRect(obs.x, obs.bottomY, 2, GAME_HEIGHT - obs.bottomY);
        ctx.fillRect(obs.x + obs.width - 2, obs.bottomY, 2, GAME_HEIGHT - obs.bottomY);
        ctx.fillRect(obs.x, obs.bottomY, obs.width, 2); // cap
        
        // Inner accents for neon look
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obs.x + 6, 0, 2, obs.topHeight - 6);
        ctx.fillRect(obs.x + 6, obs.bottomY + 6, 2, GAME_HEIGHT - obs.bottomY - 6);
    }
    ctx.restore();
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    isGameOver = true;
    isPlaying = false;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

// Input Handling
function handleInput(e) {
    // Don't trigger on button clicks (handled separately)
    if (e.target.tagName === 'BUTTON') return;

    if (e.type === 'keydown' && e.code !== 'Space') return;
    
    if (isPlaying && !isGameOver) {
        jump();
        e.preventDefault(); // Prevent scrolling on space
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});

// UI Event Listeners
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    isPlaying = true;
    lastTime = performance.now();
    jump(); // Initial jump
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    resetGame();
    isPlaying = true;
    lastTime = performance.now();
    jump(); // Initial jump
});

// Kick off loop
requestAnimationFrame(gameLoop);
