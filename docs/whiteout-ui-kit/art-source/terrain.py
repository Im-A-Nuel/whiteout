import random
import art
from art import PAL, mk, img_from, overlay, b64, floor_tile, pit_over, relic_over

PAL.update({
    'c': (66, 108, 158),    # ice base
    'C': (104, 150, 200),   # ice light
    'v': (48, 84, 130),     # ice deep
    'e': (50, 46, 70),      # soil
    'E': (68, 62, 92),      # soil light
    'a': (46, 92, 82),      # grass
    'A': (74, 132, 108),    # grass light
    't': (118, 88, 72),     # twig
    'k': (126, 86, 58),     # plank
    'u': (80, 54, 42),      # plank dark
    'U': (160, 114, 72),    # plank light
    'Z': (26, 28, 58),      # chasm
    'c1': None,
})
del PAL['c1']
PAL.update({
    'r': (150, 52, 56),     # carpet
    'T': (112, 36, 46),     # carpet dark
    'H': (200, 150, 54),    # carpet gold
    'd': (84, 90, 130),     # sanct stone
})

def noisy(seed, base, specks, w=16, h=16):
    rnd = random.Random(seed)
    rows = [[base] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r = rnd.random(); acc = 0
            for ch, p in specks:
                acc += p
                if r < acc:
                    rows[y][x] = ch; break
    return rows

def seams(rows, dark, light):
    for i in range(16):
        rows[0][i] = dark; rows[i][0] = dark
        rows[15][i] = dark; rows[i][15] = dark
    for i in range(1, 15):
        rows[1][i] = light; rows[i][1] = light
    return rows

def ice_tile(seed, crack):
    rows = noisy(seed, 'c', [('C', .12), ('v', .08)])
    rows = seams(rows, 'v', 'C')
    rnd = random.Random(seed + 100)
    # shine diagonal
    for k in range(4):
        x = 3 + k; y = 11 - k
        rows[y][x] = 'I'
    if crack:
        x, y = rnd.randint(3, 6), rnd.randint(3, 5)
        for _ in range(9):
            rows[y][x] = 'W'
            x += rnd.choice([0, 1, 1]); y += rnd.choice([0, 1, 1])
            x = min(x, 13); y = min(y, 13)
    return mk([''.join(r) for r in rows], 'ice')

def garden_tile(seed, tufts):
    rows = noisy(seed, 'e', [('E', .14), ('a', .05)])
    rows = seams(rows, 'e', 'E')
    rnd = random.Random(seed + 7)
    # snow patches
    for _ in range(3):
        cx, cy = rnd.randint(3, 12), rnd.randint(3, 12)
        for dx in range(-2, 3):
            for dy in range(-1, 2):
                if abs(dx) + abs(dy) * 2 <= 3 and 1 < cx + dx < 15 and 1 < cy + dy < 15:
                    rows[cy + dy][cx + dx] = 'W' if dy <= 0 else 'G'
    for _ in range(tufts):
        x, y = rnd.randint(3, 12), rnd.randint(3, 12)
        rows[y][x] = 'A'; rows[y - 1][x] = 'a'
    return mk([''.join(r) for r in rows], 'garden')

def plank_tile(seed, flip):
    rows = [['k'] * 16 for _ in range(16)]
    rnd = random.Random(seed)
    for y in range(16):
        band = y // 4
        for x in range(16):
            if y % 4 == 3:
                rows[y][x] = 'u'
            elif y % 4 == 0:
                rows[y][x] = 'U'
            else:
                rows[y][x] = 'k' if rnd.random() > 0.15 else 'u'
    # board ends offset per band
    for band in range(4):
        off = (band * 5 + seed) % 12 + 2
        for y in range(band * 4, band * 4 + 4):
            rows[y][off] = 'u'
        rows[band * 4 + 1][off - 1] = 'G'; rows[band * 4 + 1][off + 1] = 'G'
    # chasm showing at the very edges
    for y in range(16):
        rows[y][0] = 'Z'; rows[y][15] = 'Z'
    return mk([''.join(r) for r in rows], 'plank')

def sanct_tile(variant):
    rows = [['r'] * 16 for _ in range(16)]
    for i in range(16):
        rows[0][i] = 'T'; rows[15][i] = 'T'; rows[i][0] = 'T'; rows[i][15] = 'T'
    for i in range(1, 15):
        rows[1][i] = 'H' if variant == 0 else 'T'
        rows[14][i] = 'H' if variant == 0 else 'T'
        rows[i][1] = 'H' if variant == 0 else 'T'
        rows[i][14] = 'H' if variant == 0 else 'T'
    if variant == 0:
        pts = [(7, 5), (8, 5), (6, 6), (9, 6), (5, 7), (10, 7), (6, 8), (9, 8), (7, 9), (8, 9)]
        for x, y in pts: rows[y][x] = 'H'
        rows[7][7] = 'h'; rows[7][8] = 'h'
    else:
        for y in range(3, 13):
            for x in range(3, 13):
                if (x + y) % 4 == 0: rows[y][x] = 'T'
        for y in (4, 11):
            for x in (4, 11): rows[y][x] = 'H'
    return mk([''.join(r) for r in rows], 'sanct')

def recolor(rows, mp):
    return [''.join(mp.get(c, c) for c in r) for r in rows]

pit_ice = recolor(pit_over, {'i': 'W', 'I': 'G', 'O': 'v'})
pit_garden = recolor(pit_over, {'i': 'E', 'I': 't', 'O': 'e'})

pit_plank = mk([
 "................",
 "................",
 "................",
 "..U.............",
 "..OOOOOOOOOOO...",
 ".OZZZZZZZZZZZOu.",
 ".OZZzzzzzzzzZZO.",
 ".OZzzzzzzzzzzZO.",
 ".OZzzzzzzzzzZZO.",
 ".OZZzzzzzzzZZZu.",
 "..OOZZZZZZZZOO..",
 "...K.UO..OU.....",
 "................",
 "................",
 "................",
 "................",
], 'pitplank')

pit_sanct = mk([
 "................",
 "................",
 "...hhhhhhhhhh...",
 "..hOOOOOOOOOOh..",
 "..hOzzzzzzzzOh..",
 "..hOzzzzzzzzOh..",
 "..hOzzzzzzzzOh..",
 "..hOzzzzzzzzOh..",
 "..hOzzzzzzzzOh..",
 "..hOOOOOOOOOOh..",
 "...hhhhhhhhhh...",
 "..H...........H.",
 "................",
 "................",
 "................",
 "................",
], 'pitsanct')

# ---- decor overlays (small, in a corner, never block the cell)
dec_tuft = mk([
 "................", "................", "................", "................", "................",
 "................", "................", "................", "................", "................",
 "................", "...WW...........", "..WWWW..........", ".WWWWWW.........", "GGGGGGG.........",
 "................",
], 'tuft')
dec_lantern = mk([
 "................", "..mm............", ".mnnm...........", "..mm............", "..mm............",
 ".OYYO...........", ".OYLO...........", ".OYYO...........", "..mm............", "..mm............",
 ".mnnm...........", "................", "................", "................", "................",
 "................",
], 'lantern')
dec_shrub = mk([
 "................", "................", "................", "...........t....", "..........t.t...",
 "..........tt....", ".........ttt.t..", "........Wtttt...", ".........tWtt...", "..........tt....",
 "..........tt....", "................", "................", "................", "................",
 "................",
], 'shrub')
dec_crystal = mk([
 "................", "................", "................", "................", "................",
 "................", "................", "................", "...........I....", "..........IIC...",
 ".......I..ICC...", "......IIC.ICCv..", "......ICCvICCv..", ".....vICCvvCCv..", "................",
 "................",
], 'crystal')
dec_post = mk([
 "................", "................", "................", "..K.............", "..U.............",
 "..U.............", "..U.............", "..U.............", "..U.............", "..U.............",
 "..u.............", "................", "................", "................", "................",
 "................",
], 'post')
dec_incense = mk([
 "................", "................", "................", "................", "................",
 "................", "...........I....", "............I...", "...........I....", "..........hhh...",
 ".........hgggh..", ".........OhhhO..", "................", "................", "................",
 "................",
], 'incense')

spark = mk([
 "..g..",
 "..j..",
 "gjjjg",
 "..j..",
 "..g..",
], 'spark')

ZONES = [
 "GCCCTTTT",
 "CCCCTTTT",
 "CCTTTIII",
 "CTTTIIII",
 "TTIIIIBB",
 "TIIIBBBS",
 "IIIBBSSS",
 "IIBBSSSS",
]
ZNAME = {'C': 'courtyard', 'G': 'courtyard', 'T': 'garden', 'I': 'ice', 'B': 'plank', 'S': 'sanct'}

def terrain_art():
    out = {}
    for i, (seed, crack, snow) in enumerate([(3, False, .10), (9, False, .05), (17, True, .08)]):
        out[f'courtyard{i+1}'] = b64(img_from(floor_tile(seed, crack=crack, snow=snow)))
    out['garden1'] = b64(img_from(garden_tile(21, 3)))
    out['garden2'] = b64(img_from(garden_tile(33, 5)))
    out['garden3'] = b64(img_from(garden_tile(45, 2)))
    out['ice1'] = b64(img_from(ice_tile(5, False)))
    out['ice2'] = b64(img_from(ice_tile(12, True)))
    out['ice3'] = b64(img_from(ice_tile(19, False)))
    out['plank1'] = b64(img_from(plank_tile(2, False)))
    out['plank2'] = b64(img_from(plank_tile(5, True)))
    out['sanct1'] = b64(img_from(sanct_tile(0)))
    out['sanct2'] = b64(img_from(sanct_tile(1)))
    out['pitcourtyard'] = b64(img_from(pit_over))
    out['pitgarden'] = b64(img_from(pit_garden))
    out['pitice'] = b64(img_from(pit_ice))
    out['pitplank'] = b64(img_from(pit_plank))
    out['pitsanct'] = b64(img_from(pit_sanct))
    out['decCourtyard'] = b64(img_from(dec_lantern))
    out['decCourtyard2'] = b64(img_from(dec_tuft))
    out['decGarden'] = b64(img_from(dec_shrub))
    out['decIce'] = b64(img_from(dec_crystal))
    out['decPlank'] = b64(img_from(dec_post))
    out['decSanct'] = b64(img_from(dec_incense))
    out['spark'] = b64(img_from(spark))
    return out

if __name__ == '__main__':
    from PIL import Image
    S = 6
    names = ['courtyard1', 'courtyard3', 'garden1', 'garden2', 'ice1', 'ice2', 'plank1', 'plank2', 'sanct1', 'sanct2']
    tiles = [
        floor_tile(3, snow=.1), floor_tile(17, crack=True, snow=.08), garden_tile(21, 3), garden_tile(33, 5),
        ice_tile(5, False), ice_tile(12, True), plank_tile(2, False), plank_tile(5, True), sanct_tile(0), sanct_tile(1),
        overlay(floor_tile(3, snow=.1), pit_over), overlay(garden_tile(21, 3), pit_garden), overlay(ice_tile(5, False), pit_ice),
        overlay(plank_tile(2, False), pit_plank), overlay(sanct_tile(0), pit_sanct),
        overlay(floor_tile(3, snow=.1), dec_lantern), overlay(garden_tile(21, 3), dec_shrub), overlay(ice_tile(5, False), dec_crystal),
        overlay(plank_tile(2, False), dec_post), overlay(sanct_tile(0), dec_incense),
    ]
    cols = 5
    rows_n = (len(tiles) + cols - 1) // cols
    im = Image.new('RGBA', (cols * (16 * S + 6) + 6, rows_n * (16 * S + 6) + 6), (40, 44, 80, 255))
    for i, t in enumerate(tiles):
        im.alpha_composite(img_from(t).resize((16 * S, 16 * S), Image.NEAREST), (6 + (i % cols) * (16 * S + 6), 6 + (i // cols) * (16 * S + 6)))
    im.save('terrain_preview.png')
    print(len(terrain_art()))
