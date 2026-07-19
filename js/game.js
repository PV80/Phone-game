/* ============================================================
   DEAD LINE — Zombie Last Stand
   A mobile-first HTML5 canvas shooter.
   Move side to side, auto-fire the horde, and hit the target
   to unlock weapons, extra gunners and power-ups.
   No dependencies. No build step. Pure vanilla JS.
   ============================================================ */
(function () {
  "use strict";

  // ---------- Canvas & world ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Logical world size (portrait phone). Everything is drawn in these
  // coordinates and scaled to the real device via a transform.
  const W = 420;
  const H = 740;
  let scale = 1;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const availW = Math.min(window.innerWidth, 520);
    const availH = window.innerHeight;
    scale = Math.min(availW / W, availH / H);
    const cssW = Math.round(W * scale);
    const cssH = Math.round(H * scale);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();

  // ---------- Utility ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  // ---------- Persistence ----------
  const SAVE_KEY = "deadline_save_v1";
  function loadSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function persist() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ best: save.best, sound: save.sound })
      );
    } catch (e) {}
  }
  const save = loadSave();
  if (typeof save.best !== "number") save.best = 0;
  if (typeof save.sound !== "boolean") save.sound = true;

  // ---------- Audio (tiny WebAudio synth) ----------
  const Audio = {
    ctx: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    blip(freq, dur, type, vol) {
      if (!save.sound || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (dur || 0.08) + 0.02);
    },
    shoot() { this.blip(rand(560, 640), 0.05, "square", 0.05); },
    hit() { this.blip(rand(200, 260), 0.06, "sawtooth", 0.05); },
    kill() { this.blip(rand(120, 160), 0.12, "sawtooth", 0.06); },
    unlock() {
      this.blip(660, 0.09, "sine", 0.09);
      setTimeout(() => this.blip(880, 0.12, "sine", 0.09), 90);
      setTimeout(() => this.blip(1180, 0.16, "sine", 0.09), 200);
    },
    hurt() { this.blip(90, 0.18, "sawtooth", 0.1); },
    powerup() {
      this.blip(520, 0.08, "square", 0.08);
      setTimeout(() => this.blip(780, 0.1, "square", 0.08), 80);
    },
    target() { this.blip(1040, 0.05, "triangle", 0.06); },
  };

  // ---------- Weapons ----------
  // Fire rate is in shots/second. Damage per bullet. spread = number of
  // bullets per shot fanned out. pierce = zombies a bullet passes through.
  const WEAPONS = [
    { id: "pistol", name: "Pistol", rate: 3.2, dmg: 1, spread: 1, speed: 620, color: "#ffe27a", bw: 3.5, pierce: 0 },
    { id: "smg", name: "SMG", rate: 8, dmg: 1, spread: 1, speed: 720, color: "#8fe0ff", bw: 3, pierce: 0 },
    { id: "shotgun", name: "Shotgun", rate: 1.9, dmg: 1.4, spread: 5, speed: 640, color: "#ffb86b", bw: 3.5, pierce: 0, arc: 0.5 },
    { id: "rifle", name: "Assault Rifle", rate: 9.5, dmg: 1.6, spread: 1, speed: 820, color: "#c8ff8f", bw: 3.5, pierce: 1 },
    { id: "minigun", name: "Minigun", rate: 16, dmg: 1.3, spread: 1, speed: 760, color: "#ff9d5c", bw: 3, pierce: 0, jitter: 0.06 },
    { id: "plasma", name: "Plasma Cannon", rate: 5, dmg: 4, spread: 3, speed: 700, color: "#b98cff", bw: 6, pierce: 3, arc: 0.28 },
  ];

  // ---------- Unlock ladder ----------
  // Every time the player shoots the ◎ target enough times, the next reward
  // in this list is granted. This is the "shoot the target N times to unlock"
  // progression the game is built around.
  const UNLOCKS = [
    { type: "weapon", weapon: 1, hits: 5, label: "SMG" },
    { type: "gunner", hits: 6, label: "Extra Gunner" },
    { type: "weapon", weapon: 2, hits: 7, label: "Shotgun" },
    { type: "powerup_perm", stat: "maxhp", amount: 40, hits: 7, label: "+40 Max HP" },
    { type: "weapon", weapon: 3, hits: 8, label: "Assault Rifle" },
    { type: "gunner", hits: 9, label: "Extra Gunner" },
    { type: "weapon", weapon: 4, hits: 10, label: "Minigun" },
    { type: "powerup_perm", stat: "regen", amount: 1, hits: 10, label: "Health Regen" },
    { type: "gunner", hits: 12, label: "Extra Gunner" },
    { type: "weapon", weapon: 5, hits: 14, label: "Plasma Cannon" },
  ];

  // ---------- Game state ----------
  const State = { MENU: 0, PLAYING: 1, PAUSED: 2, OVER: 3 };
  let state = State.MENU;

  const game = {
    player: null,
    gunners: [],
    bullets: [],
    zombies: [],
    powerups: [],
    particles: [],
    floats: [],
    target: null,
    score: 0,
    kills: 0,
    wave: 0,
    waveKills: 0,
    waveTarget: 0,
    unlockIndex: 0,
    targetHits: 0,
    spawnTimer: 0,
    targetTimer: 0,
    shake: 0,
    time: 0,
  };

  function newPlayer() {
    return {
      x: W / 2,
      y: H - 150,
      w: 34,
      h: 46,
      speed: 340,
      hp: 100,
      maxhp: 100,
      regen: 0,
      weapon: 0,
      fireCd: 0,
      // Temporary power-up timers
      rapid: 0,
      shield: 0,
      damageBoost: 0,
      flash: 0,
      moveDir: 0, // -1 left, 1 right, 0 none from buttons
      dragX: null,
    };
  }

  function resetGame() {
    game.player = newPlayer();
    game.gunners = [];
    game.bullets = [];
    game.zombies = [];
    game.powerups = [];
    game.particles = [];
    game.floats = [];
    game.target = null;
    game.score = 0;
    game.kills = 0;
    game.wave = 0;
    game.waveKills = 0;
    game.unlockIndex = 0;
    game.targetHits = 0;
    game.spawnTimer = 0;
    game.targetTimer = 4;
    game.shake = 0;
    game.time = 0;
    startWave();
  }

  // ---------- Waves ----------
  function startWave() {
    game.wave++;
    game.waveKills = 0;
    game.waveTarget = 6 + game.wave * 3; // kills needed to clear the wave
    game.spawnTimer = 0.6;
    floatText(W / 2, H / 2 - 40, "WAVE " + game.wave, "#46e05a", 26, 1.6);
    Audio.blip(300, 0.1, "sine", 0.06);
    setTimeout(() => Audio.blip(400, 0.14, "sine", 0.06), 120);
  }

  function waveIntensity() {
    return 1 + (game.wave - 1) * 0.14;
  }

  // ---------- Zombies ----------
  const ZTYPES = {
    walker: { hp: 3, speed: 34, r: 15, color: "#6f9e5a", score: 10, dmg: 12 },
    runner: { hp: 2, speed: 74, r: 12, color: "#b7d16a", score: 15, dmg: 9 },
    brute: { hp: 12, speed: 22, r: 24, color: "#4f7a44", score: 40, dmg: 26 },
    spitter: { hp: 4, speed: 30, r: 14, color: "#9be08a", score: 20, dmg: 14 },
  };

  function spawnZombie() {
    const inten = waveIntensity();
    let type = "walker";
    const roll = Math.random();
    if (game.wave >= 3 && roll > 0.9) type = "brute";
    else if (game.wave >= 2 && roll > 0.62) type = "runner";
    else if (game.wave >= 4 && roll > 0.5 && roll <= 0.62) type = "spitter";

    const base = ZTYPES[type];
    const hp = Math.round(base.hp * (1 + (game.wave - 1) * 0.18));
    game.zombies.push({
      type,
      x: rand(30, W - 30),
      y: -30,
      r: base.r,
      hp,
      maxhp: hp,
      speed: base.speed * (0.85 + inten * 0.1),
      color: base.color,
      score: base.score,
      dmg: base.dmg,
      wob: rand(0, Math.PI * 2),
      hitFlash: 0,
    });
  }

  function spawnBoss() {
    const hp = 120 + game.wave * 22;
    game.zombies.push({
      type: "boss",
      x: W / 2,
      y: -60,
      r: 42,
      hp,
      maxhp: hp,
      speed: 16,
      color: "#7a3b3b",
      score: 400,
      dmg: 45,
      wob: 0,
      hitFlash: 0,
      boss: true,
    });
    floatText(W / 2, H / 2, "BOSS!", "#ff4646", 30, 2);
    Audio.hurt();
  }

  // ---------- The target (unlock mechanic) ----------
  function spawnTarget() {
    if (game.target) return;
    if (game.unlockIndex >= UNLOCKS.length) return;
    const need = UNLOCKS[game.unlockIndex].hits;
    game.target = {
      x: rand(60, W - 60),
      y: rand(90, 200),
      r: 26,
      vx: rand(40, 70) * (Math.random() < 0.5 ? -1 : 1),
      hits: 0,
      need,
      life: 14, // seconds before it flees
      pop: 0,
    };
    game.targetHits = 0;
  }

  function hitTarget() {
    const t = game.target;
    if (!t) return;
    t.hits++;
    game.targetHits++;
    t.pop = 0.18;
    Audio.target();
    floatText(t.x, t.y - t.r - 6, t.hits + "/" + t.need, "#ffb400", 14, 0.6);
    if (t.hits >= t.need) {
      grantUnlock();
      game.target = null;
      game.targetTimer = rand(8, 12);
    }
  }

  function grantUnlock() {
    const u = UNLOCKS[game.unlockIndex];
    if (!u) return;
    game.unlockIndex++;
    Audio.unlock();
    let text = u.label;
    if (u.type === "weapon") {
      game.player.weapon = u.weapon;
      text = WEAPONS[u.weapon].name;
    } else if (u.type === "gunner") {
      addGunner();
    } else if (u.type === "powerup_perm") {
      if (u.stat === "maxhp") {
        game.player.maxhp += u.amount;
        game.player.hp += u.amount;
      } else if (u.stat === "regen") {
        game.player.regen += u.amount;
      }
    }
    showUnlockToast(text);
    updateHUD();
  }

  function addGunner() {
    const idx = game.gunners.length;
    const side = idx % 2 === 0 ? -1 : 1;
    const rank = Math.floor(idx / 2) + 1;
    game.gunners.push({
      offX: side * (44 + rank * 26),
      offY: 10 + rank * 6,
      x: game.player.x,
      y: game.player.y,
      fireCd: rand(0, 0.2),
      w: 22,
      h: 30,
    });
  }

  // ---------- Power-ups ----------
  const POWER_TYPES = ["health", "rapid", "shield", "nuke", "damage", "gunner"];
  function maybeDropPowerup(x, y, chanceMul) {
    const chance = 0.08 * (chanceMul || 1);
    if (Math.random() > chance) return;
    const type = POWER_TYPES[randi(0, POWER_TYPES.length - 1)];
    game.powerups.push({ type, x, y, r: 13, vy: 60, bob: rand(0, 6.28), life: 9 });
  }

  function applyPowerup(p) {
    const pl = game.player;
    Audio.powerup();
    switch (p.type) {
      case "health":
        pl.hp = clamp(pl.hp + 30, 0, pl.maxhp);
        floatText(pl.x, pl.y - 40, "+30 HP", "#46e05a", 16, 1);
        break;
      case "rapid":
        pl.rapid = 6;
        floatText(pl.x, pl.y - 40, "RAPID FIRE", "#8fe0ff", 16, 1);
        break;
      case "shield":
        pl.shield = 7;
        floatText(pl.x, pl.y - 40, "SHIELD", "#c8ff8f", 16, 1);
        break;
      case "damage":
        pl.damageBoost = 8;
        floatText(pl.x, pl.y - 40, "2X DAMAGE", "#ff9d5c", 16, 1);
        break;
      case "nuke":
        nuke();
        break;
      case "gunner":
        addGunner();
        floatText(pl.x, pl.y - 40, "+1 GUNNER", "#ffb400", 16, 1);
        break;
    }
    updateHUD();
  }

  function nuke() {
    floatText(W / 2, H / 2, "NUKE!", "#ffb400", 28, 1.4);
    game.shake = 18;
    for (const z of game.zombies) {
      damageZombie(z, 8, true);
    }
    for (let i = 0; i < 40; i++) {
      spawnParticle(rand(0, W), rand(0, H), "#ffb400");
    }
    Audio.hurt();
  }

  // ---------- Particles & floating text ----------
  function spawnParticle(x, y, color) {
    game.particles.push({
      x, y,
      vx: rand(-140, 140),
      vy: rand(-140, 140),
      life: rand(0.3, 0.7),
      maxlife: 0.7,
      color,
      r: rand(1.5, 3.5),
    });
  }
  function bloodBurst(x, y, color, n) {
    for (let i = 0; i < (n || 8); i++) spawnParticle(x, y, color || "#a33");
  }
  function floatText(x, y, text, color, size, life) {
    game.floats.push({ x, y, text, color, size: size || 14, life: life || 0.8, maxlife: life || 0.8 });
  }

  // ---------- Firing ----------
  function fireWeapon(shooter, isPlayer) {
    const wpn = WEAPONS[game.player.weapon];
    const boost = game.player.damageBoost > 0 ? 2 : 1;
    const arc = wpn.arc || (wpn.spread > 1 ? 0.35 : 0);
    const count = wpn.spread;
    const originX = shooter.x;
    const originY = shooter.y - (isPlayer ? 24 : 16);
    for (let i = 0; i < count; i++) {
      let ang = -Math.PI / 2;
      if (count > 1) ang += (i - (count - 1) / 2) * (arc / Math.max(count - 1, 1));
      if (wpn.jitter) ang += rand(-wpn.jitter, wpn.jitter);
      game.bullets.push({
        x: originX,
        y: originY,
        vx: Math.cos(ang) * wpn.speed,
        vy: Math.sin(ang) * wpn.speed,
        dmg: wpn.dmg * boost,
        r: wpn.bw,
        color: wpn.color,
        pierce: wpn.pierce,
        hitSet: null,
      });
    }
    Audio.shoot();
  }

  function currentFireInterval() {
    const wpn = WEAPONS[game.player.weapon];
    let rate = wpn.rate;
    if (game.player.rapid > 0) rate *= 1.8;
    return 1 / rate;
  }

  // ---------- Damage ----------
  function damageZombie(z, dmg, silent) {
    z.hp -= dmg;
    z.hitFlash = 0.08;
    if (!silent) Audio.hit();
    bloodBurst(z.x, z.y, "#7a2020", 4);
    if (z.hp <= 0) killZombie(z);
  }

  function killZombie(z) {
    z.dead = true;
    game.kills++;
    game.waveKills++;
    game.score += z.score;
    bloodBurst(z.x, z.y, z.color, z.boss ? 26 : 10);
    Audio.kill();
    maybeDropPowerup(z.x, z.y, z.boss ? 8 : 1);
    if (z.boss) {
      game.shake = 14;
      floatText(z.x, z.y, "+" + z.score, "#ffb400", 18, 1.2);
    }
    updateHUD();
  }

  // ---------- Update ----------
  function update(dt) {
    game.time += dt;
    const pl = game.player;

    // --- Player movement ---
    let vx = 0;
    if (pl.dragX !== null) {
      const target = pl.dragX;
      const diff = target - pl.x;
      vx = clamp(diff * 10, -pl.speed * 1.6, pl.speed * 1.6);
    } else {
      vx = pl.moveDir * pl.speed;
    }
    pl.x = clamp(pl.x + vx * dt, pl.w / 2 + 6, W - pl.w / 2 - 6);

    // Regen + timers
    if (pl.regen > 0 && pl.hp < pl.maxhp) pl.hp = clamp(pl.hp + pl.regen * dt, 0, pl.maxhp);
    pl.rapid = Math.max(0, pl.rapid - dt);
    pl.shield = Math.max(0, pl.shield - dt);
    pl.damageBoost = Math.max(0, pl.damageBoost - dt);
    pl.flash = Math.max(0, pl.flash - dt);

    // --- Auto fire ---
    pl.fireCd -= dt;
    if (pl.fireCd <= 0) {
      fireWeapon(pl, true);
      pl.fireCd = currentFireInterval();
    }

    // --- Gunners ---
    for (const g of game.gunners) {
      g.x += ((pl.x + g.offX) - g.x) * Math.min(1, dt * 8);
      g.y = pl.y + g.offY;
      g.fireCd -= dt;
      if (g.fireCd <= 0) {
        fireWeapon(g, false);
        g.fireCd = currentFireInterval() * 1.1;
      }
    }

    // --- Spawning ---
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.waveKills < game.waveTarget) {
      spawnZombie();
      const gap = clamp(1.5 - game.wave * 0.06, 0.35, 1.5);
      game.spawnTimer = rand(gap * 0.7, gap * 1.3);
    }

    // Boss every 5th wave once enough killed
    if (game.wave % 5 === 0 && game.waveKills >= game.waveTarget - 1 &&
        !game.zombies.some((z) => z.boss) && !game._bossThisWave) {
      spawnBoss();
      game._bossThisWave = true;
    }

    // Wave clear
    if (game.waveKills >= game.waveTarget && game.zombies.length === 0) {
      game._bossThisWave = false;
      startWave();
    }

    // --- Target ---
    game.targetTimer -= dt;
    if (!game.target && game.targetTimer <= 0 && game.unlockIndex < UNLOCKS.length) {
      spawnTarget();
    }
    if (game.target) {
      const t = game.target;
      t.x += t.vx * dt;
      if (t.x < 50 || t.x > W - 50) t.vx *= -1;
      t.x = clamp(t.x, 50, W - 50);
      t.life -= dt;
      t.pop = Math.max(0, t.pop - dt);
      if (t.life <= 0) {
        game.target = null;
        game.targetTimer = rand(6, 10);
      }
    }

    // --- Bullets ---
    for (const b of game.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
    }

    // Bullet vs target
    if (game.target) {
      const t = game.target;
      for (const b of game.bullets) {
        if (b.dead) continue;
        if (dist2(b.x, b.y, t.x, t.y) < (t.r + b.r) * (t.r + b.r)) {
          b.dead = true;
          hitTarget();
          bloodBurst(b.x, b.y, "#ffb400", 5);
          if (!game.target) break;
        }
      }
    }

    // Bullet vs zombies
    for (const b of game.bullets) {
      if (b.dead) continue;
      for (const z of game.zombies) {
        if (z.dead) continue;
        const rr = (z.r + b.r) * (z.r + b.r);
        if (dist2(b.x, b.y, z.x, z.y) < rr) {
          if (b.pierce > 0) {
            if (!b.hitSet) b.hitSet = new Set();
            if (b.hitSet.has(z)) continue;
            b.hitSet.add(z);
            damageZombie(z, b.dmg);
            b.pierce--;
            if (b.pierce < 0) b.dead = true;
          } else {
            damageZombie(z, b.dmg);
            b.dead = true;
          }
          if (b.dead) break;
        }
      }
    }

    // --- Zombies ---
    for (const z of game.zombies) {
      if (z.dead) continue;
      z.wob += dt * 3;
      // Drift toward player horizontally a little for menace
      const towardX = Math.sign(pl.x - z.x) * (z.boss ? 10 : 18);
      z.x += (towardX + Math.sin(z.wob) * 10) * dt;
      z.x = clamp(z.x, z.r, W - z.r);
      z.y += z.speed * dt;
      z.hitFlash = Math.max(0, z.hitFlash - dt);

      // Reached the player line?
      if (z.y + z.r >= pl.y - pl.h / 2) {
        if (pl.shield > 0) {
          floatText(pl.x, pl.y - 40, "BLOCKED", "#c8ff8f", 14, 0.7);
        } else {
          pl.hp -= z.dmg;
          pl.flash = 0.25;
          game.shake = 8;
          Audio.hurt();
          floatText(pl.x, pl.y - 46, "-" + Math.round(z.dmg), "#ff4646", 15, 0.8);
        }
        killZombie(z);
        z.score = 0;
        if (pl.hp <= 0) {
          pl.hp = 0;
          gameOver();
          return;
        }
      }
    }

    // --- Powerups ---
    for (const p of game.powerups) {
      p.y += p.vy * dt;
      p.vy = Math.max(0, p.vy - 40 * dt);
      p.bob += dt * 5;
      p.life -= dt;
      if (p.life <= 0) p.dead = true;
      // Auto-collect when near player, or reaches player line
      if (dist2(p.x, p.y, pl.x, pl.y) < (p.r + 40) * (p.r + 40) || p.y > pl.y) {
        p.dead = true;
        applyPowerup(p);
      }
    }

    // --- Particles / floats ---
    for (const pt of game.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92;
      pt.vy *= 0.92;
      pt.life -= dt;
      if (pt.life <= 0) pt.dead = true;
    }
    for (const f of game.floats) {
      f.y -= 26 * dt;
      f.life -= dt;
      if (f.life <= 0) f.dead = true;
    }

    // Cleanup
    game.bullets = game.bullets.filter((b) => !b.dead);
    game.zombies = game.zombies.filter((z) => !z.dead);
    game.powerups = game.powerups.filter((p) => !p.dead);
    game.particles = game.particles.filter((p) => !p.dead);
    game.floats = game.floats.filter((f) => !f.dead);

    game.shake = Math.max(0, game.shake - dt * 40);
  }

  // ---------- Rendering ----------
  function draw() {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    // Screen shake
    let sx = 0, sy = 0;
    if (game.shake > 0) {
      sx = rand(-game.shake, game.shake) * 0.4;
      sy = rand(-game.shake, game.shake) * 0.4;
    }
    ctx.save();
    ctx.translate(sx, sy);

    drawBackground();

    if (state !== State.MENU) {
      drawTarget();
      drawPowerups();
      drawZombies();
      drawBullets();
      drawParticles();
      drawGunners();
      drawPlayer();
      drawFloats();
      if (game.player && game.player.flash > 0) {
        ctx.fillStyle = "rgba(255,40,40," + game.player.flash * 0.5 + ")";
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
    }
    ctx.restore();
  }

  function drawBackground() {
    // Ground gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0d1b16");
    g.addColorStop(0.5, "#122019");
    g.addColorStop(1, "#0a120e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Perspective lane lines
    ctx.strokeStyle = "rgba(70,224,90,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const x = (W / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(W / 2 + (x - W / 2) * 2.2, H);
      ctx.stroke();
    }
    // Horizontal scan lines drifting
    ctx.strokeStyle = "rgba(70,224,90,0.04)";
    const off = (game.time * 30) % 40;
    for (let y = -40 + off; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Player "safe line"
    if (state !== State.MENU && game.player) {
      const y = game.player.y - game.player.h / 2;
      ctx.strokeStyle = "rgba(255,70,70,0.25)";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPlayer() {
    const pl = game.player;
    if (!pl) return;
    ctx.save();
    ctx.translate(pl.x, pl.y);

    // Shield ring
    if (pl.shield > 0) {
      ctx.strokeStyle = "rgba(200,255,143," + (0.4 + 0.3 * Math.sin(game.time * 10)) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body
    ctx.fillStyle = "#3a6b8f";
    roundRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h, 6);
    ctx.fill();
    // Vest
    ctx.fillStyle = "#2d5470";
    roundRect(-pl.w / 2 + 4, -pl.h / 2 + 6, pl.w - 8, pl.h - 20, 4);
    ctx.fill();
    // Head
    ctx.fillStyle = "#e8c39e";
    ctx.beginPath();
    ctx.arc(0, -pl.h / 2 - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    // Gun
    ctx.fillStyle = "#222";
    ctx.fillRect(-3, -pl.h / 2 - 22, 6, 22);
    const wpn = WEAPONS[pl.weapon];
    ctx.fillStyle = wpn.color;
    ctx.fillRect(-2, -pl.h / 2 - 22, 4, 5);

    ctx.restore();
  }

  function drawGunners() {
    for (const g of game.gunners) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = "#527a4d";
      roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 5);
      ctx.fill();
      ctx.fillStyle = "#e8c39e";
      ctx.beginPath();
      ctx.arc(0, -g.h / 2 - 5, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.fillRect(-2, -g.h / 2 - 18, 4, 18);
      ctx.restore();
    }
  }

  function drawZombies() {
    for (const z of game.zombies) {
      ctx.save();
      ctx.translate(z.x, z.y);
      const flash = z.hitFlash > 0;
      // Body
      ctx.fillStyle = flash ? "#ffffff" : z.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.r, 0, Math.PI * 2);
      ctx.fill();
      // Darker torso
      ctx.fillStyle = flash ? "#ffdddd" : shade(z.color, -0.2);
      ctx.beginPath();
      ctx.ellipse(0, z.r * 0.5, z.r * 0.8, z.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      if (!flash) {
        ctx.fillStyle = z.boss ? "#ffea00" : "#c40000";
        ctx.beginPath();
        ctx.arc(-z.r * 0.35, -z.r * 0.15, z.r * 0.14, 0, Math.PI * 2);
        ctx.arc(z.r * 0.35, -z.r * 0.15, z.r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // HP bar for tougher zombies
      if (z.maxhp > 4 || z.boss) {
        const bw = z.r * 2;
        const frac = clamp(z.hp / z.maxhp, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(z.x - bw / 2, z.y - z.r - 9, bw, 4);
        ctx.fillStyle = z.boss ? "#ff4646" : "#8fe0ff";
        ctx.fillRect(z.x - bw / 2, z.y - z.r - 9, bw * frac, 4);
      }
    }
  }

  function drawBullets() {
    for (const b of game.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // trail
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = b.r * 1.4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawTarget() {
    const t = game.target;
    if (!t) return;
    ctx.save();
    ctx.translate(t.x, t.y);
    const s = 1 + t.pop;
    ctx.scale(s, s);
    // Flashing when about to flee
    const fleeing = t.life < 4 && Math.floor(t.life * 6) % 2 === 0;
    const rings = ["#ff4646", "#ffffff", "#ff4646", "#ffffff"];
    for (let i = 0; i < rings.length; i++) {
      ctx.fillStyle = fleeing ? (i % 2 ? "#333" : "#ffb400") : rings[i];
      ctx.beginPath();
      ctx.arc(0, 0, t.r - i * (t.r / rings.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff4646";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Progress ring
    const frac = t.hits / t.need;
    ctx.strokeStyle = "#ffb400";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }

  function drawPowerups() {
    const icons = {
      health: "+", rapid: "»", shield: "◊", nuke: "☢", damage: "×2", gunner: "⌇",
    };
    const colors = {
      health: "#46e05a", rapid: "#8fe0ff", shield: "#c8ff8f",
      nuke: "#ffb400", damage: "#ff9d5c", gunner: "#ffe27a",
    };
    for (const p of game.powerups) {
      const yy = p.y + Math.sin(p.bob) * 3;
      ctx.save();
      ctx.translate(p.x, yy);
      ctx.globalAlpha = p.life < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(p.life * 8)) : 1;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors[p.type];
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06140a";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icons[p.type], 0, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxlife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of game.floats) {
      ctx.globalAlpha = clamp(f.life / f.maxlife, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold " + f.size + "px system-ui";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Canvas helpers ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shade(hex, amt) {
    const c = hex.replace("#", "");
    let r = parseInt(c.substr(0, 2), 16);
    let g = parseInt(c.substr(2, 2), 16);
    let b = parseInt(c.substr(4, 2), 16);
    r = clamp(Math.round(r + r * amt), 0, 255);
    g = clamp(Math.round(g + g * amt), 0, 255);
    b = clamp(Math.round(b + b * amt), 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  // ---------- HUD ----------
  const el = {
    hud: document.getElementById("hud"),
    wave: document.getElementById("hud-wave"),
    score: document.getElementById("hud-score"),
    kills: document.getElementById("hud-kills"),
    hp: document.getElementById("hp-fill"),
    weaponName: document.getElementById("hud-weapon-name"),
    targetProgress: document.getElementById("hud-target-progress"),
    touch: document.getElementById("touch-controls"),
    unlockToast: document.getElementById("unlock-toast"),
    unlockText: document.getElementById("unlock-text"),
  };

  function updateHUD() {
    if (!game.player) return;
    el.wave.textContent = game.wave;
    el.score.textContent = game.score;
    el.kills.textContent = game.kills;
    el.hp.style.width = clamp((game.player.hp / game.player.maxhp) * 100, 0, 100) + "%";
    el.weaponName.textContent = WEAPONS[game.player.weapon].name;
    if (game.unlockIndex >= UNLOCKS.length) {
      el.targetProgress.textContent = "All unlocked — MAX!";
    } else {
      const u = UNLOCKS[game.unlockIndex];
      el.targetProgress.textContent = "Next: " + u.label;
    }
  }

  let toastTimer = null;
  function showUnlockToast(text) {
    el.unlockText.textContent = text;
    el.unlockToast.classList.remove("hidden");
    // reflow for transition
    void el.unlockToast.offsetWidth;
    el.unlockToast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.unlockToast.classList.remove("show");
      setTimeout(() => el.unlockToast.classList.add("hidden"), 300);
    }, 1600);
  }

  // ---------- Screens ----------
  const screens = {
    start: document.getElementById("screen-start"),
    pause: document.getElementById("screen-pause"),
    over: document.getElementById("screen-over"),
  };

  function showMenu() {
    state = State.MENU;
    screens.start.classList.remove("hidden");
    screens.pause.classList.add("hidden");
    screens.over.classList.add("hidden");
    el.hud.classList.add("hidden");
    el.touch.classList.add("hidden");
    document.getElementById("best-score").textContent = save.best;
  }

  function startPlay() {
    Audio.ensure();
    resetGame();
    state = State.PLAYING;
    screens.start.classList.add("hidden");
    screens.over.classList.add("hidden");
    screens.pause.classList.add("hidden");
    el.hud.classList.remove("hidden");
    el.touch.classList.remove("hidden");
    updateHUD();
  }

  function pauseGame() {
    if (state !== State.PLAYING) return;
    state = State.PAUSED;
    screens.pause.classList.remove("hidden");
  }
  function resumeGame() {
    if (state !== State.PAUSED) return;
    state = State.PLAYING;
    screens.pause.classList.add("hidden");
    lastT = performance.now();
  }

  function gameOver() {
    state = State.OVER;
    const isBest = game.score > save.best;
    if (isBest) {
      save.best = game.score;
      persist();
    }
    document.getElementById("over-score").textContent = game.score;
    document.getElementById("over-wave").textContent = game.wave;
    document.getElementById("over-kills").textContent = game.kills;
    document.getElementById("over-best").textContent =
      isBest ? "★ NEW BEST SCORE! ★" : "Best: " + save.best;
    screens.over.classList.remove("hidden");
    el.touch.classList.add("hidden");
  }

  // ---------- Input ----------
  function bindHold(id, onDown, onUp) {
    const node = document.getElementById(id);
    const down = (e) => { e.preventDefault(); onDown(); };
    const up = (e) => { e.preventDefault(); onUp(); };
    node.addEventListener("touchstart", down, { passive: false });
    node.addEventListener("touchend", up, { passive: false });
    node.addEventListener("touchcancel", up, { passive: false });
    node.addEventListener("mousedown", down);
    node.addEventListener("mouseup", up);
    node.addEventListener("mouseleave", up);
  }

  bindHold("ctrl-left", () => { if (game.player) { game.player.moveDir = -1; game.player.dragX = null; } }, () => { if (game.player && game.player.moveDir === -1) game.player.moveDir = 0; });
  bindHold("ctrl-right", () => { if (game.player) { game.player.moveDir = 1; game.player.dragX = null; } }, () => { if (game.player && game.player.moveDir === 1) game.player.moveDir = 0; });

  // Fire button = manual burst (auto-fire already runs, but this resets cd for feedback)
  bindHold("ctrl-fire", () => {
    if (game.player && state === State.PLAYING) {
      game.player.fireCd = 0;
      game.player.manualFire = true;
    }
  }, () => { if (game.player) game.player.manualFire = false; });

  // Drag anywhere on the canvas to steer the player horizontally
  function canvasToWorldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * W, 0, W);
  }
  function onDrag(clientX) {
    if (state !== State.PLAYING || !game.player) return;
    game.player.dragX = canvasToWorldX(clientX);
    game.player.moveDir = 0;
  }
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length) onDrag(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length) onDrag(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener("touchend", () => {
    if (game.player) game.player.dragX = null;
  }, { passive: true });

  let mouseDown = false;
  canvas.addEventListener("mousedown", (e) => { mouseDown = true; onDrag(e.clientX); });
  window.addEventListener("mousemove", (e) => { if (mouseDown) onDrag(e.clientX); });
  window.addEventListener("mouseup", () => { mouseDown = false; if (game.player) game.player.dragX = null; });

  // Keyboard for desktop testing
  window.addEventListener("keydown", (e) => {
    if (!game.player) return;
    if (e.key === "ArrowLeft" || e.key === "a") { game.player.moveDir = -1; game.player.dragX = null; }
    if (e.key === "ArrowRight" || e.key === "d") { game.player.moveDir = 1; game.player.dragX = null; }
    if (e.key === "p") { state === State.PLAYING ? pauseGame() : resumeGame(); }
  });
  window.addEventListener("keyup", (e) => {
    if (!game.player) return;
    if ((e.key === "ArrowLeft" || e.key === "a") && game.player.moveDir === -1) game.player.moveDir = 0;
    if ((e.key === "ArrowRight" || e.key === "d") && game.player.moveDir === 1) game.player.moveDir = 0;
  });

  // Buttons
  document.getElementById("btn-start").addEventListener("click", startPlay);
  document.getElementById("btn-retry").addEventListener("click", startPlay);
  document.getElementById("btn-menu").addEventListener("click", showMenu);
  document.getElementById("btn-pause").addEventListener("click", pauseGame);
  document.getElementById("btn-resume").addEventListener("click", resumeGame);
  document.getElementById("btn-quit").addEventListener("click", showMenu);

  const soundBtn = document.getElementById("btn-sound");
  function refreshSoundBtn() {
    soundBtn.textContent = save.sound ? "🔊 Sound: On" : "🔇 Sound: Off";
  }
  soundBtn.addEventListener("click", () => {
    save.sound = !save.sound;
    persist();
    refreshSoundBtn();
    if (save.sound) Audio.ensure();
  });
  refreshSoundBtn();

  // Pause when tab hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === State.PLAYING) pauseGame();
  });

  // ---------- Main loop ----------
  let lastT = performance.now();
  function loop(now) {
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps
    if (state === State.PLAYING) {
      update(dt);
      if (Math.floor(game.time * 4) !== Math.floor((game.time - dt) * 4)) updateHUD();
    }
    draw();
    requestAnimationFrame(loop);
  }

  // Expose a tiny hook for automated smoke tests.
  window.__DEADLINE__ = {
    getState: () => state,
    getGame: () => game,
    start: startPlay,
    step: (dt) => { if (state === State.PLAYING) update(dt || 0.016); },
    hitTargetOnce: () => { if (game.target) hitTarget(); },
    forceTarget: () => { game.targetTimer = 0; if (!game.target) spawnTarget(); },
    WEAPONS,
    UNLOCKS,
  };

  showMenu();
  requestAnimationFrame(loop);
})();
