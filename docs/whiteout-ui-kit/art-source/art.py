import base64, io, random
from PIL import Image

PAL = {
    '.': None,
    'O': (20, 16, 42),      # outline
    'R': (214, 66, 58),     # cloak red
    'D': (150, 40, 53),     # cloak shade
    'S': (242, 201, 160),   # skin
    'W': (234, 241, 247),   # snow white
    'G': (166, 184, 205),   # white shade
    'B': (90, 61, 49),      # boot
    'K': (156, 111, 68),    # wood
    'Y': (255, 181, 71),    # amber
    'L': (255, 233, 168),   # bright amber
    'F': (242, 107, 58),    # flame orange
    'g': (242, 193, 78),    # gold
    'h': (184, 134, 43),    # gold dark
    'j': (255, 240, 190),   # gold light
    'i': (143, 180, 217),   # ice
    'I': (200, 228, 247),   # ice light
    'n': (74, 82, 120),     # stone
    'N': (94, 104, 143),    # stone light
    'm': (56, 62, 94),      # stone dark
    'M': (38, 42, 70),      # stone darker
    'z': (10, 11, 26),      # hole
    'x': (21, 24, 49),      # fog base
    'X': (29, 33, 66),      # fog noise
    'p': (110, 70, 58),     # temple pillar
    'P': (150, 52, 52),     # temple red
    'q': (74, 40, 44),      # temple red dark
}

def mk(rows, name=''):
    for i, r in enumerate(rows):
        assert len(r) == len(rows[0]), (name, i, len(r), len(rows[0]))
    return rows

def img_from(rows):
    h = len(rows); w = len(rows[0])
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            v = PAL[c]
            if v is not None:
                im.putpixel((x, y), v + (255,))
    return im

def b64(im):
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---------- pilgrim (16x16), facing right ----------
pil_side_a = mk([
 "................",
 ".....OOOOO......",
 "....ORRRRRO.....",
 "...ORRRRRRRO....",
 "...ORRRRRSSO....",
 "...ORRRRSOSSO...",
 "...ORRRRSSSSO...",
 "....OWWWWWWO....",
 "...OWWRRRRRWO.OO",
 "...ORRRRRRRRKOLY",
 "...ORRRRRRRRKOYY",
 "...ODRRRRRRDKO.O",
 "....ODDDDDDDO...",
 "....OBBO.OBBO...",
 "...OBBBO.OBBBO..",
 "...OOOOO.OOOOO..",
], 'side_a')

pil_side_b = mk([
 "................",
 ".....OOOOO......",
 "....ORRRRRO.....",
 "...ORRRRRRRO....",
 "...ORRRRRSSO....",
 "...ORRRRSOSSO...",
 "...ORRRRSSSSO...",
 "....OWWWWWWO....",
 "...OWWRRRRRWO.OO",
 "...ORRRRRRRRKOLY",
 "...ORRRRRRRRKOYY",
 "...ODRRRRRRDKO.O",
 "....ODDDDDDDO...",
 ".....OBBOBBO....",
 ".....OBBBBBBO...",
 ".....OOOOOOOO...",
], 'side_b')

pil_down_a = mk([
 "................",
 ".....OOOOOO.....",
 "....ORRRRRRO....",
 "...ORRRRRRRRO...",
 "...ORRSSSSRRO...",
 "...ORSOSSOSRO...",
 "...ORSSSSSSRO...",
 "....OWWWWWWO....",
 "...OWWRRRRWWO...",
 "...ORRRRRRRRO.YY",
 "..OORRRRRRRROKLY",
 "..OSORRRRRRODKYY",
 "...OODDDDDDOK.YY",
 "....OBBOOBBO....",
 "...OBBBOOBBBO...",
 "...OOOOOOOOOO...",
], 'down_a')

pil_down_b = mk([
 "................",
 "................",
 ".....OOOOOO.....",
 "....ORRRRRRO....",
 "...ORRRRRRRRO...",
 "...ORRSSSSRRO...",
 "...ORSOSSOSRO...",
 "...ORSSSSSSRO...",
 "....OWWWWWWO....",
 "...OWWRRRRWWO.YY",
 "..OORRRRRRRROKLY",
 "..OSORRRRRRODKYY",
 "...OODDDDDDOK.YY",
 "....OBBOOBBO....",
 "...OBBBOOBBBO...",
 "...OOOOOOOOOO...",
], 'down_b')

