import os, random, math, json
import art2

A = art2.all_art()
OUT = '/tmp/claude-0/-home-claude/201de2be-94fb-55ea-b528-e8dbc60c1f0f/scratchpad/project'

# ---------------------------------------------------------------- shared css
CSS = """
body{margin:0}
.root{position:relative;overflow:hidden;box-sizing:border-box;color:#EAF1F7;font-family:'Pixelify Sans','Silkscreen',ui-monospace,monospace;font-size:16px;line-height:1.35;background:linear-gradient(#0E1029 0 30%,#12153A 30% 62%,#171B45 62% 100%)}
.root *{box-sizing:border-box}
.px{image-rendering:pixelated;image-rendering:crisp-edges}
.abs{position:absolute}
.snow{position:absolute;inset:0;pointer-events:none;z-index:2;image-rendering:pixelated;background-repeat:repeat}
.snowA{background-image:url(__SNOWA__);background-size:calc(var(--s)*64) calc(var(--s)*64);animation:snowA 9s linear infinite}
.snowB{background-image:url(__SNOWB__);background-size:calc(var(--s)*64) calc(var(--s)*64);animation:snowB 14s linear infinite;opacity:.8}
@keyframes snowA{to{background-position:calc(var(--s)*-64) calc(var(--s)*64)}}
@keyframes snowB{to{background-position:calc(var(--s)*32) calc(var(--s)*64)}}
.t{position:absolute;width:calc(var(--s)*16);height:calc(var(--s)*16);background-size:100% 100%;image-rendering:pixelated}
.floor1{background-image:url(__FLOOR1__)}
.floor2{background-image:url(__FLOOR2__)}
.floor3{background-image:url(__FLOOR3__)}
.fog1{background-image:url(__FOG1__)}
.fog2{background-image:url(__FOG2__)}
.pit{background-image:url(__PIT__)}
.relic{background-image:url(__RELIC__)}
.gate{background-image:url(__GATE__)}
.dim{filter:brightness(.62) saturate(.85)}
.ov{position:absolute;inset:0;background-size:100% 100%;image-rendering:pixelated}
.ov-flag{background-image:url(__FLAGOVER__)}
.ov-q{background-image:url(__QOVER__)}
.ov-hint{background-image:url(__HINT__);animation:blink 1.2s steps(1) infinite}
@keyframes blink{50%{opacity:.35}}
.taken{position:absolute;right:calc(var(--s)*1);bottom:calc(var(--s)*1);width:calc(var(--s)*12);height:calc(var(--s)*12);background:url(__RELICICON__) center/100% 100%;image-rendering:pixelated;opacity:.9}
.fogdrift{position:absolute;inset:0;pointer-events:none;background-repeat:repeat;image-rendering:pixelated;background-size:calc(var(--s)*64) calc(var(--s)*64)}
.fogA{background-image:url(__FOGA__);animation:fogA 40s linear infinite;opacity:.75}
.fogB{background-image:url(__FOGB__);animation:fogB 64s linear infinite;opacity:.35}
@keyframes fogA{to{background-position:calc(var(--s)*64) calc(var(--s)*-16)}}
@keyframes fogB{to{background-position:calc(var(--s)*-64) calc(var(--s)*24)}}
.pil{position:absolute;width:calc(var(--s)*16);height:calc(var(--s)*16);image-rendering:pixelated;z-index:6}
.pil .spr{position:absolute;inset:0;background-size:200% 100%;image-rendering:pixelated;animation:walk2 .6s steps(1) infinite}
.pil.side .spr{background-image:url(__PILSIDE__)}
.pil.down .spr{background-image:url(__PILDOWN__)}
.pil.bob{animation:bob 1.2s steps(1) infinite}
@keyframes walk2{0%{background-position:0 0}50%{background-position:100% 0}}
@keyframes bob{50%{transform:translateY(calc(var(--s)*-1))}}
.brazier{position:absolute;width:calc(var(--s)*16);height:calc(var(--s)*16);background:url(__BRAZIER__) 0 0/300% 100%;image-rendering:pixelated;animation:flame .45s steps(1) infinite;z-index:7}
@keyframes flame{0%{background-position:0 0}33.3%{background-position:50% 0}66.6%{background-position:100% 0}}
.glow{position:absolute;inset:0;pointer-events:none;z-index:4;animation:flick 2.4s steps(1) infinite}
@keyframes flick{0%,100%{opacity:1}30%{opacity:.82}55%{opacity:.94}80%{opacity:.76}}
.dot{position:absolute;width:calc(var(--s)*2);height:calc(var(--s)*2);background:#FF9B4A;box-shadow:0 0 0 calc(var(--s)*.5) #14102A;z-index:3}
.panel{position:relative;background:#1B1F42;margin:4px;box-shadow:0 -4px 0 0 #3A4180,0 4px 0 0 #3A4180,-4px 0 0 0 #3A4180,4px 0 0 0 #3A4180,0 8px 0 0 #0A0C20;padding:18px 20px}
.panel.stone{background:#232850}
.h2{margin:0;font-size:22px;font-weight:600;letter-spacing:.01em;color:#EAF1F7}
.sub{font-size:14px;color:#A9B6D6;line-height:1.35}
.muted{color:#A9B6D6}
.amber{color:#FFB547}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px}
.btn{font-family:inherit;font-size:18px;font-weight:600;color:#fff;background:#D6423A;border:0;margin:4px;padding:12px 22px;min-height:48px;cursor:pointer;box-shadow:inset 0 -4px 0 0 #8E2430,inset 0 4px 0 0 #F0806F,0 -4px 0 0 #14102A,0 4px 0 0 #14102A,-4px 0 0 0 #14102A,4px 0 0 0 #14102A}
.btn.alt{background:#2F3670;color:#EAF1F7;box-shadow:inset 0 -4px 0 0 #1B1F42,inset 0 4px 0 0 #4B54A3,0 -4px 0 0 #14102A,0 4px 0 0 #14102A,-4px 0 0 0 #14102A,4px 0 0 0 #14102A}
.btn.on{background:#FFB547;color:#14102A;box-shadow:inset 0 -4px 0 0 #B8782A,inset 0 4px 0 0 #FFD98A,0 -4px 0 0 #14102A,0 4px 0 0 #14102A,-4px 0 0 0 #14102A,4px 0 0 0 #14102A}
.btn.sm{font-size:15px;padding:8px 14px;min-height:44px}
.btn:hover{filter:brightness(1.12)}
.btn:active{transform:translateY(2px)}
.btn:focus-visible{outline:3px solid #FFB547;outline-offset:6px}
.key{width:56px;height:56px;padding:0;display:flex;align-items:center;justify-content:center;font-size:0}
.key img{width:20px;height:20px;image-rendering:pixelated}
.pip{width:12px;height:12px;display:inline-block}
.pip.on{background:#FFB547;box-shadow:inset 0 -3px 0 #F26B3A,0 0 0 2px #14102A}
.pip.off{background:#2A2F63;box-shadow:inset 0 -3px 0 #1E2250,0 0 0 2px #14102A}
.icon{image-rendering:pixelated;display:block}
.frame{position:relative;background:url(__WALLH__) 0 0/calc(var(--s)*16) calc(var(--s)*16);image-rendering:pixelated}
.snowcap{position:absolute;left:0;right:0;top:calc(var(--s)*-3);height:calc(var(--s)*8);background:url(__WALLSNOW__) 0 0/calc(var(--s)*16) calc(var(--s)*16) repeat-x;image-rendering:pixelated;z-index:5}
.pennants{display:flex;justify-content:space-between;position:relative;height:44px;margin:0 8px}
.pennants:before{content:'';position:absolute;left:0;right:0;top:4px;height:4px;background:#14102A}
.pn{width:24px;height:28px;margin-top:8px;clip-path:polygon(0 0,100% 0,50% 100%);animation:flap 1.6s steps(1) infinite}
@keyframes flap{50%{transform:translateY(4px) skewX(6deg)}}
.row{display:flex}
.hash{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;color:#C7D3EE}
@media (prefers-reduced-motion:reduce){.root *,.root:before{animation:none!important}}
"""

