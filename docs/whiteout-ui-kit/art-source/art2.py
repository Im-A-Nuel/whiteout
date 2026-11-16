import math, random
from PIL import Image
import art

W = (234, 241, 247)

def arrow_icon():
    rows = [
     "..........",
     "....WW....",
     "...WWWW...",
     "..WWWWWW..",
     ".WWWWWWWW.",
     "...WWWW...",
     "...WWWW...",
     "...WWWW...",
     "..........",
     "..........",
    ]
    im = Image.new('RGBA', (10, 10), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == 'W':
                im.putpixel((x, y), W + (255,))
    return im

def lock_icon():
    rows = [
     "..IIII..",
     ".I....I.",
     ".I....I.",
     "IIIIIIII",
     "IIIIIIII",
     "IIIOOIII",
     "IIIOOIII",
     "IIIIIIII",
    ]
    im = Image.new('RGBA', (8, 8), (0, 0, 0, 0))
    pal = {'I': (143, 180, 217, 255), 'O': (20, 16, 42, 255)}
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in pal:
                im.putpixel((x, y), pal[c])
    return im

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def fog_layer(seed, size=64, strength=1.0):
    rnd = random.Random(seed)
    waves = []
    for _ in range(7):
        kx = rnd.randint(1, 3); ky = rnd.randint(1, 3)
        waves.append((kx, ky, rnd.random() * 6.28, rnd.uniform(0.6, 1.0)))
    vals = [[0.0] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            v = 0.0
            for kx, ky, ph, amp in waves:
                v += amp * math.sin(2 * math.pi * (kx * x + ky * y) / size + ph)
            vals[y][x] = v
    flat = [v for r in vals for v in r]
    lo, hi = min(flat), max(flat)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            v = (vals[y][x] - lo) / (hi - lo)
            t = (BAYER[y % 4][x % 4] + 0.5) / 16.0
            lvl = 0
            if v > 0.80 + 0.12 * (t - 0.5): lvl = 3
            elif v > 0.62 + 0.18 * (t - 0.5): lvl = 2
            elif v > 0.46 + 0.22 * (t - 0.5): lvl = 1
            if lvl:
                a = int([0, 16, 30, 46][lvl] * strength)
                im.putpixel((x, y), (205, 220, 240, a))
    return im

def snow_layer(seed, size=64, n=16, big=4):
    rnd = random.Random(seed)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for i in range(n):
        x = rnd.randint(0, size - 2); y = rnd.randint(0, size - 2)
        w = 2 if i < big else 1
        for dx in range(w):
            for dy in range(w):
                im.putpixel(((x + dx) % size, (y + dy) % size), (240, 246, 252, 230 if w == 2 else 190))
    return im

def extras():
    out = {}
    out['arrow'] = art.b64(arrow_icon())
    out['lock'] = art.b64(lock_icon())
    out['fogA'] = art.b64(fog_layer(5))
    out['fogB'] = art.b64(fog_layer(11, strength=0.8))
    out['snowA'] = art.b64(snow_layer(2, n=14, big=5))
    out['snowB'] = art.b64(snow_layer(8, n=22, big=0))
    return out

def all_art():
    a = art.build()
    a.update(extras())
    return a

if __name__ == '__main__':
    a = all_art()
    print(len(a), sum(len(v) for v in a.values()))
    # test fog preview over a dark bg
    S = 6
    bg = Image.new('RGBA', (64 * S, 64 * S), (21, 24, 49, 255))
    fl = fog_layer(5).resize((64 * S, 64 * S), Image.NEAREST)
    bg.alpha_composite(fl)
    sn = snow_layer(2, n=14, big=5).resize((64 * S, 64 * S), Image.NEAREST)
    bg.alpha_composite(sn)
    bg.save('fogtest.png')