# ---------- dead / lost pilgrim (for reveal): collapsed in snow ----------
pil_fallen = mk([
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "......OOOO......",
 "...OOORRRROOO...",
 "..OWWRRRRRRRWO..",
 ".ORRRRRRRRRRRRO.",
 ".ODDRRRRRRRRDDO.",
 "..OOOSSOODDOOO..",
 "...WWWWWWWWWW...",
 "..WWWWWWWWWWWW..",
], 'fallen')

# ---------- flame frames (16x16), brazier ----------
def brazier(fr):
    base = [
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "....OOOOOOOO....",
     "...OmnNNNNnmO...",
     "...OmnnnnnnmO...",
     "....OOmnnmOO....",
     ".....OmnnmO.....",
     ".....OmnnmO.....",
     "....OmnnnnmO....",
     "...OmNnnnnNmO...",
     "...OOOOOOOOOO...",
    ]
    flames = [
     ["................", "................", "................", ".......F........", "......FFF.......", ".....FFYFF......", ".....FYLYF......", "....OFYLYFO....."],
     ["................", "................", "................", "......F.F.......", "......FFF.......", ".....FFYFF......", ".....FYLYFF.....", "....OFYLYFO....."],
     ["................", "................", "................", ".......F........", ".......FF.......", "......FFYF......", ".....FFYLYF.....", "....OFYLYFO....."],
    ][fr]
    rows = flames + base[8:]
    return mk(rows, 'brazier')

