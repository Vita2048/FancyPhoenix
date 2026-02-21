const GameState = {
    START: 0,
    PLAYING: 1,
    TRANSIION: 2,
    GAMEOVER: 3,
    WIN: 4
};

let currentState = GameState.START;
let level = 1;
let score = 0;
let shakeAmount = 0;

let stars = [];
let particles = [];
let enemies = [];
let bullets = [];
let enemyBullets = [];
let player;
let keys = {};
let transitionTimer = 0;

let playerImg, bird1Img, bird2Img, mothershipImg;

function preload() {
    playerImg = loadImage('player.png');
    bird1Img = loadImage('bird1.png');
    bird2Img = loadImage('bird2.png');
    mothershipImg = loadImage('mothership.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noCursor();
    for (let i = 0; i < 150; i++) {
        stars.push(new Star());
    }
    player = new Player();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    player.y = height - 50;
}

function draw() {
    background(5, 5, 20); // Dark space blue

    // Parallax background
    for (let s of stars) {
        s.update();
        s.draw();
    }

    // Screen shake
    if (shakeAmount > 0) {
        translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
        shakeAmount *= 0.9;
        if (shakeAmount < 0.5) shakeAmount = 0;
    }

    if (currentState === GameState.START) {
        drawStartScreen();
    } else if (currentState === GameState.PLAYING) {
        updateGame();
        drawGame();
    } else if (currentState === GameState.TRANSIION) {
        drawTransition();
    } else if (currentState === GameState.GAMEOVER) {
        updateGame(); // keep simulating for explosions but not player inputs
        drawGame();
        drawGameOver();
    } else if (currentState === GameState.WIN) {
        drawWin();
    }

    // Custom cursor
    if (currentState !== GameState.PLAYING) {
        fill(255);
        noStroke();
        circle(mouseX, mouseY, 8);
    }
}

function drawGame() {
    player.draw();
    for (let b of bullets) b.draw();
    for (let eb of enemyBullets) eb.draw();
    for (let e of enemies) e.draw();
    for (let p of particles) p.draw();

    drawUI();
}

function updateGame() {
    if (currentState === GameState.PLAYING) {
        player.update();

        // Spawn formations handled in progression logic now
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].isOffscreen()) {
            bullets.splice(i, 1);
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].update();
        if (enemyBullets[i].isOffscreen()) {
            enemyBullets.splice(i, 1);
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].isDead) { // Can be marked dead by bounds
            enemies.splice(i, 1);
        }
    }

    checkCollisions();

    if (currentState === GameState.PLAYING && enemies.length === 0) {
        if (level >= 3) { // fixed to be >= 3 instead of === 3
            currentState = GameState.WIN;
        } else {
            currentState = GameState.TRANSIION;
            transitionTimer = 180; // 3 seconds at 60fps
            // level will be incremented in drawTransition once timer completes
        }
    }
}

function checkCollisions() {
    // Player bullets hit enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let hit = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            if (e.collidesWith(b)) {
                e.takeDamage(10);
                createExplosion(b.x, b.y, color(255, 200, 50), 10);
                bullets.splice(i, 1);
                hit = true;

                if (e.hp <= 0) {
                    score += e.scoreValue;
                    createExplosion(e.x, e.y, e.color, 30);
                    shakeAmount = 5;
                    enemies.splice(j, 1);
                }
                break;
            }
        }

        if (!hit && level === 3 && enemies[0] && enemies[0].isMothership) {
            let ms = enemies[0];
            // Check shield collision for mothership
            if (ms.collidesWithShield(b)) {
                createExplosion(b.x, b.y, color(0, 255, 255), 5); // Hit shield spark
                bullets.splice(i, 1);
            }
        }
    }

    // Enemy bullets or body hit player
    if (currentState === GameState.PLAYING && !player.shieldActive && !player.invulnerable) {
        let playerHit = false;

        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let eb = enemyBullets[i];
            if (player.collidesWith(eb)) {
                playerHit = true;
                enemyBullets.splice(i, 1);
                break;
            }
        }

        if (!playerHit) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (player.collidesWith(e)) {
                    playerHit = true;
                    // Also destroy the bird that rammed into the player
                    e.takeDamage(100);
                    if (e.hp <= 0) enemies.splice(i, 1);
                    break;
                }
            }
        }

        if (playerHit) {
            player.hp--;
            createExplosion(player.x, player.y, color(255, 100, 100), 30);
            shakeAmount = 15;

            if (player.hp <= 0) {
                playerDeath();
            } else {
                // Give player brief invulnerability after being hit
                player.invulnerable = true;
                player.invulnerableTimer = 90; // 1.5 seconds of i-frames
            }
        }
    }
}

