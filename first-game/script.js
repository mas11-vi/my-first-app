const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const overlay = document.querySelector("#overlay");
const eyebrow = document.querySelector("#overlay-eyebrow");
const title = document.querySelector("#overlay-title");
const subtitle = document.querySelector(".overlay-subtitle");
const message = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const controls = new Set();
const enemyTypes = [
  { name: "鬼火", shape: "orb", color: "#d94c3d", accent: "#ffd18a", radius: 15, speed: 1.25, hp: 1, fire: 2.8, shots: 1, spread: 0, bob: 24 },
  { name: "烏天狗", shape: "wing", color: "#66588d", accent: "#d2a9e8", radius: 19, speed: 1.05, hp: 1, fire: 2.1, shots: 1, spread: 0, bob: 48 },
  { name: "鉄扇", shape: "fan", color: "#b58a45", accent: "#f4d994", radius: 18, speed: 0.85, hp: 2, fire: 2.5, shots: 3, spread: 0.22, bob: 16 },
  { name: "影鴉", shape: "arrow", color: "#547f83", accent: "#b5f0d8", radius: 15, speed: 1.65, hp: 1, fire: 2.2, shots: 1, spread: 0, bob: 34 },
  { name: "面影", shape: "mask", color: "#bd5360", accent: "#ffe2b0", radius: 19, speed: 0.95, hp: 1, fire: 1.8, shots: 1, spread: 0, bob: 23 },
  { name: "甲冑蟲", shape: "shell", color: "#71854b", accent: "#dddc8c", radius: 21, speed: 0.7, hp: 2, fire: 2.6, shots: 1, spread: 0, bob: 12 },
  { name: "火車", shape: "wheel", color: "#d07837", accent: "#ffe2a1", radius: 18, speed: 1.1, hp: 1, fire: 1.6, shots: 3, spread: 0.28, bob: 40 },
  { name: "狐火", shape: "diamond", color: "#cb6a9a", accent: "#ffe0db", radius: 16, speed: 1.35, hp: 1, fire: 2.1, shots: 1, spread: 0, bob: 58 },
  { name: "夜叉", shape: "horn", color: "#a24946", accent: "#ffd299", radius: 20, speed: 1.0, hp: 2, fire: 1.9, shots: 1, spread: 0, bob: 28 },
  { name: "骸舟", shape: "boat", color: "#63748a", accent: "#e2cfaa", radius: 22, speed: 0.78, hp: 2, fire: 2.2, shots: 3, spread: 0.19, bob: 18 },
];
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
let enemyBullets;
let enemies;
let boss;
let score;
let lives;
let elapsed;
let spawnTimer;
let shotTimer;
let hitTimer;
let enemySequence;
let previousTime = 0;

function resetGame() {
  player = { x: 125, y: HEIGHT / 2, radius: 17, speed: 290 };
  bullets = [];
  enemyBullets = [];
  enemies = [];
  boss = null;
  score = 0;
  lives = 3;
  elapsed = 0;
  spawnTimer = 0.6;
  shotTimer = 0;
  hitTimer = 0;
  enemySequence = 0;
  updateHud();
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(6, "0");
  livesElement.textContent = `${"◆ ".repeat(lives).trim()}${lives === 0 ? "—" : ""}`;
}

function startGame() {
  resetGame();
  state = "playing";
  eyebrow.textContent = "幕ノ壱　—　戦闘開始";
  title.textContent = "月影";
  subtitle.textContent = "TSUKIKAGE ／ MOONLIT ASSAULT";
  message.textContent = "迫りくる鬼火を斬り払い、夜明けまで生き残れ。";
  startButton.textContent = "ゲーム開始　→";
  overlay.classList.add("is-hidden");
  keys.clear();
  controls.clear();
}

function endGame() {
  state = "over";
  eyebrow.textContent = "終幕　—　戦いは続く";
  title.textContent = "終幕";
  subtitle.textContent = "MISSION FAILED ／ RETRY";
  message.textContent = `討伐記録　${String(score).padStart(6, "0")} 点　—　再び夜へ。`;
  startButton.textContent = "再び出陣する　→";
  overlay.classList.remove("is-hidden");
}

function winGame() {
  state = "over";
  eyebrow.textContent = "大将討伐　—　夜明け";
  title.textContent = "討伐";
  subtitle.textContent = "BOSS DEFEATED ／ DAWN";
  message.textContent = `羅刹を討伐した。最終記録　${String(score).padStart(6, "0")} 点。`;
  startButton.textContent = "再び出陣する　→";
  overlay.classList.remove("is-hidden");
}

function isDown(...names) {
  return names.some((name) => keys.has(name) || controls.has(name));
}

