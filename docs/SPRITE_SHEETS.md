# Dead Line — Sprite Sheet Asset List & AI Prompts

A complete production list for every visual asset in the game, with a ready-to-paste
AI-image-generator prompt for each sprite sheet. Prompts are written to match the
existing protagonist art (gritty, semi-realistic, painted, side-view) and the game's
actual weapons, enemies and power-ups.

**Totals:** 4 characters · 6 guns (+2 FX sheets) · 8 zombies · 6 maps · 3 pickup/FX/UI sheets = **29 sheets**

---

## How to get clean, game-ready output

- **Flat background beats fancy.** Ask for a solid flat grey (`#3a3a3a`) or chroma background — the repo's `assets/extract_player.py` keys it out automatically. Avoid textured/vignette backgrounds.
- **Lock the character across frames.** Reuse one seed, or generate a single reference/turnaround first and feed it back as an image reference so every frame is the same design.
- **Keep facing = RIGHT**, full-body, feet on one baseline. That drops straight into the current renderer.
- **Resolution:** request 1024px+ and evenly spaced frames in a uniform grid.
- Works with Midjourney, DALL·E 3, SDXL / Leonardo, Firefly, etc. For true transparency, generate on flat grey then cut out (or use a bg-remover).

**Shared style phrase** (already embedded in every prompt below, repeated here for edits):
> gritty semi-realistic painterly game art, subtle 3D-rendered look, high detail, cinematic top-down rim lighting, muted desaturated post-apocalyptic palette with teal and warm-amber accents, sharp readable silhouette, no motion blur, no text, no watermark

**Shared layout phrase for animated sheets:**
> full-body SIDE-VIEW sprite sheet facing RIGHT, uniform grid, one animation per row, frames evenly spaced with feet on a single baseline, identical design/scale/colors in every frame, flat #3a3a3a background, game-ready

---

## 1. CHARACTERS

Playable protagonist plus the "more gunners" allies you unlock by hitting the target.

| # | Name | Role | Weapon | Look |
|---|------|------|--------|------|
| C1 | **Vex** | Protagonist (already in game) | evolves through all guns | dreadlocks, teal tank, tactical vest |
| C2 | **Bruiser** | Heavy ally gunner | LMG / Minigun | broad, shaved head, riot pads |
| C3 | **Ghost** | Marksman ally gunner | DMR / Rifle | lean, hooded, face scarf, scoped rifle |
| C4 | **Doc** | Medic ally gunner | SMG | goggles, medical pouches, red-cross armband |

Each character sheet rows: **IDLE · AIM · SHOOT (3) · SHOOT-while-moving (3) · TAKE HIT (2) · RELOAD (3) · DEATH (3)**

### C1 — Vex (regenerate / add frames)
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic top-down rim lighting, muted post-apocalyptic teal-and-amber palette. A lone female zombie-apocalypse survivor named Vex: dark shoulder-length dreadlocks, teal sleeveless tank top, worn tactical chest rig and backpack, dark cargo pants, combat boots, holding an assault rifle. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on a single baseline, identical design and colors in every frame, flat #3a3a3a background, no text, no watermark. Rows: idle, aim, shooting with muzzle flash (3 frames), shooting while stepping (3), taking a hit (2), reloading (3), death fall (3).
```

### C2 — Bruiser (heavy gunner)
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic top-down rim lighting, muted post-apocalyptic teal-and-amber palette. A heavy-set male mercenary named Bruiser: broad shoulders, shaved head, riot shoulder pads and plate carrier over a grey shirt, thick forearms, carrying a belt-fed light machine gun. Full-body SIDE-VIEW facing RIGHT, same scale as a companion soldier, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: idle, aim, sustained fire with muzzle flash (3), firing while walking (3), take hit (2), reload (3), death (3).
```

### C3 — Ghost (marksman)
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic top-down rim lighting, muted post-apocalyptic teal-and-amber palette. A lean hooded male marksman named Ghost: dark hoodie under a light tactical harness, face scarf, fingerless gloves, holding a scoped semi-auto marksman rifle, agile silhouette. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: idle, aim down sight, single precise shots with sharp muzzle flash (3), crouch-fire (3), take hit (2), reload (3), death (3).
```

### C4 — Doc (medic)
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic top-down rim lighting, muted post-apocalyptic teal-and-amber palette. A field-medic woman named Doc: short practical hair, goggles on forehead, cargo vest with medical pouches and a faded red-cross armband, holding a compact SMG. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: idle, aim, rapid SMG fire with muzzle flash (3), firing while moving (3), self-injector heal gesture (2), take hit (2), death (3).
```

---

## 2. GUNS

The 6 in-game weapons as icon/pickup art, plus the muzzle-flash and projectile FX that sell them.