function playerDeath() {
    createExplosion(player.x, player.y, color(0, 200, 255), 50);
    shakeAmount = 20;
    currentState = GameState.GAMEOVER;
}

function drawUI() {
    // Draw Score
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = color(0, 255, 255).toString();
    fill(0, 255, 255);
    noStroke();
    textSize(24);
    textAlign(LEFT, TOP);
    text(`SCORE: ${score}`, 20, 20);
    text(`LEVEL: ${level}`, 20, 50);

    // Draw Lives
    text(`LIVES: `, 20, 80);
    for (let i = 0; i < player.hp; i++) {
        fill(255, 50, 50);
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = color(255, 50, 50).toString();
        // offset origin to 100 instead of 70 to clear the longer text
        triangle(100 + i * 25, 80 + 10, 100 + i * 25 + 15, 80, 100 + i * 25 + 15, 80 + 20);
    }

    // Draw Shield UI
    let shieldWidth = 200;
    let shieldHeight = 15;
    let cx = width / 2 - shieldWidth / 2;
    let cy = 20;
    fill(50, 50, 50);
    drawingContext.shadowBlur = 0;
    rect(cx, cy, shieldWidth, shieldHeight, 5);

    let w = 0;
    if (player.shieldCooldownTimer > 0) {
        fill(255, 100, 100);
        w = ((player.shieldCooldown - player.shieldCooldownTimer) / player.shieldCooldown) * shieldWidth;
    } else if (player.shieldActive) {
        fill(100, 255, 100);
        w = (player.shieldTimer / player.shieldDuration) * shieldWidth;
    } else {
        fill(100, 255, 100);
        w = shieldWidth;
    }
    rect(cx, cy, w, shieldHeight, 5);
    textSize(14);
    textAlign(CENTER, TOP);
    fill(255);
    text("ENERGY SHIELD (SHIFT)", width / 2, cy + 20);
}

function drawStartScreen() {
    textAlign(CENTER, CENTER);
    drawingContext.shadowBlur = 20;

    drawingContext.shadowColor = color(255, 0, 255).toString();
    fill(255, 0, 255);
    textSize(80);
    text("NEON PHOENIX", width / 2, height / 2 - 80);

    drawingContext.shadowColor = color(0, 255, 255).toString();
    fill(0, 255, 255);
    textSize(24);
    if (frameCount % 60 < 30) {
        text("PRESS SPACE TO START", width / 2, height / 2 + 50);
    }

    drawingContext.shadowBlur = 0;
    fill(200);
    textSize(18);
    text("Arrow Keys: Move | Space: Shoot | Shift: Shield", width / 2, height / 2 + 120);
}

function drawTransition() {
    drawGame(); // keep drawing
    background(0, 0, 0, 150); // fade darken

    textAlign(CENTER, CENTER);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = color(0, 255, 255).toString();
    fill(0, 255, 255);
    textSize(60);
    text(`LEVEL ${level} COMPLETE`, width / 2, height / 2 - 40);
    textSize(30);
    text(`GET READY FOR LEVEL ${level + 1}...`, width / 2, height / 2 + 40);

    transitionTimer--;
    if (transitionTimer <= 0) {
        currentState = GameState.PLAYING;
        level++;
        startLevel(level);
    }
}

function drawGameOver() {
    background(0, 0, 0, 150);
    textAlign(CENTER, CENTER);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = color(255, 50, 50).toString();
    fill(255, 50, 50);
    textSize(80);
    text("GAME OVER", width / 2, height / 2 - 50);

    textSize(30);
    fill(255);
    drawingContext.shadowColor = color(255).toString();
    text(`FINAL SCORE: ${score}`, width / 2, height / 2 + 30);

    textSize(20);
    if (frameCount % 60 < 30) {
        text("PRESS ENTER TO RESTART", width / 2, height / 2 + 100);
    }
}

function drawWin() {
    drawGame();
    background(0, 0, 0, 150);
    textAlign(CENTER, CENTER);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = color(255, 215, 0).toString();
    fill(255, 215, 0);
    textSize(80);
    text("YOU SAVED THE GALAXY", width / 2, height / 2 - 50);

    textSize(30);
    fill(255);
    text(`FINAL SCORE: ${score}`, width / 2, height / 2 + 30);

    textSize(20);
    if (frameCount % 60 < 30) {
        text("PRESS ENTER TO PLAY AGAIN", width / 2, height / 2 + 100);
    }
}