def css():
    m = {
        '__SNOWA__': A['snowA'], '__SNOWB__': A['snowB'], '__FLOOR1__': A['floor1'], '__FLOOR2__': A['floor2'],
        '__FLOOR3__': A['floor3'], '__FOG1__': A['fog1'], '__FOG2__': A['fog2'], '__PIT__': A['pit'],
        '__RELICICON__': A['relicIcon'], '__RELIC__': A['relic'], '__GATE__': A['gate'], '__FLAGOVER__': A['flagOver'],
        '__QOVER__': A['qOver'], '__HINT__': A['hint'], '__FOGA__': A['fogA'], '__FOGB__': A['fogB'],
        '__PILSIDE__': A['pilSideSheet'], '__PILDOWN__': A['pilDownSheet'], '__BRAZIER__': A['brazierSheet'],
        '__WALLH__': A['wallH'], '__WALLSNOW__': A['wallSnow'],
    }
    s = CSS
    for k, v in m.items():
        s = s.replace(k, v)
    return s

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500&display=swap">')

def page(title, body, extra_css='', w=1440, h=940, fluid=True):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>{css()}{extra_css}</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
"""

# ---------------------------------------------------------------- game data
PATH_LIVE = ['A1', 'A2', 'A3', 'A4', 'B4', 'B3', 'B2', 'C2', 'D2', 'E2']
PATH_FULL = PATH_LIVE + ['E1', 'D1', 'C1', 'B1', 'A1']
PITS = ['C3', 'E3', 'B5', 'G2', 'F5', 'D6', 'H7', 'E7']
RELICS = ['B4', 'C2', 'E1', 'D4', 'G5', 'A7']
TAKEN_LIVE = ['B4', 'C2']

def cr(cell):
    return ord(cell[0]) - 65, int(cell[1:]) - 1

def pos(cell):
    c, r = cr(cell)
    return f"left:calc(var(--s)*{16*c});top:calc(var(--s)*{16*r})"

def floor_cls(cell):
    c, r = cr(cell)
    if (c + r * 5) % 7 == 0: return 'floor3'
    return 'floor1' if (c * 3 + r) % 2 == 0 else 'floor2'

def dots(path, s):
    """pixel breadcrumb dots between cell centres; returns html"""
    out = []
    pts = [(cr(p)[0] * 16 + 8, cr(p)[1] * 16 + 8) for p in path]
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        dx = (x1 > x0) - (x1 < x0); dy = (y1 > y0) - (y1 < y0)
        for k in range(0, 16, 4):
            x = x0 + dx * k; y = y0 + dy * k
            if k % 8 == 0:
                out.append(f'<div class="dot" style="left:calc(var(--s)*{x-1});top:calc(var(--s)*{y-1})"></div>')
    return ''.join(out)

def board_live():
    cur = PATH_LIVE[-1]
    visited = set(PATH_LIVE[:-1])
    cc, cr_ = cr(cur)
    neigh = []
    for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c, r = cc + dc, cr_ + dr
        if 0 <= c < 8 and 0 <= r < 8:
            neigh.append(chr(65 + c) + str(r + 1))
    marks_flag = ['C3']; marks_q = ['B5', 'C4']
    cells = []
    for r in range(8):
        for c in range(8):
            cell = chr(65 + c) + str(r + 1)
            inner = ''
            if cell == 'A1':
                cls = 'gate'
            elif cell == cur:
                cls = floor_cls(cell)
            elif cell in visited:
                cls = floor_cls(cell) + ' dim'
            else:
                cls = 'fog1' if (c + r) % 2 == 0 else 'fog2'
            if cell in TAKEN_LIVE:
                inner += '<div class="taken"></div>'
            if cell in neigh and cell not in visited:
                inner += '<div class="ov ov-hint"></div>'
            if cell in marks_flag: inner += '<div class="ov ov-flag"></div>'
            if cell in marks_q: inner += '<div class="ov ov-q"></div>'
            cells.append(f'<div class="t {cls}" style="{pos(cell)}">{inner}</div>')
    gx = cc * 16 + 8; gy = cr_ * 16 + 8
    glow = (f'<div class="glow" style="background:radial-gradient(circle at calc(var(--s)*{gx}) calc(var(--s)*{gy}),'
            f'rgba(255,181,71,.15) 0 calc(var(--s)*20),rgba(255,181,71,.085) calc(var(--s)*20) calc(var(--s)*34),'
            f'rgba(255,181,71,.035) calc(var(--s)*34) calc(var(--s)*50),transparent calc(var(--s)*50))"></div>')
    player = f'<div class="pil side bob" style="{pos(cur)}"><div class="spr"></div></div>'
    return (''.join(cells) + dots(PATH_LIVE, 4) + glow + player +
            '<div class="fogdrift fogA"></div><div class="fogdrift fogB"></div>')

def pennants():
    cols = ['#4C7BD9', '#EAF1F7', '#D6423A', '#4FBF9F', '#F2C14E']
    out = ''
    for i in range(12):
        out += f'<div class="pn" style="background:{cols[i % 5]};animation-delay:{(i % 4) * 0.4:.1f}s"></div>'
    return f'<div class="pennants">{out}</div>'

def framed(inner, extra_style=''):
    return f"""
<div class="frame" style="width:calc(var(--s)*144);height:calc(var(--s)*144);{extra_style}">
  <div class="snowcap"></div>
  <div class="abs" style="left:calc(var(--s)*8);top:calc(var(--s)*8);width:calc(var(--s)*128);height:calc(var(--s)*128);overflow:hidden;background:#151831">{inner}<div class="snow snowA" style="z-index:9"></div></div>
  <div class="brazier" style="left:calc(var(--s)*-5);top:calc(var(--s)*-9)"></div>
  <div class="brazier" style="right:calc(var(--s)*-5);top:calc(var(--s)*-9)"></div>
  <div class="brazier" style="left:calc(var(--s)*-5);bottom:calc(var(--s)*-5)"></div>
  <div class="brazier" style="right:calc(var(--s)*-5);bottom:calc(var(--s)*-5)"></div>
</div>"""

def img(key, w, h=None):
    h = h or w
    return f'<img class="icon" src="{A[key]}" width="{w}" height="{h}" alt="" style="width:{w}px;height:{h}px">'

def header(run_state, active='Split'):
    segs = ''
    for name in ('Split', 'Your view', 'Chain view'):
        cls = 'btn sm on' if name == active else 'btn sm alt'
        segs += f'<button type="button" class="{cls}" aria-pressed="{"true" if name == active else "false"}">{name}</button>'
    return f"""
