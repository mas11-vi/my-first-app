const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const overlay = document.querySelector("#overlay");
const eyebrow = document.querySelector("#overlay-eyebrow");
const title = document.querySelector("#overlay-title");
const message = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const controls = new Set();
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
  size: Math.random() * 1.8 + 0.4,
  speed: Math.random() * 42 + 18,
  alpha: Math.random() * 0.65 + 0.2,
}));

let state = "ready";
let player;
let bullets;
let enemies;
let score;
let lives;
let elapsed;
let spawnTimer;
let shotTimer;
let hitTimer;
let previousTime = 0;

function resetGame() {
  player = { x: 125, y: HEIGHT / 2, radius: 17, speed: 290 };
  bullets = [];
  enemies = [];
  score = 0;
  lives = 3;
  elapsed = 0;
  spawnTimer = 0.6;
  shotTimer = 0;
  hitTimer = 0;
  updateHud();
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(6, "0");
  livesElement.textContent = `${"♥ ".repeat(lives).trim()}${lives === 0 ? "—" : ""}`;
}

function startGame() {
  resetGame();
  state = "playing";
  overlay.classList.add("is-hidden");
  keys.clear();
  controls.clear();
}

function endGame() {
  state = "over";
  eyebrow.textContent = "MISSION COMPLETE";
  title.textContent = "GAME OVER";
  message.textContent = `スコア ${String(score).padStart(6, "0")}　—　もう一度挑戦しよう。`;
  startButton.textContent = "もう一度プレイ";
  overlay.classList.remove("is-hidden");
}

function isDown(...names) {
  return names.some((name) => keys.has(name) || controls.has(name));
}

function spawnEnemy() {
  const radius = 16 + Math.random() * 8;
  enemies.push({
    x: WIDTH + radius,
    y: 52 + Math.random() * (HEIGHT - 104),
    radius,
    speed: 125 + Math.min(elapsed * 2.8, 105) + Math.random() * 40,
    phase: Math.random() * Math.PI * 2,
  });
}

function update(delta) {
  if (state !== "playing") return;

  elapsed += delta;
  shotTimer -= delta;
  hitTimer = Math.max(0, hitTimer - delta);
  spawnTimer -= delta;

  let moveX = Number(isDown("ArrowRight", "d", "right")) - Number(isDown("ArrowLeft", "a", "left"));
  let moveY = Number(isDown("ArrowDown", "s", "down")) - Number(isDown("ArrowUp", "w", "up"));
  const length = Math.hypot(moveX, moveY) || 1;
  moveX /= length;
  moveY /= length;
  player.x = Math.max(28, Math.min(WIDTH - 35, player.x + moveX * player.speed * delta));
  player.y = Math.max(35, Math.min(HEIGHT - 35, player.y + moveY * player.speed * delta));

  if (isDown(" ", "fire") && shotTimer <= 0) {
    bullets.push({ x: player.x + 23, y: player.y, speed: 520 });
    shotTimer = 0.2;
  }

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.48, 1.12 - elapsed * 0.006) + Math.random() * 0.3;
  }

  for (const bullet of bullets) bullet.x += bullet.speed * delta;
  bullets = bullets.filter((bullet) => bullet.x < WIDTH + 12);

  for (const enemy of enemies) {
    enemy.x -= enemy.speed * delta;
    enemy.y += Math.sin(elapsed * 3 + enemy.phase) * 26 * delta;
  }
  enemies = enemies.filter((enemy) => enemy.x > -enemy.radius - 10);

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const bulletIndex = bullets.findIndex((bullet) =>
      Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 5
    );
    if (bulletIndex !== -1) {
      bullets.splice(bulletIndex, 1);
      enemies.splice(i, 1);
      score += 100;
      updateHud();
      continue;
    }

    if (hitTimer <= 0 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius * 0.72) {
      enemies.splice(i, 1);
      lives -= 1;
      hitTimer = 1.2;
      updateHud();
      if (lives <= 0) {
        endGame();
        break;
      }
    }
  }
}

function drawBackground(delta) {
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#101a35");
  background.addColorStop(0.55, "#0a1228");
  background.addColorStop(1, "#15112d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(126, 153, 205, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  for (const star of stars) {
    star.x -= star.speed * delta;
    if (star.x < 0) {
      star.x = WIDTH;
      star.y = Math.random() * HEIGHT;
    }
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d9f8ff";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (state === "playing" && hitTimer > 0 && Math.floor(hitTimer * 12) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = "#63f5e5";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#63f5e5";
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.lineTo(-15, -16);
  ctx.lineTo(-9, -5);
  ctx.lineTo(-19, 0);
  ctx.lineTo(-9, 5);
  ctx.lineTo(-15, 16);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#eaffff";
  ctx.beginPath();
  ctx.ellipse(1, 0, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff9d66";
  ctx.beginPath();
  ctx.moveTo(-15, -5);
  ctx.lineTo(-25 - Math.random() * 8, 0);
  ctx.lineTo(-15, 5);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowColor = "#ff597e";
  ctx.shadowBlur = 17;
  ctx.fillStyle = "#f74f76";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius, 0);
  ctx.lineTo(-enemy.radius * 0.45, -enemy.radius * 0.62);
  ctx.lineTo(enemy.radius * 0.7, -enemy.radius * 0.9);
  ctx.lineTo(enemy.radius, 0);
  ctx.lineTo(enemy.radius * 0.7, enemy.radius * 0.9);
  ctx.lineTo(-enemy.radius * 0.45, enemy.radius * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffd4dc";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

function draw() {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000 || 0, 0.04);
  previousTime = now;
  drawBackground(delta);
  update(delta);

  for (const bullet of bullets || []) {
    ctx.shadowColor = "#fff293";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#fff293";
    ctx.fillRect(bullet.x, bullet.y - 2, 13, 4);
  }
  ctx.shadowBlur = 0;
  for (const enemy of enemies || []) drawEnemy(enemy);
  if (player) drawPlayer();
  requestAnimationFrame(draw);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key.startsWith("Arrow") || key === " " || ["w", "a", "s", "d"].includes(key)) event.preventDefault();
  if (key === " " && state !== "playing") {
    startGame();
    return;
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

window.addEventListener("blur", () => {
  keys.clear();
  controls.clear();
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (state !== "playing") startGame();
    controls.add(control);
    button.classList.add("is-pressed");
  });
  const release = () => {
    controls.delete(control);
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

startButton.addEventListener("click", startGame);
resetGame();
requestAnimationFrame(draw);