function startLevel(l) {
    enemies = [];
    enemyBullets = [];
    bullets = [];

    if (l === 1 || l === 2) {
        // Formation of birds
        let rows = l === 1 ? 3 : 4;
        let cols = 8;
        let spacingX = Math.min(80, width / (cols + 1));
        let spacingY = 60;
        let startX = width / 2 - (cols * spacingX) / 2 + spacingX / 2;
        let startY = 100;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                enemies.push(new Bird(startX + c * spacingX, startY + r * spacingY, l));
            }
        }
    } else if (l === 3) {
        enemies.push(new Mothership(width / 2, 150));
    }
}

function keyPressed() {
    keys[keyCode] = true;

    if (currentState === GameState.START && key === ' ') {
        currentState = GameState.PLAYING;
        score = 0;
        level = 1;
        player = new Player();
        startLevel(level);
    }

    if (currentState === GameState.GAMEOVER || currentState === GameState.WIN) {
        if (keyCode === ENTER) {
            currentState = GameState.PLAYING;
            score = 0;
            level = 1;
            player = new Player();
            particles = [];
            startLevel(level);
        }
    }

    if (currentState === GameState.PLAYING && keyCode === SHIFT) {
        player.activateShield();
    }
}

function keyReleased() {
    keys[keyCode] = false;
}

function createExplosion(x, y, col, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, col));
    }
}

// ----- CLASSES -----

class Star {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.z = random(0.5, 3);
        this.size = map(this.z, 0.5, 3, 1, 3);
        this.alpha = random(100, 255);
    }
    update() {
        this.y += this.z;
        if (this.y > height) {
            this.y = 0;
            this.x = random(width);
        }
    }
    draw() {
        noStroke();
        fill(255, 255, 255, this.alpha);
        drawingContext.shadowBlur = 0; // removed heavy shadow from 150 stars
        circle(this.x, this.y, this.size);
    }
}

class Particle {
    constructor(x, y, col) {
        this.x = x;
        this.y = y;
        this.vx = random(-3, 3);
        this.vy = random(-3, 3);
        this.life = random(20, 40);
        this.maxLife = this.life;
        this.color = col;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life--;
    }
    draw() {
        noStroke();
        let alpha = map(this.life, 0, this.maxLife, 0, 255);
        this.color.setAlpha(alpha);
        fill(this.color);
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = this.color.toString();
        circle(this.x, this.y, map(this.life, 0, this.maxLife, 1, 6));
        this.color.setAlpha(255); // reset
    }
    isDead() {
        return this.life <= 0;
    }
}