function spawnEnemy() {
  const typeId = enemySequence % enemyTypes.length;
  const type = enemyTypes[typeId];
  enemySequence += 1;
  enemies.push({
    typeId,
    type,
    x: WIDTH + type.radius,
    y: 52 + Math.random() * (HEIGHT - 104),
    baseY: 0,
    radius: type.radius,
    hp: type.hp,
    speed: (115 + Math.min(elapsed * 2.5, 90) + Math.random() * 30) * type.speed,
    phase: Math.random() * Math.PI * 2,
    shotTimer: 0.75 + Math.random() * type.fire,
  });
  const enemy = enemies[enemies.length - 1];
  enemy.baseY = enemy.y;
}

function fireEnemyBullet(enemy) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const bulletSpeed = 175 + enemy.typeId % 3 * 25;
  for (let i = 0; i < enemy.type.shots; i += 1) {
    const offset = (i - (enemy.type.shots - 1) / 2) * enemy.type.spread;
    const shotAngle = angle + offset;
    enemyBullets.push({
      x: enemy.x - enemy.radius * 0.65,
      y: enemy.y,
      vx: Math.cos(shotAngle) * bulletSpeed,
      vy: Math.sin(shotAngle) * bulletSpeed,
      radius: 5,
    });
  }
}

function fireBossBullets() {
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  const spread = 0.17;
  for (let i = -2; i <= 2; i += 1) {
    const shotAngle = angle + spread * i;
    const speed = 205;
    enemyBullets.push({
      x: boss.x - 48,
      y: boss.y,
      vx: Math.cos(shotAngle) * speed,
      vy: Math.sin(shotAngle) * speed,
      radius: 6,
    });
  }
}

function spawnBoss() {
  boss = {
    x: WIDTH + 75,
    y: HEIGHT / 2,
    hp: 30,
    maxHp: 30,
    shotTimer: 1.4,
    phase: Math.random() * Math.PI * 2,
  };
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

  if (!boss && score < 1000 && spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.48, 1.12 - elapsed * 0.006) + Math.random() * 0.3;
  }

  for (const bullet of bullets) bullet.x += bullet.speed * delta;
  bullets = bullets.filter((bullet) => bullet.x < WIDTH + 12);

  for (const enemy of enemies) {
    enemy.x -= enemy.speed * delta;
    if (enemy.typeId === 8) {
      enemy.baseY += Math.sign(player.y - enemy.baseY) * Math.min(Math.abs(player.y - enemy.baseY), 38 * delta);
    }
    enemy.y = enemy.baseY + Math.sin(elapsed * (2.4 + enemy.typeId % 4 * 0.45) + enemy.phase) * enemy.type.bob;
    enemy.shotTimer -= delta;
    if (enemy.shotTimer <= 0 && enemy.x < WIDTH - 45) {
      fireEnemyBullet(enemy);
      enemy.shotTimer = enemy.type.fire + Math.random() * 0.7;
    }
  }
  enemies = enemies.filter((enemy) => enemy.x > -enemy.radius - 10);

  if (!boss && score >= 1000) spawnBoss();
  if (boss) {
    boss.x = Math.max(WIDTH - 165, boss.x - 190 * delta);
    boss.y = HEIGHT / 2 + Math.sin(elapsed * 1.15 + boss.phase) * 105;
    boss.shotTimer -= delta;
    if (boss.shotTimer <= 0 && boss.x <= WIDTH - 165) {
      fireBossBullets();
      boss.shotTimer = 1.45;
    }
  }

  for (const bullet of enemyBullets) {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
  }
  enemyBullets = enemyBullets.filter((bullet) =>
    bullet.x > -16 && bullet.x < WIDTH + 16 && bullet.y > -16 && bullet.y < HEIGHT + 16
  );

  if (hitTimer <= 0) {
    const bulletIndex = enemyBullets.findIndex((bullet) =>
      Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius
    );
    if (bulletIndex !== -1) {
      enemyBullets.splice(bulletIndex, 1);
      lives -= 1;
      hitTimer = 1.2;
      updateHud();
      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const bulletIndex = bullets.findIndex((bullet) =>
      Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 5
    );
    if (bulletIndex !== -1) {
      bullets.splice(bulletIndex, 1);
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        enemies.splice(i, 1);
        score += 100;
        updateHud();
      }
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

  if (boss) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      if (Math.hypot(bullet.x - boss.x, bullet.y - boss.y) < 62) {
        bullets.splice(i, 1);
        boss.hp -= 1;
        if (boss.hp <= 0) {
          score += 1000;
          updateHud();
          enemyBullets = [];
          winGame();
          return;
        }
      }
    }

    if (hitTimer <= 0 && Math.hypot(player.x - boss.x, player.y - boss.y) < player.radius + 52) {
      lives -= 1;
      hitTimer = 1.2;
      updateHud();
      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }
}