<header class="row" style="align-items:center;gap:12px 24px;flex-wrap:wrap;padding:20px 40px 12px;position:relative;z-index:10">
  <div class="row" style="align-items:center;gap:14px">
    <div class="pil down" style="position:relative;width:48px;height:48px;--s:3px"><div class="spr" style="animation:none"></div></div>
    <span style="font-size:44px;font-weight:700;line-height:1;letter-spacing:.01em;text-shadow:4px 4px 0 #D6423A">Whiteout</span>
  </div>
  <div class="panel" style="padding:4px 14px;margin:4px 4px 4px 10px"><span class="muted" style="font-size:14px">Run</span> <span style="font-size:20px;font-weight:700">No. 0042</span></div>
  {run_state}
  <div style="flex:1 1 0"></div>
  <div class="row" style="align-items:center;gap:4px">{segs}</div>
  <div class="row" style="align-items:center;gap:12px;font-size:14px">
    <span class="row" style="align-items:center;gap:8px"><span style="width:10px;height:10px;background:#4FBF9F;box-shadow:0 0 0 2px #14102A"></span>Sepolia</span>
    <span class="hash">0x9f2c…a3c3</span>
  </div>
</header>"""

def lantern_panel():
    pips = ''.join('<span class="pip off"></span>' if i < 9 else '<span class="pip on"></span>' for i in range(24))
    return f"""
<section class="panel" aria-label="Lantern oil">
  <div class="row" style="align-items:center;gap:14px">
    {img('lantern', 48)}
    <div>
      <div class="h2">Lantern oil</div>
      <div class="sub">Each step burns one.</div>
    </div>
  </div>
  <div class="row" style="align-items:baseline;gap:10px;margin-top:14px">
    <span style="font-size:64px;font-weight:700;line-height:1;text-shadow:4px 4px 0 #14102A">15</span>
    <span class="muted" style="font-size:18px">of 24 left</span>
  </div>
  <div role="img" aria-label="15 of 24 steps left" style="display:grid;grid-template-columns:repeat(12,12px);gap:6px;margin-top:14px">{pips}</div>
</section>"""

def carry_panel():
    return f"""
<section class="panel" aria-label="Pack">
  <div class="h2">Pack</div>
  <div class="row" style="gap:6px;margin-top:10px;align-items:center">{img('relicIcon', 48)}{img('relicIcon', 48)}<span style="margin-left:6px;font-size:18px">2 relics</span></div>
  <div class="sub" style="margin-top:12px">The gate at A1 is 5 steps away. Relics count only if you finish alive at the gate.</div>
  <div class="row" style="gap:10px;align-items:center;margin-top:12px">{img('lock', 16)}<span style="font-size:16px">Alive</span><span class="sub">only you can tell</span></div>
</section>"""

def signals_panel():
    return f"""
<section class="panel" aria-label="Signals at E2">
  <div class="row" style="justify-content:space-between;align-items:baseline;gap:8px"><div class="h2">Signals at E2</div></div>
  <div class="sub">Decrypted just for you.</div>
  <div class="row" style="gap:14px;align-items:center;margin-top:14px;padding:10px;background:#12153A;box-shadow:inset 0 0 0 4px #3C86B0">
    {img('coldIcon', 48)}
    <div><div style="font-size:20px;font-weight:600;color:#BFE3F8">Cold</div><div class="sub">A pit is next to you</div></div>
  </div>
  <div class="row" style="gap:14px;align-items:center;margin-top:12px;padding:10px;background:#12153A;box-shadow:inset 0 0 0 4px #B8862B">
    {img('glintIcon', 48)}
    <div><div style="font-size:20px;font-weight:600;color:#FFD98A">Glint</div><div class="sub">Treasure is next to you</div></div>
  </div>
</section>"""

LOG = [
    ('09', 'East. Cold and Glint.', 'Frost on your sleeve, and gold close by.'),
    ('08', 'East. Quiet.', 'Only the wind.'),
    ('07', 'East. Relic taken. Cold.', 'You pocket it. The slabs feel thin here.'),
    ('06', 'North. Glint.', 'A faint shine ahead.'),
    ('05', 'North. Cold.', 'Your breath fogs. Something is below the stone.'),
    ('04', 'East. Relic taken. Cold.', 'Heavier. The lantern sways.'),
]

def log_panel(n=6):
    items = ''
    for st, a, b in LOG[:n]:
        items += f"""
<li style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:10px 0;border-top:4px solid #14102A">
  <span class="amber" style="font-size:22px;font-weight:700;line-height:1.1">{st}</span>
  <span><span style="font-size:16px;font-weight:600">{a}</span><br><span class="sub">{b}</span></span>
</li>"""
    return f"""
<section class="panel" aria-label="Journey log">
  <div class="h2">Journey log</div>
  <div class="sub">Your notes. They stay in this browser.</div>
  <ol style="list-style:none;margin:10px 0 0;padding:0">{items}</ol>
</section>"""

def chain_panel():
    def row(q, you, h, last=False):
        bt = '' if last else 'border-bottom:4px solid #14102A;'
        return f"""
<div style="display:grid;grid-template-columns:minmax(0,1.1fr) 44px minmax(0,1.5fr);gap:8px;align-items:center;padding:10px 0;{bt}">
  <span style="font-size:15px">{q}</span>
  <span style="font-size:17px;font-weight:700;color:#fff">{you}</span>
  <span class="row" style="align-items:center;gap:6px;min-width:0">{img('lock', 12)}<span class="hash" style="overflow-wrap:anywhere">{h}</span></span>
</div>"""
    return f"""
<section class="panel stone" aria-label="Chain view">
  <div class="h2">Chain view</div>
  <div class="sub">What an explorer sees for run No. 0042.</div>
  <div style="display:grid;grid-template-columns:minmax(0,1.1fr) 44px minmax(0,1.5fr);gap:8px;margin-top:12px;padding-bottom:6px;border-bottom:4px solid #14102A"><span class="sub">Question</span><span class="sub">You</span><span class="sub">Chain</span></div>
  {row('Where am I?', 'E2', '0xc10e…5a98')}
  {row('Am I alive?', 'Yes', '0x44bd…e170')}
  {row('Where are the pits?', 'C3 +', '0x8a41…e3d0', True)}
  <div class="sub" style="margin-top:10px">Same call every step. Nothing here says which way I went or whether I am alive.</div>
</section>"""

def controls():
    def key(label, rot):
        return f'<button type="button" class="btn alt key" aria-label="{label}"><img src="{A["arrow"]}" alt="" style="transform:rotate({rot}deg)"></button>'
    return f"""
<div class="row" style="align-items:center;gap:6px;margin-top:22px;flex-wrap:wrap">
  {key('Move north', 0)}{key('Move west', 270)}{key('Move south', 180)}{key('Move east', 90)}
  <div style="flex:1 1 0;min-width:12px"></div>
  <button type="button" class="btn">Finish run</button>
</div>"""

def main_board():
    body = f"""
<div class="root" style="--s:4px;min-height:940px">
  <div class="snow snowA"></div><div class="snow snowB"></div>
  {header('')}
  <main class="row" style="justify-content:center;align-items:flex-start;gap:40px;padding:16px 40px 40px;position:relative;z-index:10;flex-wrap:wrap">
    <div style="width:300px;display:flex;flex-direction:column;gap:20px;padding-top:44px">
      {lantern_panel()}{carry_panel()}{signals_panel()}
    </div>
    <div style="width:576px">
      {pennants()}
      {framed(board_live())}
      {controls()}
    </div>
    <div style="width:340px;display:flex;flex-direction:column;gap:20px;padding-top:44px">
      {log_panel(4)}{chain_panel()}
    </div>
  </main>