class Player {
    constructor() {
        this.x = width / 2;
        this.y = height - 50;
        this.w = 40;
        this.h = 40;
        this.speed = 7;

        this.shootCooldown = 0;
        this.maxShootCooldown = 12;

        this.shieldActive = false;
        this.shieldDuration = 180; // 3 seconds
        this.shieldTimer = 0;
        this.shieldCooldown = 300; // 5 seconds recovery
        this.shieldCooldownTimer = 0;

        this.invulnerable = true;
        this.invulnerableTimer = 120; // 2 secs spawn protection

        this.hp = 3; // Give the player 3 lives/HP
    }
    update() {
        if (this.invulnerableTimer > 0) this.invulnerableTimer--;

        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldCooldownTimer = this.shieldCooldown;
            }
        } else {
            if (this.shieldCooldownTimer > 0) this.shieldCooldownTimer--;

            // Movement
            if (keys[LEFT_ARROW]) this.x -= this.speed;
            if (keys[RIGHT_ARROW]) this.x += this.speed;
            if (keys[UP_ARROW]) this.y -= this.speed;
            if (keys[DOWN_ARROW]) this.y += this.speed;

            // Constrain
            this.x = constrain(this.x, this.w / 2, width - this.w / 2);
            this.y = constrain(this.y, this.h / 2 + 50, height - this.h / 2);

            // Shooting
            if (this.shootCooldown > 0) this.shootCooldown--;
            if (keys[32] && this.shootCooldown <= 0) { // SPACE
                this.shoot();
                this.shootCooldown = this.maxShootCooldown;
            }
        }
    }
    shoot() {
        bullets.push(new Bullet(this.x, this.y - this.h / 2, true));
        // add small recoil or sound visual
        createExplosion(this.x, this.y - this.h / 2, color(255, 200, 100), 2);
    }
    activateShield() {
        if (!this.shieldActive && this.shieldCooldownTimer <= 0) {
            this.shieldActive = true;
            this.shieldTimer = this.shieldDuration;
        }
    }
    draw() {
        push();
        translate(this.x, this.y);

        if (this.invulnerableTimer > 0) {
            this.invulnerable = true;
            if (floor(frameCount / 4) % 2 === 0) {
                // blinking effect for i-frames
                pop();
                return;
            }
        } else {
            this.invulnerable = false;
        }

        // Draw Player Ship
        imageMode(CENTER);
        blendMode(ADD);
        drawingContext.shadowBlur = 0; // removed to fix rectangular glow
        image(playerImg, 0, 0, this.w * 2, this.h * 2);
        blendMode(BLEND);

        // Detailed layered engine flame
        if (!this.shieldActive) {
            let flameHeight = random(25, 40);

            // Outer cyan glow
            drawingContext.shadowBlur = 15;
            drawingContext.shadowColor = color(0, 150, 255).toString();
            fill(0, 150, 255, 150);
            noStroke();
            beginShape();
            vertex(-14, this.h / 2 - 5);
            vertex(14, this.h / 2 - 5);
            vertex(0, this.h / 2 + flameHeight);
            endShape(CLOSE);

            // Inner yellow/orange core
            drawingContext.shadowBlur = 0;
            fill(255, 200, 50);
            beginShape();
            vertex(-8, this.h / 2 - 5);
            vertex(8, this.h / 2 - 5);
            vertex(0, this.h / 2 + flameHeight * 0.7);
            endShape(CLOSE);

            // Core hot white
            fill(255, 255, 255);
            beginShape();
            vertex(-4, this.h / 2 - 5);
            vertex(4, this.h / 2 - 5);
            vertex(0, this.h / 2 + flameHeight * 0.4);
            endShape(CLOSE);
        }

        pop();

        // Draw Shield
        if (this.shieldActive) {
            push();
            translate(this.x, this.y);
            noFill();
            stroke(50, 255, 50, 150);
            strokeWeight(3);
            drawingContext.shadowBlur = 20;
            drawingContext.shadowColor = color(50, 255, 50).toString();
            circle(0, 0, this.w + 30);

            // Hexagon pattern effect
            for (let i = 0; i < 6; i++) {
                let angle = TWO_PI / 6 * i + frameCount * 0.05;
                let x = cos(angle) * (this.w / 2 + 15);
                let y = sin(angle) * (this.w / 2 + 15);
                fill(100, 255, 100);
                noStroke();
                circle(x, y, 4);
            }
            pop();
        }
    }
    collidesWith(obj) {
        if (this.invulnerable && this.invulnerableTimer > 0) return false;
        let d = dist(this.x, this.y, obj.x, obj.y);
        return d < this.w / 2 + (obj.w ? obj.w / 2 : 5);
    }
}

class Bullet {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.speed = isPlayer ? 24 : -12; // increased speeds for better pacing
        this.w = 6;
        this.h = 16;
    }
    update() {
        this.y -= this.speed; // if player moves up (speed > 0), if enemy moves down (speed < 0 -> y -= -8 -> y += 8)
    }
    draw() {
        noStroke();
        let col = this.isPlayer ? color(255, 200, 0) : color(255, 50, 50);
        fill(col);
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = col.toString();
        rectMode(CENTER);
        rect(this.x, this.y, this.w, this.h, 3);
        rectMode(CORNER);
    }
    isOffscreen() {
        return this.y < -50 || this.y > height + 50;
    }
}

class Bird {
    constructor(x, y, lvl) {
        this.spawnX = x;
        this.spawnY = y;
        this.x = x;
        this.y = y;
        this.lvl = lvl; // 1 or 2

        this.w = lvl === 1 ? 30 : 40;
        this.hp = lvl === 1 ? 10 : 20;
        this.scoreValue = lvl === 1 ? 50 : 100;
        this.color = lvl === 1 ? color(255, 100, 200) : color(100, 255, 150);

        this.isDiving = false;
        this.time = random(1000);

        this.fireRate = lvl === 1 ? 0.002 : 0.005;
        this.diveRate = lvl === 1 ? 0.001 : 0.003;
    }
    update() {
        this.time += 0.05;

        if (!this.isDiving) {
            // Sway in formation
            let swayX = sin(this.time) * 50;
            let swayY = cos(this.time * 2) * 20;
            this.x = this.spawnX + swayX;
            this.y = this.spawnY + swayY;

            // Randomly start diving
            if (random() < this.diveRate) {
                this.isDiving = true;
                this.diveVec = createVector(player.x - this.x, height - this.y).normalize().mult(this.lvl === 1 ? 4 : 6);
            }
        } else {
            // Dive logic
            this.x += this.diveVec.x;
            this.y += this.diveVec.y;

            if (this.lvl === 2) {
                this.x += sin(this.time * 3) * 5; // erratic diving
            }

            if (this.y > height + 50) {
                this.isDead = true; // goes offscreen
            }
        }

        // Shooting
        if (random() < this.fireRate) {
            enemyBullets.push(new Bullet(this.x, this.y + this.w / 2, false));
        }
    }
    draw() {
        push();
        translate(this.x, this.y);
        drawingContext.shadowBlur = 0; // removed to fix rectangular glow

        imageMode(CENTER);
        blendMode(ADD);

        let flap = sin(this.time * 5) * 0.1; // small scale flap effect
        scale(1, 1 - flap); // animate slight wing flap by scaling image

        if (this.lvl === 1) {
            image(bird1Img, 0, 0, this.w * 2.5, this.w * 2.5);
        } else {
            image(bird2Img, 0, 0, this.w * 2.5, this.w * 2.5);
        }

        blendMode(BLEND);

        pop();
    }
    collidesWith(b) {
        // Only consider collisions with actual bullets
        if (b.isPlayer === undefined) return false;
        let d = dist(this.x, this.y, b.x, b.y);
        return d < this.w / 2 + b.w / 2;
    }
    takeDamage(amt) {
        this.hp -= amt;
    }
}