| # | Weapon | Accent color | Look |
|---|--------|--------------|------|
| G1 | Pistol | yellow | battered sidearm |
| G2 | SMG | cyan-blue | stubby, compact |
| G3 | Shotgun | orange | sawn-off pump-action |
| G4 | Assault Rifle | green | railed carbine |
| G5 | Minigun | amber | six rotary barrels |
| G6 | Plasma Cannon | violet | sci-fi energy rifle, glowing coils |

### G-sheet — all 6 weapon icons (one sheet)
```
Gritty semi-realistic painterly game art, high detail, cinematic lighting, muted post-apocalyptic palette. Weapon icon sprite sheet for a zombie shooter: a 2x3 grid of six side-profile firearms, each centered in its own cell, consistent scale and lighting, clean metallic detail with subtle wear, on a transparent (or flat #3a3a3a) background, no hands, no text. 1) battered semi-auto pistol with yellow accents, 2) compact stubby SMG with cyan accents, 3) sawn-off pump shotgun with orange accents, 4) railed assault carbine with green accents, 5) six-barrel rotary minigun with amber accents, 6) futuristic plasma cannon with glowing violet energy coils.
```

### GFX-1 — Muzzle flashes
```
Muzzle-flash effect sprite sheet on pure black background for additive blending: a row of 6 stylized gunfire flashes of increasing size, bright white-to-amber cores with wispy smoke, plus one violet plasma-burst variant, each centered in its own cell, high detail, no text.
```

### GFX-2 — Projectiles / bullets
```
Projectile sprite sheet on pure black background for additive blending: glowing tracer rounds in yellow, cyan, orange and green; a spread of shotgun pellets; a large violet plasma orb with a 3-frame pulse; and small bullet-impact spark bursts (4 frames). Centered cells, consistent glow, no text.
```

---

## 3. ZOMBIES

The 5 in-game enemy types plus 3 expansion enemies. Colors match the game code.

| # | Enemy | Color | Hook |
|---|-------|-------|------|
| Z1 | **Walker** | murky green `#6f9e5a` | slow shambler |
| Z2 | **Runner** | pale green | fast, lean |
| Z3 | **Brute** | dark green `#4f7a44` | big, tanky |
| Z4 | **Spitter** | sickly pale green | ranged bile |
| Z5 | **Behemoth (Boss)** | blood-maroon `#7a3b3b` | huge, every 5th wave |
| Z6 | **Crawler** | grey-green | legless, drags |
| Z7 | **Screamer** | ashen | shrieks, buffs horde |
| Z8 | **Bloater** | yellow-green | explodes on death |

Each zombie sheet rows: **WALK (4) · ATTACK (3) · TAKE HIT (2) · DEATH (3)** (Spitter/Behemoth add a ranged/slam row).