</div>"""
    return page('Whiteout board', body, h=940)

# ---------------------------------------------------------------- reveal
def board_reveal():
    cells = []
    for r in range(8):
        for c in range(8):
            cell = chr(65 + c) + str(r + 1)
            inner = ''
            if cell == 'A1': cls = 'gate'
            elif cell in PITS: cls = 'pit'
            elif cell in RELICS and cell not in ('B4', 'C2', 'E1'): cls = 'relic'
            else: cls = floor_cls(cell)
            if cell in ('B4', 'C2', 'E1'):
                inner += '<div class="taken"></div>'
            cells.append(f'<div class="t {cls}" style="{pos(cell)}">{inner}</div>')
    # replay walker keyframes (translate in art px * s)
    pts = [cr(p) for p in PATH_FULL]
    n = len(pts) - 1
    kf = []
    t0, t1 = 8.0, 90.0
    for i, (c, r) in enumerate(pts):
        pct = t0 + (t1 - t0) * i / n
        kf.append(f'{pct:.2f}%{{transform:translate(calc(var(--s)*{16*c}),calc(var(--s)*{16*r}));animation-timing-function:steps(16)}}')
    c0, r0 = pts[0]
    kfs = f'0%{{transform:translate(calc(var(--s)*{16*c0}),calc(var(--s)*{16*r0}))}}' + ''.join(kf) + f'100%{{transform:translate(calc(var(--s)*{16*c0}),calc(var(--s)*{16*r0}))}}'
    extra = '@keyframes replay{' + kfs + '}.ghost{left:0;top:0;animation:replay 12s linear infinite;z-index:8}'
    walker = '<div class="pil down ghost"><div class="spr"></div></div>'
    final_stand = f'<div class="pil down bob" style="{pos("A1")};z-index:5"><div class="spr"></div></div>'
    glow = ('<div class="glow" style="background:radial-gradient(circle at calc(var(--s)*8) calc(var(--s)*8),'
            'rgba(255,181,71,.20) 0 calc(var(--s)*22),rgba(255,181,71,.09) calc(var(--s)*22) calc(var(--s)*40),transparent calc(var(--s)*40))"></div>')
    # edge fog remnant
    edge = ('<div class="fogdrift fogA" style="opacity:.7;-webkit-mask-image:linear-gradient(100deg,#000 0%,transparent 26%,transparent 74%,#000 100%);'
            'mask-image:linear-gradient(100deg,#000 0%,transparent 26%,transparent 74%,#000 100%)"></div>')
    return ''.join(cells) + dots(PATH_FULL, 4) + glow + walker + edge, extra

def reveal_page():
    board, extra = board_reveal()
    pips = ''.join('<span class="pip on" style="background:#EAF1F7;box-shadow:inset 0 -3px 0 #A6B8CD,0 0 0 2px #14102A"></span>' for _ in range(14))
    body = f"""
<div class="root" style="--s:4px;min-height:1020px">
  <div class="snow snowA" style="opacity:.55"></div>
  {header('<span class="panel" style="padding:4px 14px;margin:4px;background:#2B6A57;box-shadow:0 -4px 0 0 #4FBF9F,0 4px 0 0 #4FBF9F,-4px 0 0 0 #4FBF9F,4px 0 0 0 #4FBF9F,0 8px 0 0 #0A0C20"><span style="font-size:16px;font-weight:600">Finalized</span></span>', active='Split')}
  <main class="row" style="justify-content:center;align-items:flex-start;gap:40px;padding:16px 40px 40px;position:relative;z-index:10;flex-wrap:wrap">
    <div style="width:300px;display:flex;flex-direction:column;gap:20px;padding-top:12px">
      <section class="panel" aria-label="Result">
        <div class="h2">Score</div>
        <div class="row" style="align-items:center;gap:16px;margin-top:6px">
          <span style="font-size:112px;font-weight:700;line-height:1;text-shadow:6px 6px 0 #D6423A">03</span>
        </div>
        <div class="row" style="gap:6px;margin-top:10px">{img('relicIcon', 48)}{img('relicIcon', 48)}{img('relicIcon', 48)}</div>
        <div style="display:inline-block;margin:16px 4px 4px;padding:6px 14px;background:#D6423A;color:#fff;font-size:20px;font-weight:700;box-shadow:inset 0 -4px 0 #8E2430,0 -4px 0 0 #14102A,0 4px 0 0 #14102A,-4px 0 0 0 #14102A,4px 0 0 0 #14102A">Home alive</div>
        <div class="sub" style="margin-top:8px">Back at the gate with 3 relics and 10 steps of oil left.</div>
      </section>
      <section class="panel" aria-label="Run facts">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:16px;align-items:baseline">
          <span class="muted">Steps used</span><b style="font-weight:600">14 of 24</b>
          <span class="muted">Missed</span><b style="font-weight:600">D4, G5, A7</b>
          <span class="muted">Closest call</span><b style="font-weight:600">B4, pit at B5</b>
        </div>
      </section>
      <section class="panel" aria-label="Replay">
        <div class="h2">Replay</div>
        <div role="img" aria-label="Replay at 14 of 14" style="display:grid;grid-template-columns:repeat(14,12px);gap:4px;margin-top:12px">{pips}</div>
        <div class="row" style="gap:2px;margin-top:10px;flex-wrap:wrap">
          <button type="button" class="btn alt key" style="width:48px;height:48px" aria-label="Back one step"><img src="{A['arrow']}" alt="" style="transform:rotate(270deg)"></button>
          <button type="button" class="btn" style="padding:10px 12px;font-size:16px">Play again</button>
          <button type="button" class="btn alt key" style="width:48px;height:48px" aria-label="Forward one step"><img src="{A['arrow']}" alt="" style="transform:rotate(90deg)"></button>
        </div>
        <div class="sub" style="margin-top:6px">Runs in your browser. Nothing is sent.</div>
      </section>
    </div>
    <div style="width:576px">
      {ribbon(None, {0, 1}, 'Reached 2 of 5 chapters', 'The rest of the road stayed unseen')}
      {framed(board)}
      <div class="row" style="gap:6px 20px;flex-wrap:wrap;margin-top:22px;font-size:14px;color:#C7D3EE;align-items:center">
        <span class="row" style="gap:8px;align-items:center"><span style="width:12px;height:12px;background:#FF9B4A;box-shadow:0 0 0 2px #14102A"></span>Your path</span>
        <span class="row" style="gap:8px;align-items:center"><span style="width:16px;height:16px;background:#0A0B1A;box-shadow:0 0 0 2px #8FB4D9"></span>Pit</span>
        <span class="row" style="gap:8px;align-items:center">{img('relicIcon', 16)}Taken</span>
        <span class="row" style="gap:8px;align-items:center"><span style="width:16px;height:16px;background:#F2C14E;box-shadow:0 0 0 2px #14102A"></span>Missed relic</span>
      </div>
      <div class="sub" style="margin-top:10px;max-width:60ch">The fog is gone because finishing opened the map. Every tile here comes from values you can check on Sepolia.</div>
    </div>
    <div style="width:340px;display:flex;flex-direction:column;gap:20px;padding-top:12px">
      <section class="panel stone" aria-label="Check the run">
        <div class="h2">Check the run</div>
        <div class="sub">Anyone can verify the map was fixed before your first step.</div>
        <ol style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:14px">
          <li style="display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px"><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#2F3670;font-weight:700;font-size:18px;box-shadow:0 0 0 4px #14102A">1</span><span><b style="font-weight:600">Finish opens the map</b><br><span class="sub">Pits, relics, path and score are marked publicly decryptable.</span></span></li>
          <li style="display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px"><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#2F3670;font-weight:700;font-size:18px;box-shadow:0 0 0 4px #14102A">2</span><span><b style="font-weight:600">The network signs the values</b><br><span class="sub">The Zama relayer returns the plain values with a signature.</span></span></li>
          <li style="display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px"><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#D6423A;font-weight:700;font-size:18px;box-shadow:0 0 0 4px #14102A">3</span><span><b style="font-weight:600">The contract checks it</b><br><span class="sub">Finalize rejects anything unsigned, then writes your score.</span></span></li>
        </ol>
      </section>
      <section class="panel" aria-label="Revealed values">
        <div class="h2">Revealed values</div>
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 14px;margin-top:10px;font-size:14px;align-items:baseline">
          <span class="muted">Pits</span><span class="hash" style="overflow-wrap:anywhere">0x0090082200144000</span>
          <span class="muted">Relics</span><span class="hash" style="overflow-wrap:anywhere">0x000100400a000410</span>
          <span class="muted">Moves</span><span>14, 2 bits each</span>
          <span class="muted">Finalize</span><span class="hash">0x7d15…b6c2</span>
        </div>
        <button type="button" class="btn alt sm" style="margin-top:14px">Open on Etherscan</button>
      </section>
    </div>
  </main>