class Mothership {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 200;
        this.isMothership = true;

        this.hp = 200; // core HP
        this.scoreValue = 1000;
        this.color = color(255, 50, 255);

        this.time = 0;
        this.speedX = 3;

        // Shield plates logic
        this.shieldRadius = 120;
        this.shieldAngles = Array.from({ length: 12 }, (_, i) => ({
            angle: (TWO_PI / 12) * i,
            hp: 30,
            active: true
        }));
    }
    update() {
        this.time += 0.05;
        this.x += this.speedX;
        if (this.x < this.w / 2 + 50 || this.x > width - this.w / 2 - 50) {
            this.speedX *= -1;
        }
        this.y = 150 + sin(this.time) * 30; // float up and down

        // Rotate shield
        for (let s of this.shieldAngles) {
            s.angle += 0.02;
        }

        // Fire bullets down
        if (random() < 0.05) {
            enemyBullets.push(new Bullet(this.x + random(-this.w / 3, this.w / 3), this.y + 40, false));
        }
    }
    draw() {
        push();
        translate(this.x, this.y);

        // Draw Mothership
        drawingContext.shadowBlur = 0; // removed to fix rectangular glow

        imageMode(CENTER);
        blendMode(ADD);
        image(mothershipImg, 0, 0, this.w * 1.5, this.w * 1.5);
        blendMode(BLEND);

        // Glowing core eye (pulse effect on top of image)
        drawingContext.shadowBlur = 30;
        drawingContext.shadowColor = color(255, 0, 0).toString();
        fill(255, 0, 0, 150);
        noStroke();
        blendMode(ADD);
        ellipse(0, 0, 30, 20 + sin(this.time * 5) * 10);
        blendMode(BLEND);

        // Draw rotating shields
        noFill();
        stroke(0, 255, 255);
        strokeWeight(4);
        drawingContext.shadowColor = color(0, 255, 255).toString();
        for (let s of this.shieldAngles) {
            if (s.active) {
                let x = cos(s.angle) * this.shieldRadius;
                let y = sin(s.angle) * this.shieldRadius;
                if (y > 0) { // Only draw lower half shields for simplicity and to block player shots
                    line(x, y, x + cos(s.angle + HALF_PI) * 15, y + sin(s.angle + HALF_PI) * 15);
                    circle(x, y, 10);
                }
            }
        }

        // Core HP Bar
        fill(255, 0, 0);
        noStroke();
        rectMode(CENTER);
        let hpW = (this.hp / 200) * 100;
        rect(0, -60, hpW, 10);
        rectMode(CORNER);

        pop();
    }
    collidesWith(b) {
        // Did the bullet hit the core?
        let d = dist(this.x, this.y, b.x, b.y);
        if (d < 50) return true;
        return false;
    }
    collidesWithShield(b) {
        // Did the bullet hit a shield segment?
        for (let s of this.shieldAngles) {
            if (s.active) {
                let sx = this.x + cos(s.angle) * this.shieldRadius;
                let sy = this.y + sin(s.angle) * this.shieldRadius;

                if (sy > this.y) { // Only lower shields take hits
                    let d = dist(sx, sy, b.x, b.y);
                    if (d < 25) {
                        s.hp -= 10;
                        if (s.hp <= 0) s.active = false;
                        return true;
                    }
                }
            }
        }
        return false;
    }
    takeDamage(amt) {
        this.hp -= amt;
    }
}