### Z1 — Walker
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A classic shambling zombie with murky-green rotting skin (#6f9e5a), tattered civilian clothes, glowing red eyes, hunched menacing posture. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: shambling walk cycle (4 frames), grab-and-bite attack (3), reacting to being shot (2), collapsing death (3).
```

### Z2 — Runner
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A fast feral zombie, lean and sinewy with pale sickly-green skin, torn athletic clothing, mouth agape, aggressive. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: fast run cycle (4), leaping lunge attack (3), take hit (2), tumbling death (3).
```

### Z3 — Brute
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A hulking tank zombie, massive muscular build, dark-green mottled hide (#4f7a44), exposed ribs and scar tissue, tiny head, heavy gait. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: slow heavy walk (4), overhead smash attack (3), take-hit flinch (2), heavy death fall (3).
```

### Z4 — Spitter
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A ranged zombie with a pale sickly-green bloated throat and glands, hunched, dripping green bile. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: creeping walk (4), rearing back and spitting a bile projectile (3), take hit (2), death (3), plus a small separate row of the green bile projectile (3 frames) on black.
```

### Z5 — Behemoth (Boss)
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, dramatic cinematic rim lighting, muted palette. A colossal zombie boss with blood-maroon diseased flesh (#7a3b3b), armor-like bone plating, glowing yellow eyes, twice the size of a normal zombie, terrifying. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: ground-shaking walk (4), double-fist ground slam (4), enraged roar (2), take hit (2), climactic death collapse (4).
```

### Z6 — Crawler
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A legless crawling zombie dragging itself with its arms, grey-green torn torso, trailing viscera. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet/arms on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: drag crawl cycle (4), swipe attack (3), take hit (2), death (3).
```

### Z7 — Screamer / Banshee
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A gaunt ashen-skinned screamer zombie, distended jaw, sunken eyes, ragged gown, emitting a sonic shriek. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: eerie glide-walk (4), rearing scream with concentric sound-wave rings (3), take hit (2), death (3).
```

### Z8 — Bloater
```
Gritty semi-realistic painterly game sprite sheet, subtle 3D-rendered look, cinematic rim lighting, muted palette. A grotesquely bloated zombie, swollen yellow-green gas-filled body, cracked oozing skin, unstable. Full-body SIDE-VIEW facing RIGHT, uniform grid, one animation per row, feet on one baseline, identical design in every frame, flat #3a3a3a background, no text. Rows: slow waddling walk (4), take hit (2), and a dramatic 4-frame explosion death bursting into a toxic green gas cloud.
```

---

## 4. LOCATIONS / MAPS

Portrait, vertically-scrolling lane backgrounds — one per biome, rotated as waves progress. Each must tile seamlessly top-to-bottom.

| # | Location | Mood |
|---|----------|------|
| M1 | **Downtown Ruins** | wrecked city street, burning cars |
| M2 | **Subway Station** | flickering metro platform + tunnel |
| M3 | **Abandoned Hospital** | blood-smeared wards, gurneys |
| M4 | **Scrapyard** | crushed cars, chain fences, cranes |
| M5 | **Forest Highway** | overgrown road, fog, wrecked bus |
| M6 | **Military Checkpoint** | sandbags, floodlights, barricades |

Shared map layout: **seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective for a lane shooter, clear uncluttered center lane, layered depth, no characters, no text.**

### M1 — Downtown Ruins
```
Gritty semi-realistic painterly game background, cinematic lighting, muted post-apocalyptic teal-and-amber palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective for a lane shooter, clear uncluttered center lane. A ruined downtown city street at dusk: cracked asphalt lane down the middle, wrecked burning cars and toppled buses at the sides, shattered skyscrapers and drifting ash in the distance, embers and smoke, teal moonlight with amber fire glow. No characters, no text.
```

### M2 — Subway Station
```
Gritty semi-realistic painterly game background, cinematic lighting, muted palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective, clear center lane. An abandoned underground subway station: tiled platform with a dark train tunnel receding upward, flickering emergency lights, a derailed metro car, scattered debris and dripping water, claustrophobic teal-and-amber lighting. No characters, no text.
```

### M3 — Abandoned Hospital
```
Gritty semi-realistic painterly game background, cinematic lighting, muted palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective, clear center lane. A derelict hospital ward corridor: peeling walls with blood smears, overturned gurneys and wheelchairs at the sides, flickering fluorescent tubes, open central floor lane, sickly green-teal emergency lighting. No characters, no text.
```

### M4 — Scrapyard
```
Gritty semi-realistic painterly game background, cinematic lighting, muted palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective, clear center lane. A moonlit junkyard: towering stacks of crushed cars and scrap metal at the sides, chain-link fences, a rusted crane, oil puddles reflecting amber sodium lamps, a clear dirt lane through the middle. No characters, no text.
```

### M5 — Forest Highway
```
Gritty semi-realistic painterly game background, cinematic lighting, muted palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective, clear center lane. An overgrown abandoned highway at night: a cracked road lane reclaimed by weeds, wrecked cars and a toppled bus on the shoulders, dense misty pine forest on both sides, cold teal fog with distant amber wreck-fire. No characters, no text.
```

### M6 — Military Checkpoint
```
Gritty semi-realistic painterly game background, cinematic lighting, muted palette. Seamless vertically-tiling parallax background, PORTRAIT 9:16, slightly top-down angled perspective, clear center lane. A fallen military checkpoint: sandbag walls and concrete barriers flanking a central lane, tipped Humvees, coils of razor wire, harsh floodlights, warning-sign silhouettes, tense amber-and-teal night lighting. No characters, no text.
```

---

## 5. Pickups, FX & UI (you'll need these too)

### P-sheet — power-up pickups (matches the 6 in-game power-ups)
```
Gritty semi-realistic painterly game art, soft glow, muted palette. Power-up pickup icon sprite sheet: a row of glossy circular game tokens on a transparent (or flat #3a3a3a) background, each with a glowing emblem and matching rim color: green health cross, cyan rapid-fire double-arrows, light-green shield, amber radioactive nuke symbol, orange "x2" damage, yellow extra-gunner squad icon. Consistent size, soft outer glow, no text except the "x2".
```

### FX-sheet — blood & explosions
```
Effects sprite sheet on pure black background for additive blending: a 5-frame blood-splatter burst, a 5-frame dust/impact puff, a 6-frame fiery explosion, and a 4-frame green toxic gas cloud. Centered cells, consistent style, no text.
```

### T-sheet — unlock target + HUD marks
```
Clean flat game-UI sprite sheet on transparent background: a red-and-white bullseye target with a 3-frame "hit" pulse, a circular progress ring, a small crosshair, and wave/skull HUD marks. Crisp vector-ish style, subtle glow, no text.
```

---

## Drop-in workflow

When you generate any sheet:
1. Save the PNG into `assets/` (e.g. `assets/zombie_walker.png`).
2. Slice + background-key it the same way the protagonist was done — `assets/extract_player.py` is the template (adjust the frame boxes, or ask me to turn it into a generic auto-slicer).
3. Hook it into `js/game.js` (character/zombie/map loaders).

Ask me and I'll extend the pipeline so new sheets auto-import.