</div>"""
    return page('Whiteout reveal', body, extra_css=extra, h=1020)

# ---------------------------------------------------------------- start
def mountains():
    W, H = 360, 195
    rnd = random.Random(7)
    def ridge(base, amp, seed, peaks):
        rr = random.Random(seed)
        ph = [rr.random() * 6.28 for _ in range(4)]
        ys = []
        for x in range(W):
            v = base
            v -= amp * (0.5 + 0.5 * math.sin(x / 31 + ph[0]))
            v -= amp * 0.5 * (0.5 + 0.5 * math.sin(x / 13 + ph[1]))
            v -= amp * 0.25 * math.sin(x / 5 + ph[2])
            for px, ph_, wid in peaks:
                v -= ph_ * max(0, 1 - abs(x - px) / wid)
            ys.append(int(v))
        return ys
    layers = [
        (ridge(112, 14, 1, [(70, 34, 40), (300, 28, 36)]), '#20265A', '#3A4280'),
        (ridge(140, 12, 2, [(130, 22, 34), (330, 18, 28)]), '#171B45', '#2B3270'),
        (ridge(170, 8, 3, []), '#0E1030', '#1B1F4F'),
    ]
    svg = f'<svg class="abs px" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" style="inset:0;width:100%;height:100%" shape-rendering="crispEdges" aria-hidden="true">'
    for li, (ys, fill, cap) in enumerate(layers):
        for x, y in enumerate(ys):
            svg += f'<rect x="{x}" y="{y}" width="1" height="{H-y}" fill="{fill}"/>'
            if li < 2:
                svg += f'<rect x="{x}" y="{y}" width="1" height="2" fill="{cap}"/>'
        if li == 0:
            temple_y = ys[250]
    # temple on far ridge near x=250
    by = layers[0][0][250] + 2
    def R(x, y, w, h, c): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
    t = ''
    t += R(226, by, 48, 96, '#20265A')
    t += R(222, by, 56, 4, '#1B2050')
    t += R(232, by + 4, 36, 2, '#1B2050')
    t += R(228, by - 10, 44, 10, '#2A2150')      # body 1
    t += R(246, by - 8, 8, 8, '#FFB547')         # door
    for roof in ((220, by - 14, 60), (224, by - 18, 52), (230, by - 22, 40)):
        t += R(roof[0], roof[1], roof[2], 4, '#7A2E3E')
        t += R(roof[0], roof[1], roof[2], 1, '#EAF1F7')
    t += R(216, by - 16, 4, 2, '#7A2E3E') + R(280, by - 16, 4, 2, '#7A2E3E')
    t += R(236, by - 32, 28, 10, '#2A2150')      # body 2
    t += R(246, by - 29, 8, 5, '#FFB547')
    for roof in ((230, by - 36, 40), (234, by - 40, 32), (240, by - 44, 20)):
        t += R(roof[0], roof[1], roof[2], 4, '#7A2E3E')
        t += R(roof[0], roof[1], roof[2], 1, '#EAF1F7')
    t += R(249, by - 54, 2, 10, '#F2C14E')
    # stars
    stars = ''
    sr = random.Random(5)
    for i in range(46):
        x = sr.randint(0, W - 1); y = sr.randint(2, 92)
        stars += f'<rect x="{x}" y="{y}" width="1" height="1" fill="#EAF1F7" opacity="{0.35 + 0.5*sr.random():.2f}"/>'
    return svg.replace('</svg>', '') + stars + t + '</svg>'

def start_page():
    sky = 'background:linear-gradient(#0A0C22 0 22%,#0F1230 22% 40%,#151945 40% 58%,#1D2257 58% 74%,#272E6C 74% 100%)'
    body = f"""
<div class="root" style="--s:4px;min-height:780px;{sky}">
  {mountains()}
  <div class="snow snowA"></div><div class="snow snowB"></div>
  <header class="row" style="align-items:center;padding:20px 40px;position:relative;z-index:10">
    <div class="row" style="align-items:center;gap:12px"></div>
    <div style="flex:1 1 0"></div>
    <div class="row" style="align-items:center;gap:14px;font-size:14px">
      <span class="row" style="align-items:center;gap:8px"><span style="width:10px;height:10px;background:#4FBF9F;box-shadow:0 0 0 2px #14102A"></span>Sepolia</span>
      <button type="button" class="btn alt sm">Leaderboard</button>
    </div>
  </header>
  <main style="position:relative;z-index:10;padding:36px 56px 0">
    <h1 style="margin:0;font-size:136px;font-weight:700;line-height:.9;letter-spacing:.005em;text-shadow:8px 8px 0 #D6423A">Whiteout</h1>
    <p style="margin:26px 0 0;font-size:32px;font-weight:600;max-width:20ch;line-height:1.15;text-shadow:3px 3px 0 #0A0C22">The chain can’t see you die.</p>
    <p style="margin:16px 0 0;font-size:18px;line-height:1.4;max-width:44ch;color:#C7D3EE;text-shadow:2px 2px 0 #0A0C22">Climb a snowbound temple with one lantern and 24 steps. The map, your position and whether you still live stay encrypted until you finish.</p>
    <div class="row" style="gap:10px;margin-top:26px;flex-wrap:wrap;align-items:center">
      <button type="button" class="btn" style="font-size:22px;padding:14px 30px;min-height:60px">Connect wallet</button>
      <button type="button" class="btn alt" style="font-size:18px;min-height:60px">Practice run</button>
    </div>
    <div class="sub" style="margin-top:12px;max-width:52ch;color:#C7D3EE">Practice runs play on your device, with nothing encrypted. Real runs need Sepolia ETH for gas.</div>
  </main>
  <div class="abs" style="right:calc(var(--s)*52);bottom:calc(var(--s)*26);width:calc(var(--s)*32);height:calc(var(--s)*32);z-index:12">
    <div class="pil down bob" style="--s:8px;position:absolute;left:0;top:0;width:128px;height:128px"><div class="spr" style="animation-duration:1.2s"></div></div>
  </div>
  <div class="abs row" style="left:56px;right:56px;bottom:32px;gap:16px;z-index:12;flex-wrap:wrap">
    <div class="panel row" style="align-items:center;gap:14px;padding:12px 18px;margin:4px;width:300px">{img('gate'.replace('gate','lantern'), 36)}<span><b style="font-weight:600">24 steps of oil</b><br><span class="sub">The storm closes at zero.</span></span></div>
    <div class="panel row" style="align-items:center;gap:14px;padding:12px 18px;margin:4px;width:300px">{img('relicIcon', 36)}<span><b style="font-weight:600">Bring relics home</b><br><span class="sub">Only if you finish alive.</span></span></div>
    <div class="panel row" style="align-items:center;gap:14px;padding:12px 18px;margin:4px;width:300px">{img('coldIcon', 36)}<span><b style="font-weight:600">Read the signals</b><br><span class="sub">Cold means a pit is near.</span></span></div>
  </div>
