/* Headless smoke test for Dead Line using Playwright + system Chromium.
   Boots the game in a real browser, drives it through the core loops
   (start, spawn, shoot, hit target, unlock, take damage, game over) and
   fails loudly if anything throws or a core invariant breaks. */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png",
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
        res.writeHead(404); res.end("nf"); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, () => resolve(server));
  });
}

const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };

(async () => {
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 400, height: 780 } });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  try {
    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__DEADLINE__);

    // 1. Menu state
    let st = await page.evaluate(() => window.__DEADLINE__.getState());
    assert(st === 0, "should start on MENU (got " + st + ")");
    assert(await page.locator("#screen-start").isVisible(), "start screen visible");

    // 2. Start the game
    await page.click("#btn-start");
    st = await page.evaluate(() => window.__DEADLINE__.getState());
    assert(st === 1, "should be PLAYING after start (got " + st + ")");
    const hasPlayer = await page.evaluate(() => !!window.__DEADLINE__.getGame().player);
    assert(hasPlayer, "player should exist");

    // 3. Step the sim so zombies spawn and get shot
    await page.evaluate(() => { for (let i = 0; i < 400; i++) window.__DEADLINE__.step(0.033); });
    const g1 = await page.evaluate(() => {
      const g = window.__DEADLINE__.getGame();
      return { kills: g.kills, score: g.score, bullets: g.bullets.length, wave: g.wave };
    });
    assert(g1.kills > 0, "should have kills after stepping (got " + g1.kills + ")");
    assert(g1.score > 0, "score should rise (got " + g1.score + ")");

    // 4. Unlock chain: force the target and shoot it enough times, repeatedly.
    const startWeapon = await page.evaluate(() => window.__DEADLINE__.getGame().player.weapon);
    const unlocksGained = await page.evaluate(() => {
      const D = window.__DEADLINE__;
      const g = D.getGame();
      const startIdx = g.unlockIndex;
      // Grant the first 3 unlocks via the target mechanic.
      for (let u = 0; u < 3 && g.unlockIndex < D.UNLOCKS.length; u++) {
        D.forceTarget();
        let guard = 0;
        const need = g.target ? g.target.need : 0;
        while (g.target && guard++ < 100) D.hitTargetOnce();
      }
      return g.unlockIndex - startIdx;
    });
    assert(unlocksGained >= 3, "should gain >=3 unlocks via target (got " + unlocksGained + ")");
    const afterWeapon = await page.evaluate(() => window.__DEADLINE__.getGame().player.weapon);
    assert(afterWeapon > startWeapon, "weapon should upgrade via unlocks");
    const gunners = await page.evaluate(() => window.__DEADLINE__.getGame().gunners.length);
    assert(gunners >= 1, "should have gained at least one gunner (got " + gunners + ")");

    // 5. Run more frames to ensure stability and a later wave.
    await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__DEADLINE__.step(0.033); });
    const g2 = await page.evaluate(() => {
      const g = window.__DEADLINE__.getGame();
      return { wave: g.wave, kills: g.kills, hp: g.player.hp, state: window.__DEADLINE__.getState() };
    });
    assert(g2.wave >= 1, "wave should progress");

    // 6. Force death to verify game-over path.
    await page.evaluate(() => {
      const g = window.__DEADLINE__.getGame();
      g.player.hp = 1; g.player.shield = 0;
      g.zombies.push({ type: "walker", x: g.player.x, y: g.player.y - 10, r: 15,
        hp: 999, maxhp: 999, speed: 200, color: "#6f9e5a", score: 10, dmg: 999, wob: 0, hitFlash: 0 });
      for (let i = 0; i < 30; i++) window.__DEADLINE__.step(0.033);
    });
    st = await page.evaluate(() => window.__DEADLINE__.getState());
    assert(st === 3, "should be OVER after fatal hit (got " + st + ")");
    assert(await page.locator("#screen-over").isVisible(), "game-over screen visible");

    // 7. Restart works
    await page.click("#btn-retry");
    st = await page.evaluate(() => window.__DEADLINE__.getState());
    assert(st === 1, "retry should restart PLAYING (got " + st + ")");

    // Screenshot for the record
    await page.evaluate(() => { for (let i = 0; i < 120; i++) window.__DEADLINE__.step(0.033); window.__DEADLINE__.forceTarget(); });
    await page.screenshot({ path: path.join(ROOT, "assets", "screenshot.png") });

    assert(errors.length === 0, "no runtime errors, got:\n" + errors.join("\n"));

    console.log("✅ ALL SMOKE TESTS PASSED");
    console.log("   kills:", g1.kills, "| score:", g1.score, "| unlocks:", unlocksGained,
      "| final weapon idx:", afterWeapon, "| gunners:", gunners, "| wave:", g2.wave);
  } catch (err) {
    console.error("❌ TEST FAILED:", err.message);
    if (errors.length) console.error("Runtime errors:\n" + errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
