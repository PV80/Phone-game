#!/usr/bin/env python3
"""Build all game-ready sprite atlases from the AI-generated source sheets.

Sources (6 PNGs, 1536x1024):
  chars   — C1 Vex / C2 Bruiser / C3 Ghost / C4 Doc (quadrants)
  zomA    — Z1 Walker / Z2 Runner / Z3 Shambler / Z4 Spitter
  zomB    — Z5 Boomer / Z6 Toxic / Z7 Crawler / Z8 Brute boss
  wfx     — weapon icons, muzzle/projectile FX, power-up pickups
  mapsA   — G12-G17 backgrounds
  mapsB   — G18-G20 backgrounds (+UI, unused)

Outputs:
  assets/sprites/player.png    + frames in atlas
  assets/sprites/allies.png
  assets/sprites/zombies.png
  assets/sprites/powerups.png
  assets/sprites/weapons.png
  assets/sprites/atlas.js      — window.ATLAS frame rects (works from file://)
  assets/maps/map_*.jpg        + entries in atlas.js with ground tint colors

Row bands inside each character/zombie panel are found from the colored row
labels; frames are split at the k-1 deepest column-profile minima (k = frame
count printed on the sheet). Each frame is cut out via a background-distance +
saturation mask keeping the component nearest the crop centre.

Usage: python3 assets/build_sprites.py <dir-with-source-sheets>
Requires: Pillow, numpy, scipy.
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy.ndimage import (uniform_filter1d, binary_closing, binary_dilation,
                           binary_opening, binary_fill_holes, label as cclabel)

SRC = sys.argv[1] if len(sys.argv) > 1 else 'source_sheets'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_S = os.path.join(ROOT, 'assets', 'sprites')
OUT_M = os.path.join(ROOT, 'assets', 'maps')
os.makedirs(OUT_S, exist_ok=True)
os.makedirs(OUT_M, exist_ok=True)

FILES = {
    'chars': 'f665fde6-146215.png',
    'zomA': '84e40025-146216.png',
    'zomB': 'db6e3803-146217.png',
    'wfx': '8b4840f7-146218.png',
    'mapsA': '050dc818-146219.png',
    'mapsB': '59206eeb-146220.png',
}
Q = {'TL': (0, 0, 768, 512), 'TR': (768, 0, 1536, 512),
     'BL': (0, 512, 768, 1024), 'BR': (768, 512, 1536, 1024)}


def load(key, box=None):
    im = Image.open(os.path.join(SRC, FILES[key])).convert('RGB')
    if box: im = im.crop(box)
    return np.asarray(im).astype(np.float32)


def label_anchors(a, labelcut, ytop=42):
    sat = a.max(2) - a.min(2)
    m = sat > 45
    m[:, labelcut:] = False
    m[:ytop, :] = False
    rp = m.sum(1)
    bands, start = [], None
    for i, v in enumerate(rp > 1):
        if v and start is None: start = i
        elif not v and start is not None:
            if i - start >= 6: bands.append((start, i))
            start = None
    if start is not None: bands.append((start, len(rp)))
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < 22: merged[-1] = (merged[-1][0], b[1])
        else: merged.append(b)
    return [(b[0] + b[1]) // 2 for b in merged]


def ksplit_cols(m, k, minsep=36):
    p = uniform_filter1d(m.sum(0).astype(np.float32), 7)
    nz = np.where(p > 0.5)[0]
    if len(nz) == 0: return []
    xa, xb = int(nz[0]), int(nz[-1])
    cands = [i for i in range(xa + minsep // 2, xb - minsep // 2)
             if p[i] <= p[i - 1] and p[i] <= p[i + 1]]
    cands.sort(key=lambda i: p[i])
    chosen = []
    for i in cands:
        if all(abs(i - j) >= minsep for j in chosen): chosen.append(i)
        if len(chosen) == k - 1: break
    chosen.sort()
    cuts = [xa] + chosen + [xb + 1]
    out = []
    for a0, a1 in zip(cuts[:-1], cuts[1:]):
        seg = m[:, a0:a1]
        xs = np.where(seg.any(0))[0]
        if len(xs) > 2: out.append((a0 + int(xs[0]), a0 + int(xs[-1]) + 1))
    return out


def alpha_extract(a, box):
    x0, y0, x1, y1 = [int(v) for v in box]
    crop = a[y0:y1, x0:x1]
    sat = crop.max(2) - crop.min(2)
    border = np.concatenate([a[0:4].reshape(-1, 3), a[-4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.abs(crop - bg).sum(2)
    mask = (dist > 70) | (sat > 55)
    mask = binary_closing(mask, iterations=2)
    mask = binary_dilation(mask, iterations=1)
    mask = binary_fill_holes(mask)
    mask = binary_opening(mask, iterations=1)
    lab, n = cclabel(mask)
    if n == 0: return None
    H, W = mask.shape
    cx0, cx1 = int(W * 0.25), int(W * 0.75)
    scores = [(lab == i)[:, cx0:cx1].sum() for i in range(1, n + 1)]
    mask = binary_fill_holes(lab == int(np.argmax(scores)) + 1)
    # The neighbour figure above sometimes fuses into the component through a
    # pixel-thin bridge (its feet touch this figure's head). Detect the
    # narrowest row in the upper half; if real mass hangs above it, cut there.
    w = mask.sum(1)
    ys = np.where(w > 0)[0]
    if len(ys):
        top, bot = int(ys[0]), int(ys[-1])
        span = bot - top
        if span > 30:
            zone = range(top + 3, top + int(span * 0.55))
            total = int(w.sum())
            best = None
            for y in zone:
                if w[y] <= 6:
                    above = int(w[top:y].sum())
                    if 0.02 * total < above < 0.4 * total:
                        best = y
            if best is not None:
                mask[:best] = False
    rgba = np.dstack([crop.astype(np.uint8), (mask * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getbbox()
    return img.crop(bb) if bb else img


# panel: (sheet, quadrant, labelcut, per-row frame counts, picks {frame:(row,idx)})
PANELS = {
    'vex':     ('chars', 'TL', 118, [5, 5, 5, 5, 4, 4, 4],
                {'idle': (0, 0), 'aim': (1, 0), 'fire0': (2, 0), 'fire1': (2, 1),
                 'fire2': (2, 2), 'die': (6, -1)}),
    'bruiser': ('chars', 'TR', 118, [4, 4, 4, 4, 3, 4, 3], {'aim': (1, 0), 'fire': (2, 1)}),
    'ghost':   ('chars', 'BL', 132, [4, 4, 4, 4, 4, 4, 3], {'aim': (1, 0), 'fire': (2, 2)}),
    'doc':     ('chars', 'BR', 118, [4, 4, 4, 3, 3, 3, 4], {'aim': (1, 0), 'fire': (2, 1)}),
    'walker':  ('zomA', 'TL', 112, [6, 6, 6, 3, 2, 4],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (4, 0),
                 'die0': (5, -2), 'die1': (5, -1)}),
    'runner':  ('zomA', 'TR', 112, [4, 6, 3, 2, 4],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (3, 0),
                 'die0': (4, -2), 'die1': (4, -1)}),
    'brute':   ('zomA', 'BL', 112, [5, 6, 3, 2, 4],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (3, 0),
                 'die0': (4, -2), 'die1': (4, -1)}),
    'spitter': ('zomA', 'BR', 112, [5, 6, 3, 2, 4],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (3, 0),
                 'die0': (4, -2), 'die1': (4, -1)}),
    'boomer':  ('zomB', 'TL', 132, [1, 6, 6, 3, 2, 5],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (4, 0),
                 'die0': (5, 1), 'die1': (5, -2)}),
    'crawler': ('zomB', 'BL', 132, [2, 6, 6, 3, 2, 4],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (4, 0),
                 'die0': (5, -2), 'die1': (5, -1)}),
    'boss':    ('zomB', 'BR', 112, [4, 6, 3, 6, 2, 5],
                {'walk0': (1, 0), 'walk1': (1, 2), 'walk2': (1, 4), 'hit': (4, 0),
                 'die0': (5, -2), 'die1': (5, -1)}),
}
# Vex take-hit row frames are fused with blood splats; use a measured box.
VEX_HIT_BOX = (150, 300, 240, 380)


def extract_panels():
    frames = {}
    for pname, (sheet, quad, cut, counts, picks) in PANELS.items():
        a = load(sheet, Q[quad])
        H = a.shape[0]
        anchors = label_anchors(a, cut)
        if len(anchors) != len(counts):
            print(f'warning: {pname}: {len(anchors)} label rows, expected {len(counts)}')
        cuts = [42] + [(anchors[i] + anchors[i + 1]) // 2 for i in range(len(anchors) - 1)] + [H]
        bands = [(cuts[i], min(H, cuts[i + 1] + 16)) for i in range(len(anchors))]
        border = np.concatenate([a[0:4].reshape(-1, 3), a[-4:].reshape(-1, 3)])
        bg = np.median(border, axis=0)
        m = np.abs(a - bg).sum(2) > 70
        m[:, :cut] = False
        rowframes = []
        for ri, (y0, y1) in enumerate(bands):
            k = counts[ri] if ri < len(counts) else 4
            cols = ksplit_cols(m[y0:y1], k)
            rowframes.append([(x0, y0, x1, y1) for x0, x1 in cols])
        out = {}
        for name, (ri, fi) in picks.items():
            row = rowframes[ri] if ri < len(rowframes) else []
            if not row:
                print(f'warning: {pname}.{name}: empty row'); continue
            fi = fi if fi >= 0 else len(row) + fi
            fi = max(0, min(fi, len(row) - 1))
            x0, y0, x1, y1 = row[fi]
            img = alpha_extract(a, (max(0, x0 - 4), max(0, y0 - 4),
                                    min(a.shape[1], x1 + 4), min(H, y1 + 4)))
            if img is None:
                print(f'warning: {pname}.{name}: no component'); continue
            out[name] = img
        frames[pname] = out
    frames['vex']['hit'] = alpha_extract(load('chars', Q['TL']), VEX_HIT_BOX)
    return frames


def pack(entities, path, foot_pad=4):
    """Shelf-pack {entity:{frame:img}} bottom-aligned; return atlas rects."""
    atlas, shelves = {}, []
    y = 0
    for ent, fr in entities.items():
        row_h = max(im.size[1] for im in fr.values()) + foot_pad
        x = 0
        placed = {}
        for name, im in fr.items():
            placed[name] = (x, im)
            x += im.size[0] + 2
        shelves.append((ent, y, row_h, placed))
        y += row_h + 2
    W = max(sum(im.size[0] + 2 for _, im in sh[3].values()) for sh in shelves)
    sheet = Image.new('RGBA', (W, y), (0, 0, 0, 0))
    for ent, sy, row_h, placed in shelves:
        atlas[ent] = {}
        for name, (sx, im) in placed.items():
            py = sy + row_h - foot_pad - im.size[1]
            sheet.paste(im, (sx, py), im)
            atlas[ent][name] = [sx, sy, im.size[0], row_h]
    sheet.save(path)
    return atlas, {'footPad': foot_pad}


# Straight rect crops (dark-background icon cells, drawn with 'screen' blend).
WEAPON_BOXES = {  # order matches WEAPONS in js/game.js
    'pistol': (12, 88, 178, 222), 'smg': (190, 95, 350, 222),
    'shotgun': (360, 95, 528, 222), 'rifle': (12, 268, 178, 400),
    'minigun': (188, 268, 352, 400), 'plasma': (360, 268, 528, 400),
}
POWERUP_BOXES = {  # glowing bottom row of G9; keys = in-game power-up types
    'health': (12, 635, 108, 748), 'damage': (115, 635, 215, 748),
    'nuke': (222, 635, 312, 748), 'shield': (316, 635, 406, 748),
    'rapid': (410, 635, 505, 748), 'gunner': (515, 635, 610, 748),
}


def pack_icons(sheetkey, boxes, path, cell):
    a = load(sheetkey)
    cw, ch = cell
    sheet = Image.new('RGB', (cw * len(boxes), ch), (8, 8, 10))
    atlas = {}
    for i, (name, (x0, y0, x1, y1)) in enumerate(boxes.items()):
        crop = Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8))
        crop.thumbnail((cw - 6, ch - 6))
        cx = i * cw + (cw - crop.size[0]) // 2
        cy = (ch - crop.size[1]) // 2
        sheet.paste(crop, (cx, cy))
        atlas[name] = [i * cw, 0, cw, ch]
    sheet.save(path)
    return atlas


MAPS = [  # (name, sheet, box, label)
    ('city',     'mapsA', (8, 100, 753, 344),  'CITY STREETS'),
    ('forest',   'mapsA', (780, 400, 1528, 648), 'FOREST ROAD'),
    ('bridge',   'mapsA', (780, 700, 1528, 1010), 'BRIDGE OVERPASS'),
    ('subway',   'mapsA', (780, 100, 1528, 344), 'ABANDONED SUBWAY'),
    ('factory',  'mapsA', (8, 700, 753, 1010), 'INDUSTRIAL FACTORY'),
    ('military', 'mapsA', (8, 400, 753, 648),  'MILITARY BASE'),
    ('sewer',    'mapsB', (0, 45, 720, 250),   'SEWER TUNNELS'),
    ('hospital', 'mapsB', (0, 300, 720, 497),  'HOSPITAL CORRIDOR'),
    ('helipad',  'mapsB', (0, 545, 720, 700),  'ROOFTOP HELIPAD'),
]


def build_maps():
    entries = []
    for name, sheet, box, title in MAPS:
        a = load(sheet, box)
        img = Image.fromarray(a.astype(np.uint8))
        img.save(os.path.join(OUT_M, f'map_{name}.jpg'), quality=82)
        # ground tint from the bottom rows, darkened for the play-field gradient
        bottom = a[int(a.shape[0] * 0.85):].reshape(-1, 3).mean(0)
        def hexc(rgb, mul):
            return '#%02x%02x%02x' % tuple(int(max(0, min(255, c * mul))) for c in rgb)
        entries.append({'name': name, 'title': title, 'file': f'assets/maps/map_{name}.jpg',
                        'groundTop': hexc(bottom, 0.55), 'groundBottom': hexc(bottom, 0.28)})
    return entries


def main():
    frames = extract_panels()
    player_atlas, meta = pack({'vex': frames['vex']}, os.path.join(OUT_S, 'player.png'))
    allies_atlas, _ = pack({k: frames[k] for k in ('bruiser', 'ghost', 'doc')},
                           os.path.join(OUT_S, 'allies.png'))
    zombies_atlas, _ = pack({k: frames[k] for k in ('walker', 'runner', 'brute', 'spitter',
                                                    'boomer', 'crawler', 'boss')},
                            os.path.join(OUT_S, 'zombies.png'))
    weapons_atlas = pack_icons('wfx', WEAPON_BOXES, os.path.join(OUT_S, 'weapons.png'), (120, 96))
    powerups_atlas = pack_icons('wfx', POWERUP_BOXES, os.path.join(OUT_S, 'powerups.png'), (96, 110))
    atlas = {
        'footPad': meta['footPad'],
        'player': player_atlas['vex'],
        'allies': allies_atlas,
        'zombies': zombies_atlas,
        'weapons': weapons_atlas,
        'powerups': powerups_atlas,
        'maps': build_maps(),
    }
    with open(os.path.join(OUT_S, 'atlas.js'), 'w') as f:
        f.write('// Generated by assets/build_sprites.py — do not edit by hand.\n')
        f.write('window.ATLAS = ' + json.dumps(atlas) + ';\n')
    print('atlas entities:', {k: len(v) if isinstance(v, dict) else 'x' for k, v in atlas.items()})


if __name__ == '__main__':
    main()