</div>"""
    return page('Whiteout start', body, w=1440, h=780)

# ---------------------------------------------------------------- mobile
def mobile_page():
    def key(label, rot):
        return f'<button type="button" class="btn alt key" aria-label="{label}" style="width:52px;height:52px"><img src="{A["arrow"]}" alt="" style="transform:rotate({rot}deg)"></button>'
    pips = ''.join('<span class="pip off" style="width:10px;height:10px"></span>' if i < 9 else '<span class="pip on" style="width:10px;height:10px"></span>' for i in range(24))
    body = f"""
<div class="root" style="--s:3px;width:390px;height:844px;display:flex;flex-direction:column;gap:10px;padding:10px 0 12px">
  <div class="snow snowA"></div>
  <header class="row" style="align-items:center;gap:10px;padding:0 16px;position:relative;z-index:10">
    <span style="font-size:28px;font-weight:700;line-height:1;text-shadow:3px 3px 0 #D6423A">Whiteout</span>
    <div style="flex:1 1 0"></div>
    <span class="panel" style="padding:2px 10px;margin:4px"><span style="font-size:16px;font-weight:700">No. 0042</span></span>
  </header>
  <div class="row" style="align-items:center;gap:12px;padding:0 16px;position:relative;z-index:10">
    {img('lantern', 36)}
    <span style="font-size:40px;font-weight:700;line-height:1;text-shadow:3px 3px 0 #14102A">15</span>
    <span class="muted" style="font-size:15px;line-height:1.1">of 24<br>steps left</span>
    <div style="flex:1 1 0"></div>
    <div class="row" style="gap:6px;align-items:center">{img('relicIcon', 28)}{img('relicIcon', 28)}</div>
  </div>
  <div role="img" aria-label="15 of 24 steps left" class="row" style="gap:4px;padding:0 16px;position:relative;z-index:10;justify-content:space-between">{pips}</div>
  <div style="position:relative;width:calc(var(--s)*128);height:calc(var(--s)*128);margin:0 auto;overflow:hidden;background:#151831;box-shadow:0 0 0 4px #3A4180,0 6px 0 4px #0A0C20;z-index:6">
    {board_live()}
  </div>
  <div class="row" style="gap:10px;padding:0 16px;position:relative;z-index:10">
    <div class="panel row" style="flex:1 1 0;min-width:0;align-items:center;gap:10px;padding:8px 10px;margin:4px;box-shadow:0 -4px 0 0 #3C86B0,0 4px 0 0 #3C86B0,-4px 0 0 0 #3C86B0,4px 0 0 0 #3C86B0,0 8px 0 0 #0A0C20">{img('coldIcon', 32)}<span><b style="font-weight:600;color:#BFE3F8">Cold</b><br><span class="sub" style="font-size:13px">Pit next to you</span></span></div>
    <div class="panel row" style="flex:1 1 0;min-width:0;align-items:center;gap:10px;padding:8px 10px;margin:4px;box-shadow:0 -4px 0 0 #B8862B,0 4px 0 0 #B8862B,-4px 0 0 0 #B8862B,4px 0 0 0 #B8862B,0 8px 0 0 #0A0C20">{img('glintIcon', 32)}<span><b style="font-weight:600;color:#FFD98A">Glint</b><br><span class="sub" style="font-size:13px">Relic next to you</span></span></div>
  </div>
  <div class="row" style="align-items:center;justify-content:space-between;padding:0 20px;margin-top:auto;position:relative;z-index:10">
    <div style="display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:4px">
      <span></span>{key('Move north', 0)}<span></span>
      {key('Move west', 270)}<span></span>{key('Move east', 90)}
      <span></span>{key('Move south', 180)}<span></span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:stretch;gap:6px;width:150px">
      <button type="button" class="btn alt sm">Chain view</button>
      <button type="button" class="btn sm">Finish run</button>
    </div>
  </div>