function drawBackground(delta) {
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#171323");
  background.addColorStop(0.52, "#211521");
  background.addColorStop(1, "#101522");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const moonGlow = ctx.createRadialGradient(700, 230, 12, 700, 230, 220);
  moonGlow.addColorStop(0, "rgba(232, 190, 137, 0.23)");
  moonGlow.addColorStop(1, "rgba(232, 190, 137, 0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(460, 0, 480, 470);
  ctx.fillStyle = "rgba(227, 183, 132, 0.14)";
  ctx.beginPath();
  ctx.arc(700, 230, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(235, 200, 154, 0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(700, 230, 118, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(11, 15, 27, 0.52)";
  ctx.beginPath();
  ctx.moveTo(0, 408);
  ctx.lineTo(105, 337);
  ctx.lineTo(195, 400);
  ctx.lineTo(326, 318);
  ctx.lineTo(453, 399);
  ctx.lineTo(572, 346);
  ctx.lineTo(728, 411);
  ctx.lineTo(842, 338);
  ctx.lineTo(960, 397);
  ctx.lineTo(960, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(8, 13, 24, 0.58)";
  ctx.beginPath();
  ctx.moveTo(0, 456);
  ctx.lineTo(132, 389);
  ctx.lineTo(263, 448);
  ctx.lineTo(390, 375);
  ctx.lineTo(532, 450);
  ctx.lineTo(675, 389);
  ctx.lineTo(807, 451);
  ctx.lineTo(920, 390);
  ctx.lineTo(960, 412);
  ctx.lineTo(960, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#d94c3d";
  ctx.lineWidth = 8;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(778, 405);
  ctx.lineTo(778, 333);
  ctx.moveTo(842, 405);
  ctx.lineTo(842, 333);
  ctx.moveTo(763, 337);
  ctx.lineTo(857, 337);
  ctx.moveTo(769, 325);
  ctx.lineTo(851, 325);
  ctx.moveTo(770, 325);
  ctx.lineTo(760, 318);
  ctx.moveTo(850, 325);
  ctx.lineTo(860, 318);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(218, 181, 139, 0.10)";
  ctx.lineWidth = 1;
  for (let y = 459; y < HEIGHT; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(180, y - 17, 290, y + 17, 470, y);
    ctx.bezierCurveTo(650, y - 17, 780, y + 17, WIDTH, y);
    ctx.stroke();
  }

  for (const star of stars) {
    star.x -= star.speed * delta;
    if (star.x < 0) {
      star.x = WIDTH;
      star.y = Math.random() * HEIGHT;
    }
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#f3dfc0";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (state === "playing" && hitTimer > 0 && Math.floor(hitTimer * 12) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = "#f2d19a";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#e7c38e";
  ctx.beginPath();
  ctx.moveTo(27, 0);
  ctx.lineTo(-9, -17);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-19, -11);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-19, 11);
  ctx.lineTo(-5, 7);
  ctx.lineTo(-9, 17);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7eee0";
  ctx.beginPath();
  ctx.ellipse(3, 0, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d94c3d";
  ctx.beginPath();
  ctx.moveTo(-18, -4);
  ctx.lineTo(-31 - Math.random() * 9, 0);
  ctx.lineTo(-18, 4);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowColor = enemy.type.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = enemy.type.color;
  const r = enemy.radius;
  ctx.beginPath();
  switch (enemy.type.shape) {
    case "orb":
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      break;
    case "wing":
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.2, -r);
      ctx.lineTo(-r * 0.5, -r * 0.25);
      ctx.lineTo(-r, -r * 0.7);
      ctx.lineTo(-r * 0.65, 0);
      ctx.lineTo(-r, r * 0.7);
      ctx.lineTo(-r * 0.5, r * 0.25);
      ctx.lineTo(-r * 0.2, r);
      ctx.closePath();
      break;
    case "fan":
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.45, -r);
      ctx.lineTo(-r * 0.2, -r * 0.35);
      ctx.lineTo(-r * 0.7, -r * 0.78);
      ctx.lineTo(-r * 0.52, -r * 0.2);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.52, r * 0.2);
      ctx.lineTo(-r * 0.7, r * 0.78);
      ctx.lineTo(-r * 0.2, r * 0.35);
      ctx.lineTo(-r * 0.45, r);
      ctx.closePath();
      break;
    case "arrow":
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.8, -r * 0.72);
      ctx.lineTo(-r * 0.48, 0);
      ctx.lineTo(-r * 0.8, r * 0.72);
      ctx.closePath();
      break;
    case "mask":
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 0.35, -r * 0.82);
      ctx.lineTo(-r * 0.65, -r * 0.9);
      ctx.lineTo(-r, -r * 0.45);
      ctx.lineTo(-r * 0.78, r * 0.55);
      ctx.lineTo(-r * 0.2, r);
      ctx.lineTo(r * 0.58, r * 0.62);
      ctx.closePath();
      break;
    case "shell":
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 0.3, -r * 0.7);
      ctx.lineTo(-r * 0.35, -r);
      ctx.lineTo(-r, -r * 0.5);
      ctx.lineTo(-r * 0.78, 0);
      ctx.lineTo(-r, r * 0.5);
      ctx.lineTo(-r * 0.35, r);
      ctx.lineTo(r * 0.3, r * 0.7);
      ctx.closePath();
      break;
    case "wheel":
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      break;
    case "diamond":
      ctx.moveTo(r, 0);
      ctx.lineTo(0, -r);
      ctx.lineTo(-r, 0);
      ctx.lineTo(0, r);
      ctx.closePath();
      break;
    case "horn":
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.25, -r * 0.5);
      ctx.lineTo(-r, -r);
      ctx.lineTo(-r * 0.65, -r * 0.15);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.65, r * 0.15);
      ctx.lineTo(-r, r);
      ctx.lineTo(-r * 0.25, r * 0.5);
      ctx.closePath();
      break;
    case "boat":
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.35, -r * 0.8);
      ctx.lineTo(-r, -r * 0.58);
      ctx.lineTo(-r * 0.68, 0);
      ctx.lineTo(-r, r * 0.58);
      ctx.lineTo(-r * 0.35, r * 0.8);
      ctx.closePath();
      break;
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = enemy.type.accent;
  ctx.fillRect(-r * 0.35, -r * 0.14, Math.max(2, r * 0.2), Math.max(2, r * 0.16));
  ctx.fillRect(r * 0.03, -r * 0.14, Math.max(2, r * 0.2), Math.max(2, r * 0.16));
  ctx.strokeStyle = enemy.type.accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.3);
  ctx.lineTo(0, r * 0.4);
  ctx.lineTo(r * 0.2, r * 0.3);
  ctx.stroke();
  if (enemy.type.hp > 1 && enemy.hp === 1) {
    ctx.strokeStyle = "rgba(255, 238, 205, 0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoss() {
  if (!boss) return;
  const r = 55;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.shadowColor = "#ef594a";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#762f42";
  ctx.beginPath();
  ctx.moveTo(r * 1.05, 0);
  ctx.lineTo(r * 0.52, -r * 0.62);
  ctx.lineTo(r * 0.25, -r * 0.95);
  ctx.lineTo(r * 0.05, -r * 0.52);
  ctx.lineTo(-r * 0.5, -r * 0.82);
  ctx.lineTo(-r * 0.75, -r * 0.42);
  ctx.lineTo(-r, 0);
  ctx.lineTo(-r * 0.75, r * 0.42);
  ctx.lineTo(-r * 0.5, r * 0.82);
  ctx.lineTo(r * 0.05, r * 0.52);
  ctx.lineTo(r * 0.25, r * 0.95);
  ctx.lineTo(r * 0.52, r * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#d7ae70";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.43);
  ctx.lineTo(-r * 0.82, -r * 1.2);
  ctx.lineTo(-r * 0.12, -r * 0.72);
  ctx.moveTo(-r * 0.55, r * 0.43);
  ctx.lineTo(-r * 0.82, r * 1.2);
  ctx.lineTo(-r * 0.12, r * 0.72);
  ctx.stroke();
  ctx.fillStyle = "#f6c980";
  ctx.fillRect(-r * 0.48, -r * 0.18, r * 0.18, r * 0.11);
  ctx.fillRect(-r * 0.48, r * 0.07, r * 0.18, r * 0.11);
  ctx.fillStyle = "#d94c3d";
  ctx.beginPath();
  ctx.arc(-r * 0.58, 0, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const barWidth = 320;
  const barX = (WIDTH - barWidth) / 2;
  const barY = HEIGHT - 26;
  ctx.fillStyle = "rgba(16, 13, 27, 0.85)";
  ctx.fillRect(barX - 10, barY - 27, barWidth + 20, 40);
  ctx.fillStyle = "#e6d4ba";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("大将・羅刹", barX, barY - 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(barX, barY, barWidth, 7);
  ctx.fillStyle = "#d94c3d";
  ctx.fillRect(barX, barY, barWidth * Math.max(0, boss.hp / boss.maxHp), 7);
}

function draw() {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000 || 0, 0.04);
  previousTime = now;
  drawBackground(delta);
  update(delta);

  for (const bullet of bullets || []) {
    ctx.shadowColor = "#f3d28f";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#f3d28f";
    ctx.fillRect(bullet.x, bullet.y - 2, 13, 4);
  }
  ctx.shadowBlur = 0;
  for (const bullet of enemyBullets || []) {
    ctx.shadowColor = "#ff694f";
    ctx.shadowBlur = 13;
    ctx.fillStyle = "#ff694f";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffe2a1";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const enemy of enemies || []) drawEnemy(enemy);
  drawBoss();
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
