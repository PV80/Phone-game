#!/usr/bin/env python3
"""Extract the protagonist animation frames from the uploaded sprite sheet and
pack them into assets/player.png (+ player.json). Background is removed with a
texture(local-variance)+saturation+background-difference mask, keeping the
component centred in each crop. Requires: Pillow, numpy, scipy.
Usage: python3 assets/extract_player.py path/to/source_sheet.png
"""
import sys, json
import numpy as np
from PIL import Image
from scipy.ndimage import (uniform_filter, binary_closing, binary_opening,
                           binary_fill_holes, label, binary_dilation)

SRC = sys.argv[1] if len(sys.argv) > 1 else 'source_sheet.png'
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)

def mask_center(crop, dil=1):
    a = crop.astype(np.float32); gray = a.mean(2); satm = a.max(2) - a.min(2)
    m = uniform_filter(gray, 5); m2 = uniform_filter(gray * gray, 5)
    var = np.clip(m2 - m * m, 0, None)
    bg = uniform_filter(gray, 31); diff = np.abs(gray - bg)
    mask = (var > 90) | (satm > 60) | (diff > 26)
    mask = binary_closing(mask, iterations=2); mask = binary_dilation(mask, iterations=dil)
    mask = binary_fill_holes(mask); mask = binary_opening(mask, iterations=1)
    lab, n = label(mask)
    if n == 0: return mask
    W = gray.shape[1]; cx0, cx1 = int(W * 0.32), int(W * 0.68)
    scores = [(lab == i)[:, cx0:cx1].sum() for i in range(1, n + 1)]
    return binary_fill_holes(lab == int(np.argmax(scores)) + 1)

def extract(box):
    x0, y0, x1, y1 = box; crop = im[y0:y1, x0:x1]; mask = mask_center(crop)
    rgba = np.dstack([crop.astype(np.uint8), (mask * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA'); bb = img.getbbox()
    return img.crop(bb) if bb else img

# Frame source rectangles on the 1024x1536 reference sheet (all face right).
BOXES = {
    'idle': (60, 120, 186, 338),
    'aim':  (700, 120, 852, 340),
    'fire': (548, 120, 700, 340),   # with muzzle flash
    'fire2':(852, 120, 1014, 340),
    'hit':  (694, 388, 838, 602),
    'die':  (486, 738, 700, 844),
}
ORDER = ['idle', 'aim', 'fire', 'fire2', 'hit', 'die']
CW, CH, PAD = 152, 224, 6

def place(img, w0):
    cell = Image.new('RGBA', (w0, CH), (0, 0, 0, 0)); w, h = img.size
    cell.paste(img, ((w0 - w) // 2, CH - PAD - h), img); return cell

frames = {k: extract(v) for k, v in BOXES.items()}
meta = {'cellH': CH, 'footPad': PAD, 'frames': {}}
x = 0; parts = []
for k in ORDER:
    w0 = CW if k != 'die' else CW + 56
    parts.append((place(frames[k], w0), x)); meta['frames'][k] = [x, 0, w0, CH]; x += w0
sheet = Image.new('RGBA', (x, CH), (0, 0, 0, 0))
for c, xx in parts: sheet.paste(c, (xx, 0), c)
sheet.save('assets/player.png'); json.dump(meta, open('assets/player.json', 'w'), indent=0)
print('wrote assets/player.png', sheet.size, 'frames:', list(meta['frames']))