</div>"""
    return page('Whiteout mobile', body, w=390, h=844)

def write(name, content):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(content)
    print(name, len(content))


# =============================================================== v2: zones, journey
import terrain
A.update(terrain.terrain_art())

_old_css = css
def css():
    s = _old_css()
    ex = ''
    for k, v in A.items():
        if k.startswith('dec'):
            ex += f'.d-{k}{{background-image:url({v})}}'
        elif k.startswith('pit') and k != 'pit':
            ex += f'.k-{k}{{background-image:url({v})}}'
        elif k[-1].isdigit() and k.startswith(('courtyard', 'garden', 'ice', 'plank', 'sanct')):
            ex += f'.k-{k}{{background-image:url({v})}}'
    ex += f'.ov-relic{{background-image:url({A["relicOver"]})}}'
    ex += '.unk{filter:brightness(.34) saturate(.65)}.nb{filter:brightness(.58) saturate(.85)}'
    ex += ('.frost{position:absolute;inset:0;pointer-events:none;z-index:8;'
           'box-shadow:inset 0 0 0 calc(var(--s)*2) rgba(168,208,240,.30),inset 0 0 0 calc(var(--s)*5) rgba(168,208,240,.16),inset 0 0 0 calc(var(--s)*9) rgba(168,208,240,.08);'
           'animation:frost 3s steps(1) infinite}@keyframes frost{50%{opacity:.6}}')
    ex += ('.spark{position:absolute;width:calc(var(--s)*1);height:calc(var(--s)*1);background:#FFE9A8;z-index:7;pointer-events:none;'
           'box-shadow:calc(var(--s)*-1) 0 0 #F2C14E,calc(var(--s)*1) 0 0 #F2C14E,0 calc(var(--s)*-1) 0 #F2C14E,0 calc(var(--s)*1) 0 #F2C14E;'
           'animation:tw 1.6s steps(1) infinite}@keyframes tw{0%,100%{opacity:1}35%{opacity:0}65%{opacity:.6}}')
    ex += '.rib-dots{flex:1 1 0;min-width:8px;height:4px;margin-top:20px}'
    return s + ex

def zone(cell):
    c, r = cr(cell)
    return terrain.ZNAME[terrain.ZONES[r][c]]

def tcls(cell):
    z = zone(cell); c, r = cr(cell)
    if z == 'courtyard':
        v = 3 if (c + r * 5) % 7 == 0 else (1 if (c * 3 + r) % 2 == 0 else 2)
    else:
        n = {'garden': 3, 'ice': 3, 'plank': 2, 'sanct': 2}[z]
        v = (c * 3 + r * 5) % n + 1
    return f'k-{z}{v}'

def decor(cell):
    c, r = cr(cell); z = zone(cell)
    if (c * 5 + r * 3) % 4 != 0 or cell == 'A1': return ''
    key = {'courtyard': 'decCourtyard' if (c + r) % 2 == 0 else 'decCourtyard2', 'garden': 'decGarden',
           'ice': 'decIce', 'plank': 'decPlank', 'sanct': 'decSanct'}[z]
    return f'<div class="ov d-{key}"></div>'

def board_live():
    cur = PATH_LIVE[-1]
    visited = set(PATH_LIVE[:-1])
    cc, cr_ = cr(cur)
    neigh = []
    for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c, r = cc + dc, cr_ + dr
        if 0 <= c < 8 and 0 <= r < 8:
            neigh.append(chr(65 + c) + str(r + 1))
    cells = []
    for r in range(8):
        for c in range(8):
            cell = chr(65 + c) + str(r + 1)
            inner = ''
            if cell == 'A1':
                cls = 'gate'
            else:
                cls = tcls(cell)
                if cell == cur: pass
                elif cell in visited: cls += ' dim'
                elif cell in neigh: cls += ' nb'
                else: cls += ' unk'
                inner += decor(cell)
            if cell in TAKEN_LIVE: inner += '<div class="taken"></div>'
            if cell in neigh and cell not in visited: inner += '<div class="ov ov-hint"></div>'
            if cell == 'C3': inner += '<div class="ov ov-flag"></div>'
            if cell in ('B5', 'C4'): inner += '<div class="ov ov-q"></div>'
            cells.append(f'<div class="t {cls}" style="{pos(cell)}">{inner}</div>')
    gx = cc * 16 + 8; gy = cr_ * 16 + 8
    glow = (f'<div class="glow" style="background:radial-gradient(circle at calc(var(--s)*{gx}) calc(var(--s)*{gy}),'
            f'rgba(255,181,71,.15) 0 calc(var(--s)*20),rgba(255,181,71,.085) calc(var(--s)*20) calc(var(--s)*34),'
            f'rgba(255,181,71,.035) calc(var(--s)*34) calc(var(--s)*50),transparent calc(var(--s)*50))"></div>')
    player = f'<div class="pil side bob" style="{pos(cur)}"><div class="spr"></div></div>'
    sparks = ''
    for i, (dx, dy) in enumerate(((-4, 3), (19, 2), (18, 15))):
        sparks += f'<div class="spark" style="left:calc(var(--s)*{cc*16+dx+2});top:calc(var(--s)*{cr_*16+dy});animation-delay:{i*0.4:.1f}s"></div>'
    return (''.join(cells) + dots(PATH_LIVE, 4) + glow + player + sparks +
            '<div class="fogdrift fogA"></div><div class="fogdrift fogB"></div><div class="frost"></div>')

CH = [('courtyard1', 'The Courtyard'), ('garden1', 'Frozen Garden'), ('ice1', 'Mirror Lake'), ('plank1', 'Bell Bridge'), ('sanct1', 'The Sanctum')]

def ribbon(cur, reached, heading, sub):
    nodes = ''
    for i, (k, name) in enumerate(CH):
        if i == cur: st = 'cur'
        elif i in reached: st = 'done'
        else: st = 'lock'
        tile_style = {'cur': 'box-shadow:0 0 0 4px #FFB547,0 0 0 8px #14102A;',
                      'done': 'box-shadow:0 0 0 4px #14102A;',
                      'lock': 'box-shadow:0 0 0 4px #14102A;filter:brightness(.38) saturate(.5);'}[st]
        lab = {'cur': 'color:#FFB547;font-weight:600', 'done': 'color:#EAF1F7', 'lock': 'color:#8C99C0'}[st]
        pil = ''
        if st == 'cur':
            pil = '<div class="pil down bob" style="--s:2px;position:absolute;left:4px;top:-34px;width:32px;height:32px"><div class="spr"></div></div>'
        nodes += f"""<div style="width:72px;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;flex:none">
  {pil}
  <div style="position:relative;width:40px;height:40px;margin-top:6px;{tile_style}"><img class="icon" src="{A[k]}" width="40" height="40" alt="" style="width:40px;height:40px"></div>
  <span style="font-size:13px;line-height:1.15;text-align:center;{lab}">{name}</span>
</div>"""
        if i < len(CH) - 1:
            on = i in reached and (i + 1) in reached or i + 1 == cur
            col = '#FFB547' if on else '#3A4180'
            nodes += f'<div class="rib-dots" style="background:repeating-linear-gradient(90deg,{col} 0 8px,transparent 8px 16px);margin-top:{26}px"></div>'
    return f"""
<section class="panel" aria-label="Journey" style="padding:12px 16px 14px;margin-bottom:22px">
  <div class="row" style="align-items:baseline;gap:12px;justify-content:space-between;flex-wrap:wrap"><span class="h2">{heading}</span><span class="sub">{sub}</span></div>
  <div class="row" style="align-items:flex-start;margin-top:30px;padding:0 2px">{nodes}</div>
</section>"""

def log_panel(n=6):
    items = ''
    for st, a, b in LOG[:n]:
        items += f"""
<li style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:10px 0;border-top:4px solid #14102A">
  <span class="amber" style="font-size:22px;font-weight:700;line-height:1.1">{st}</span>
  <span><span style="font-size:16px;font-weight:600">{a}</span><br><span class="sub">{b}</span></span>
</li>"""
    banner = f"""<div class="row" style="align-items:center;gap:12px;margin-top:10px;padding:8px 10px;background:#3A2A12;box-shadow:inset 0 0 0 4px #B8862B">
  <img class="icon" src="{A['garden1']}" width="32" height="32" alt="" style="width:32px;height:32px;box-shadow:0 0 0 4px #14102A">
  <span><span class="sub" style="color:#FFD98A">Chapter 2, step 9</span><br><b style="font-weight:600">You enter the Frozen Garden</b></span>
</div>"""
    return f"""
<section class="panel" aria-label="Journey log">
  <div class="h2">Journey log</div>
  <div class="sub">Your notes. They stay in this browser.</div>
  {banner}
  <ol style="list-style:none;margin:6px 0 0;padding:0">{items}</ol>
</section>"""

def main_board():
    body = f"""
<div class="root" style="--s:4px;min-height:1060px">
  <div class="snow snowA"></div><div class="snow snowB"></div>
  {header('')}
  <main class="row" style="justify-content:center;align-items:flex-start;gap:40px;padding:16px 40px 40px;position:relative;z-index:10;flex-wrap:wrap">
    <div style="width:300px;display:flex;flex-direction:column;gap:20px;padding-top:12px">
      {lantern_panel()}{carry_panel()}{signals_panel()}
    </div>
    <div style="width:576px">
      {ribbon(1, {0}, 'Chapter 2 of 5', 'Where this road has led you so far')}
      {pennants()}
      {framed(board_live())}
      {controls()}
    </div>
    <div style="width:340px;display:flex;flex-direction:column;gap:20px;padding-top:12px">
      {log_panel(3)}{chain_panel()}
    </div>
  </main>