# ---------- procedural tiles ----------
def floor_tile(seed, crack=False, snow=0.0):
    rnd = random.Random(seed)
    rows = [['n'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            r = rnd.random()
            if r < 0.10: rows[y][x] = 'N'
            elif r < 0.18: rows[y][x] = 'm'
    for i in range(16):
        rows[0][i] = 'm'; rows[i][0] = 'm'
        rows[15][i] = 'M'; rows[i][15] = 'M'
    for i in range(1, 15):
        rows[1][i] = 'N' if rows[1][i] != 'm' else 'N'
        rows[i][1] = 'N'
    if crack:
        pts = [(4, 3), (5, 4), (5, 5), (6, 6), (7, 6), (8, 7), (8, 8), (9, 9), (10, 9), (11, 10)]
        for x, y in pts: rows[y][x] = 'M'
    n = int(snow * 40)
    for _ in range(n):
        x = rnd.randint(2, 13); y = rnd.randint(2, 13)
        rows[y][x] = 'W' if rnd.random() < 0.6 else 'G'
    return mk([''.join(r) for r in rows], 'floor')

def overlay(base, over):
    out = []
    for a, b in zip(base, over):
        out.append(''.join(bc if bc != '.' else ac for ac, bc in zip(a, b)))
    return out

pit_over = mk([
 "................",
 "................",
 "....iIi..i......",
 "...iOOOOOOi.....",
 "..iOzzzzzzOi....",
 "..IOzzzzzzzOi...",
 "..iOzzzzzzzOI...",
 "..iOzzzzzzzOi...",
 "...OzzzzzzOi....",
 "...iOzzzzOi.....",
 "....iOOOOi.i....",
 ".....i..I.......",
 "................",
 "................",
 "................",
 "................",
], 'pit')

relic_over = mk([
 "................",
 "................",
 ".......jj.......",
 "......jggh......",
 ".....jggggh.....",
 "....jgggggph....",
 ".....jggggh.....",
 "......hggh......",
 ".....OhhhhO.....",
 "....OgghhggO....",
 "...OgggggggO....",
 "...OhhhhhhhhO...",
 "....OOOOOOOO....",
 "................",
 "................",
 "................",
], 'relic')
relic_over = [r.replace('p', 'g') for r in relic_over]

gate_tile = mk([
 "OOOOOOOOOOOOOOOO",
 "OWWWWWWWWWWWWWWO",
 "OPPPPPPPPPPPPPPO",
 "OqqqqqqqqqqqqqqO",
 ".OPPPPPPPPPPPPO.",
 ".OOqOOOOOOOOqOO.",
 "..OPO......OPO..",
 "..OPO......OPO..",
 "..OPO......OPO..",
 "..OqO..LL..OqO..",
 "..OPO.LYYL.OPO..",
 "..OPO.LYYL.OPO..",
 "..OPO.OLLO.OPO..",
 "..OPO......OPO..",
 ".OOPOO....OOPOO.",
 "OOOOOOOOOOOOOOOO",
], 'gate')

flag_over = mk([
 "................",
 "................",
 "......KKKK......",
 "......KRRRRO....",
 "......KRDRRRO...",
 "......KRRRRO....",
 "......KRRDO.....",
 "......K.........",
 "......K.........",
 "......K.........",
 "......K.........",
 ".....KKK........",
 "................",
 "................",
 "................",
 "................",
], 'flag')

# question mark glyph tile overlay
q_over = mk([
 "................",
 "................",
 "......IIII......",
 ".....IiiiiI.....",
 "....II....II....",
 "...........II...",
 "..........II....",
 ".........II.....",
 "........II......",
 "........II......",
 "................",
 "........II......",
 "........II......",
 "................",
 "................",
 "................",
], 'q')

def fog_tile(seed):
    rnd = random.Random(seed)
    rows = [['x'] * 16 for _ in range(16)]
    for _ in range(30):
        x = rnd.randint(0, 15); y = rnd.randint(0, 15)
        rows[y][x] = 'X'
    return mk([''.join(r) for r in rows], 'fog')

# wall/frame tiles
wall_h = mk([
 "MMMMMMMMMMMMMMMM",
 "mNNNNNNNmNNNNNNm",
 "mnnnnnnnmnnnnnnm",
 "mnnnnnnnmnnnnnnm",
 "MMMMMMMMMMMMMMMM",
 "NNNNmNNNNNNNmNNN",
 "nnnnmnnnnnnnmnnn",
 "nnnnmnnnnnnnmnnn",
 "MMMMMMMMMMMMMMMM",
 "mNNNNNNNmNNNNNNm",
 "mnnnnnnnmnnnnnnm",
 "mnnnnnnnmnnnnnnm",
 "MMMMMMMMMMMMMMMM",
 "NNNNmNNNNNNNmNNN",
 "nnnnmnnnnnnnmnnn",
 "MMMMMMMMMMMMMMMM",
], 'wall')
wall_snow = mk([
 "................",
 "..WW....WWW.....",
 ".WWWW..WWWWW.WW.",
 "WWWWWWWWWWWWWWWW",
 "GGGGWGGGGGGWGGGG",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
], 'wallsnow')

# marker for tile selection/neighbour hint (corners)
hint_over = mk([
 "LL............LL",
 "L..............L",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "................",
 "L..............L",
 "LL............LL",
], 'hint')

# ---------- HUD icons (12x12) ----------
lantern_icon = mk([
 "....OOOO....",
 "...O.KK.O...",
 "..OOOOOOOO..",
 "..OYYLLYYO..",
 "..OYLLLLYO..",
 "..OYLLLLYO..",
 "..OYLLLLYO..",
 "..OYYLLYYO..",
 "..OOOOOOOO..",
 "...OhhhhO...",
 "............",
 "............",
], 'lantern')

relic_icon = mk([
 "............",
 ".....jj.....",
 "....jggh....",
 "...jggggh...",
 "..jgggggph..",
 "...jggggh...",
 "....hggh....",
 "...OhhhhO...",
 "..OgghhggO..",
 "..OhhhhhhO..",
 "...OOOOOO...",
 "............",
], 'relicicon')
relic_icon = [r.replace('p', 'g') for r in relic_icon]

cold_icon = mk([
 ".....II.....",
 "..I..II..I..",
 "...I.II.I...",
 "....IiiI....",
 "II.iIIIIi.II",
 ".IIIiIIiIII.",
 ".IIIiIIiIII.",
 "II.iIIIIi.II",
 "....IiiI....",
 "...I.II.I...",
 "..I..II..I..",
 ".....II.....",
], 'cold')

glint_icon = mk([
 ".....g......",
 ".....g......",
 "....jgg.....",
 "....jgg.....",
 "..gjjjjggg..",
 "ggjjjjjjjggg",
 "..gjjjjggg..",
 "....jgg.....",
 "....jgg.....",
 ".....g......",
 "..g.....g...",
 "............",
], 'glint')

foot_icon = mk([
 "............",
 "...II..II...",
 "..IIII.IIII.",
 "..IIII.IIII.",
 "..IIII.IIII.",
 "...II...II..",
 "............",
 "...II..II...",
 "..IIII.IIII.",
 "...II...II..",
 "............",
 "............",
], 'foot')

def sheet(frames):
    w = len(frames[0][0]); h = len(frames[0])
    im = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(img_from(f), (i * w, 0))
    return im

def tile(rows_under, rows_over=None):
    base = rows_under if rows_over is None else overlay(rows_under, rows_over)
    return img_from(base)

def build():
    f1 = floor_tile(3, snow=0.10)
    f2 = floor_tile(9, snow=0.05)
    f3 = floor_tile(17, crack=True, snow=0.08)
    art = {}
    art['floor1'] = b64(img_from(f1))
    art['floor2'] = b64(img_from(f2))
    art['floor3'] = b64(img_from(f3))
    art['fog1'] = b64(img_from(fog_tile(1)))
    art['fog2'] = b64(img_from(fog_tile(2)))
    art['pit'] = b64(img_from(overlay(f1, pit_over)))
    art['relic'] = b64(img_from(overlay(f2, relic_over)))
    art['gate'] = b64(img_from(gate_tile))
    art['flag'] = b64(img_from(overlay(f2, flag_over)))
    art['flagOver'] = b64(img_from(flag_over))
    art['qOver'] = b64(img_from(q_over))
    art['hint'] = b64(img_from(hint_over))
    art['relicOver'] = b64(img_from(relic_over))
    art['wallH'] = b64(img_from(wall_h))
    art['wallSnow'] = b64(img_from(wall_snow))
    art['pilSideSheet'] = b64(sheet([pil_side_a, pil_side_b]))
    art['pilDownSheet'] = b64(sheet([pil_down_a, pil_down_b]))
    art['pilFallen'] = b64(img_from(pil_fallen))
    art['brazierSheet'] = b64(sheet([brazier(0), brazier(1), brazier(2)]))
    art['lantern'] = b64(img_from(lantern_icon))
    art['relicIcon'] = b64(img_from(relic_icon))
    art['coldIcon'] = b64(img_from(cold_icon))
    art['glintIcon'] = b64(img_from(glint_icon))
    art['footIcon'] = b64(img_from(foot_icon))
    return art

if __name__ == '__main__':
    import sys
    # preview sheet
    S = 8
    items = [
        img_from(floor_tile(3, snow=0.10)), img_from(floor_tile(9, snow=0.05)), img_from(floor_tile(17, crack=True, snow=0.08)),
        img_from(fog_tile(1)), img_from(overlay(floor_tile(3, snow=0.10), pit_over)), img_from(overlay(floor_tile(9, snow=0.05), relic_over)),
        img_from(gate_tile), img_from(overlay(floor_tile(9, snow=0.05), flag_over)), img_from(wall_h),
        img_from(pil_side_a), img_from(pil_side_b), img_from(pil_down_a), img_from(pil_down_b), img_from(pil_fallen),
        img_from(brazier(0)), img_from(brazier(1)), img_from(brazier(2)),
    ]
    cols = 6
    rows = (len(items) + cols - 1) // cols
    sheet_im = Image.new('RGBA', (cols * 16 * S + 8 * (cols + 1), rows * 16 * S + 8 * (rows + 1)), (60, 70, 110, 255))
    for i, it in enumerate(items):
        big = it.resize((16 * S, 16 * S), Image.NEAREST)
        x = 8 + (i % cols) * (16 * S + 8); y = 8 + (i // cols) * (16 * S + 8)
        sheet_im.alpha_composite(big, (x, y))
    sheet_im.save(sys.argv[1] if len(sys.argv) > 1 else 'preview.png')
    icons = [lantern_icon, relic_icon, cold_icon, glint_icon, foot_icon]
    iw = Image.new('RGBA', (len(icons) * (12 * S + 8) + 8, 12 * S + 16), (60, 70, 110, 255))
    for i, ic in enumerate(icons):
        iw.alpha_composite(img_from(ic).resize((12 * S, 12 * S), Image.NEAREST), (8 + i * (12 * S + 8), 8))
    iw.save('icons.png')
    print('ok')