</div>"""
    return page('Whiteout board', body, h=1060)

def board_reveal():
    cells = []
    for r in range(8):
        for c in range(8):
            cell = chr(65 + c) + str(r + 1)
            inner = ''
            if cell == 'A1':
                cls = 'gate'
            elif cell in PITS:
                cls = f'k-pit{zone(cell)}'
            else:
                cls = tcls(cell)
                if cell in RELICS and cell not in ('B4', 'C2', 'E1'):
                    inner += '<div class="ov ov-relic"></div>'
                elif cell not in RELICS:
                    inner += decor(cell)
            if cell in ('B4', 'C2', 'E1'): inner += '<div class="taken"></div>'
            cells.append(f'<div class="t {cls}" style="{pos(cell)}">{inner}</div>')
    pts = [cr(p) for p in PATH_FULL]
    n = len(pts) - 1
    kf = []
    t0, t1 = 8.0, 90.0
    for i, (c, r) in enumerate(pts):
        pct = t0 + (t1 - t0) * i / n
        kf.append(f'{pct:.2f}%{{transform:translate(calc(var(--s)*{16*c}),calc(var(--s)*{16*r}));animation-timing-function:steps(16)}}')
    c0, r0 = pts[0]
    kfs = f'0%{{transform:translate(calc(var(--s)*{16*c0}),calc(var(--s)*{16*r0}))}}' + ''.join(kf) + f'100%{{transform:translate(calc(var(--s)*{16*c0}),calc(var(--s)*{16*r0}))}}'
    extra = '@keyframes replay{' + kfs + '}.ghost{left:0;top:0;animation:replay 12s linear infinite;z-index:8}'
    walker = '<div class="pil down ghost"><div class="spr"></div></div>'
    glow = ('<div class="glow" style="background:radial-gradient(circle at calc(var(--s)*8) calc(var(--s)*8),'
            'rgba(255,181,71,.14) 0 calc(var(--s)*22),rgba(255,181,71,.07) calc(var(--s)*22) calc(var(--s)*40),transparent calc(var(--s)*40))"></div>')
    edge = ('<div class="fogdrift fogA" style="opacity:.5;-webkit-mask-image:linear-gradient(100deg,#000 0%,transparent 22%,transparent 78%,#000 100%);'
            'mask-image:linear-gradient(100deg,#000 0%,transparent 22%,transparent 78%,#000 100%)"></div>')
    return ''.join(cells) + dots(PATH_FULL, 4) + glow + walker + edge, extra

def mobile_page():
    def key(label, rot):
        return f'<button type="button" class="btn alt key" aria-label="{label}" style="width:52px;height:52px"><img src="{A["arrow"]}" alt="" style="transform:rotate({rot}deg)"></button>'
    pips = ''.join('<span class="pip off" style="width:10px;height:10px"></span>' if i < 9 else '<span class="pip on" style="width:10px;height:10px"></span>' for i in range(24))
    mini = ''
    for i, (k, name) in enumerate(CH):
        st = 'box-shadow:0 0 0 3px #FFB547,0 0 0 6px #14102A;' if i == 1 else ('box-shadow:0 0 0 3px #14102A;' + ('' if i == 0 else 'filter:brightness(.38) saturate(.5);'))
        mini += f'<img class="icon" src="{A[k]}" width="22" height="22" alt="" style="width:22px;height:22px;{st}">'
    body = f"""
<div class="root" style="--s:3px;width:390px;height:844px;display:flex;flex-direction:column;gap:10px;padding:10px 0 12px">
  <div class="snow snowA"></div>
  <header class="row" style="align-items:center;gap:10px;padding:0 16px;position:relative;z-index:10">
    <span style="font-size:28px;font-weight:700;line-height:1;text-shadow:3px 3px 0 #D6423A">Whiteout</span>
    <div style="flex:1 1 0"></div>
    <span class="panel" style="padding:2px 10px;margin:4px"><span style="font-size:16px;font-weight:700">No. 0042</span></span>
  </header>
  <div class="row" style="align-items:center;gap:12px;padding:0 16px;position:relative;z-index:10">
    {img('lantern', 36)}
    <span style="font-size:40px;font-weight:700;line-height:1;text-shadow:3px 3px 0 #14102A">15</span>
    <span class="muted" style="font-size:15px;line-height:1.1">of 24<br>steps left</span>
    <div style="flex:1 1 0"></div>
    <div class="row" style="gap:6px;align-items:center">{img('relicIcon', 28)}{img('relicIcon', 28)}</div>
  </div>
  <div role="img" aria-label="15 of 24 steps left" class="row" style="gap:4px;padding:0 16px;position:relative;z-index:10;justify-content:space-between">{pips}</div>
  <div class="row" style="align-items:center;justify-content:space-between;padding:4px 18px 2px;position:relative;z-index:10">
    <span><span class="sub" style="color:#FFD98A">Chapter 2 of 5</span><br><b style="font-weight:600;font-size:17px">Frozen Garden</b></span>
    <div class="row" style="gap:10px;align-items:center">{mini}</div>
  </div>
  <div style="position:relative;width:calc(var(--s)*128);height:calc(var(--s)*128);margin:0 auto;overflow:hidden;background:#151831;box-shadow:0 0 0 4px #3A4180,0 6px 0 4px #0A0C20;z-index:6">
    {board_live()}
  </div>
  <div class="row" style="gap:10px;padding:0 16px;position:relative;z-index:10">
    <div class="panel row" style="flex:1 1 0;min-width:0;align-items:center;gap:10px;padding:8px 10px;margin:4px;box-shadow:0 -4px 0 0 #3C86B0,0 4px 0 0 #3C86B0,-4px 0 0 0 #3C86B0,4px 0 0 0 #3C86B0,0 8px 0 0 #0A0C20">{img('coldIcon', 32)}<span><b style="font-weight:600;color:#BFE3F8">Cold</b><br><span class="sub" style="font-size:13px">Pit next to you</span></span></div>
    <div class="panel row" style="flex:1 1 0;min-width:0;align-items:center;gap:10px;padding:8px 10px;margin:4px;box-shadow:0 -4px 0 0 #B8862B,0 4px 0 0 #B8862B,-4px 0 0 0 #B8862B,4px 0 0 0 #B8862B,0 8px 0 0 #0A0C20">{img('glintIcon', 32)}<span><b style="font-weight:600;color:#FFD98A">Glint</b><br><span class="sub" style="font-size:13px">Relic next to you</span></span></div>
  </div>
  <div class="row" style="align-items:center;justify-content:space-between;padding:0 20px;margin-top:auto;position:relative;z-index:10">
    <div style="display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:4px">
      <span></span>{key('Move north', 0)}<span></span>
      {key('Move west', 270)}<span></span>{key('Move east', 90)}
      <span></span>{key('Move south', 180)}<span></span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:stretch;gap:6px;width:150px">
      <button type="button" class="btn alt sm">Chain view</button>
      <button type="button" class="btn sm">Finish run</button>
    </div>
  </div>
</div>"""
    return page('Whiteout mobile', body, w=390, h=844)


if __name__ == '__main__':
    write('Main.dc.html', main_board())
    write('Reveal.dc.html', reveal_page())
    write('Start.dc.html', start_page())
    write('Mobile.dc.html', mobile_page())
