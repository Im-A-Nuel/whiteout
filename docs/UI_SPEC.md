# Whiteout: UI Spec for Implementation

This document tells Claude Code how to build the Whiteout frontend so it matches the approved design reference. Read it together with `ARCHITECTURE.md` (contract and relayer flow) and `GAME_DESIGN.md` (rules). Where this file and those disagree on rules, the other two win. Where they disagree on looks, this file wins.

## 0. What you are building

A pixel-art journey game. A red-hooded pilgrim crosses a snowbound mountain temple with one lantern (24 steps of oil). The temple is an 8x8 board made of five regions. The board is fogged, so only the torchlit surroundings are lit, and the chain never sees position, moves, hazards or death.

Visual identity in one line: **night-blue temple, amber lantern light, one red pilgrim, chunky pixel art at integer scale.** No gradients except the three hard-stepped sky bands. No glassmorphism, no rounded cards, no emoji.

## 1. Reference material (match these)

The kit folder `whiteout-ui-kit/` contains:

| Path | What it is |
| --- | --- |
| `reference/Main.dc.html` | Board screen, desktop. Open in a browser; it is a static HTML mockup with the exact CSS. |
| `reference/Reveal.dc.html` | Reveal and replay screen, desktop. |
| `reference/Start.dc.html` | Start (title) screen, desktop. |
| `reference/Mobile.dc.html` | Board screen at 390 x 844. |
| `reference/*.png` | Screenshots of the four screens. They were rendered without the web fonts, so text is a monospace fallback. Pixel art, layout and colors are exact; text widths are slightly wider than the real result. |
| `sprites/*.png` | Every sprite at native size (see section 4). |
| `art-source/*.py` | The Python scripts that generated the sprites. Reference only. Do not run `build.py`, it writes to a path that only exists in the original session. |

The `.dc.html` files are not a framework to adopt. They are a design canvas format. Treat them as a visual reference and a CSS quarry: lift class definitions, keyframes and numbers from them, then rebuild the markup as React components. If a screenshot and the HTML disagree, the HTML is right.

Live reference (private, only if the user shares it with you): `https://claude.ai/artifact/2r3JghQkeG268yRCi9qBoK`.

## 2. Stack and structure

- Next.js App Router, TypeScript, plain CSS (global stylesheet plus CSS modules for components). No UI kit, no Tailwind.
- Fonts through `next/font/google`: **Pixelify Sans** (weights 400 to 700) for all UI text, **IBM Plex Mono** (400, 500) for hashes and addresses only.
- ethers v6 and `@zama-fhe/relayer-sdk` per `ARCHITECTURE.md`. The SDK is client-only (dynamic import, no SSR).
- Suggested layout:

```
app/
  page.tsx                 Start screen
  run/[id]/page.tsx        Board and Reveal (same route, switches on run state)
  leaderboard/page.tsx
components/
  Board/                   Board, Tile, Pilgrim, FogLayer, TorchGlow, PathDots, Marks
  Hud/                     LanternPanel, PackPanel, SignalsPanel, JourneyRibbon, JourneyLog, ChainView
  Controls/                DPad, FinishButton
  Pixel/                   PixelPanel, PixelButton, Pip, Icon
lib/
  zones.ts                 ZONES grid, tcls(), decor rules, pit variant rule
  journey.ts               chapter from cell, log entry builder
  chain.ts                 contract calls and relayer helpers (existing plan)
public/sprites/            copy of sprites/*.png
styles/pixel.css           tokens, panel, button, keyframes
```

## 3. Design tokens

### 3.1 Scale

Everything pixel-art is drawn on a 16 x 16 grid and shown at an **integer scale** set by one CSS variable on the screen root.

- Desktop: `--s: 4px` (tile 64px, board 512px, framed board 576px).
- Mobile: `--s: 3px` (tile 48px, board 384px, no frame).
- Always `image-rendering: pixelated`. Never scale sprites by a non-integer factor. Never rotate pixel text.
- Size things as `calc(var(--s) * N)` so one variable resizes the whole board.

### 3.2 Colors

| Token | Hex | Use |
| --- | --- | --- |
| `--bg-0` / `--bg-1` / `--bg-2` | `#0E1029` / `#12153A` / `#171B45` | Page background, three hard bands at 30% and 62% (no smooth gradient) |
| `--panel` | `#1B1F42` | Panel fill |
| `--panel-stone` | `#232850` | Chain view and proof panels |
| `--panel-edge` | `#3A4180` | Panel notched border |
| `--panel-drop` | `#0A0C20` | Panel bottom shadow |
| `--outline` | `#14102A` | Outline of buttons, pips, tiles in HUD |
| `--text` | `#EAF1F7` | Main text |
| `--muted` | `#A9B6D6` | Secondary text (contrast 7.7:1 on panel) |
| `--hash` | `#C7D3EE` | Hex strings |
| `--amber` | `#FFB547` | Lantern, step numbers, active segment, current chapter |
| `--amber-deep` | `#F26B3A` | Pip shade |
| `--red` | `#D6423A` | Pilgrim, primary button, logo shadow |
| `--red-shade` / `--red-hi` | `#8E2430` / `#F0806F` | Button bevel |
| `--btn-alt` | `#2F3670` (shade `#1B1F42`, hi `#4B54A3`) | Secondary buttons |
| `--green` | `#4FBF9F` | Network dot, Finalized chip border (fill `#2B6A57`) |
| `--ice` | `#8FB4D9` | Cold accents (border `#3C86B0`, text `#BFE3F8`) |
| `--gold` | `#F2C14E` | Relics and Glint (border `#B8862B`, text `#FFD98A`) |
| `--path` | `#FF9B4A` | Breadcrumb dots |

### 3.3 Type scale (Pixelify Sans unless noted)

| Role | Size / weight | Notes |
| --- | --- | --- |
| Hero title | 136 / 700 | `text-shadow: 8px 8px 0 var(--red)`, line-height .9 |
| Logo | 44 / 700 (28 on Start header and mobile) | `text-shadow: 4px 4px 0 var(--red)` (3px on small) |
| Score | 112 / 700 | `6px 6px 0 var(--red)` |
| Lantern number | 64 / 700 | `4px 4px 0 var(--outline)` |
| Panel title (h2) | 22 / 600 | |
| Body | 16 | line-height 1.35 |
| Sub / captions | 14 | color `--muted` |
| Hash / address | IBM Plex Mono 13 | color `--hash` |

Minimum text size anywhere is 13px. Body copy lines stay under 60 characters wide.

### 3.4 The pixel border (use this everywhere instead of `border`)

Panels, buttons and chips get stepped corners from four offset box-shadows, not borders:

```css
.panel {
  background: var(--panel);
  margin: 4px;
  padding: 18px 20px;
  box-shadow:
    0 -4px 0 0 var(--panel-edge), 0 4px 0 0 var(--panel-edge),
    -4px 0 0 0 var(--panel-edge), 4px 0 0 0 var(--panel-edge),
    0 8px 0 0 var(--panel-drop);
}
.btn {            /* primary, red */
  font: 600 18px 'Pixelify Sans'; color: #fff; background: var(--red);
  margin: 4px; padding: 12px 22px; min-height: 48px; border: 0;
  box-shadow:
    inset 0 -4px 0 0 var(--red-shade), inset 0 4px 0 0 var(--red-hi),
    0 -4px 0 0 var(--outline), 0 4px 0 0 var(--outline),
    -4px 0 0 0 var(--outline), 4px 0 0 0 var(--outline);
}
.btn.alt  { background: var(--btn-alt); color: var(--text); }   /* bevel colors from the table */
.btn.on   { background: var(--amber); color: var(--outline); }  /* active segment */
.btn.sm   { font-size: 15px; padding: 8px 14px; min-height: 44px; }
.btn:hover  { filter: brightness(1.12); }
.btn:active { transform: translateY(2px); }
.btn:focus-visible { outline: 3px solid var(--amber); outline-offset: 6px; }
```

Copy the exact shadow lists for `.alt` and `.on` from `reference/Main.dc.html`.

## 4. Sprites

All sprites are 16 x 16 art pixels unless noted. Files are in `sprites/`. Copy them to `public/sprites/`.

| File | Size | Notes |
| --- | --- | --- |
| `courtyard1-3`, `garden1-3`, `ice1-3`, `plank1-2`, `sanct1-2` | 16x16 | Base terrain tiles |
| `gate` | 16x16 | Tile at A1 (the gate, called "cabin" in the contract) |
| `pitcourtyard`, `pitgarden`, `pitice`, `pitplank`, `pitsanct` | 16x16 | Full pit tiles, drawn only at reveal |
| `relicOver` | 16x16 | Gold relic, drawn as an overlay on top of a terrain tile |
| `decCourtyard`, `decCourtyard2`, `decGarden`, `decIce`, `decPlank`, `decSanct` | 16x16 | Corner decoration overlays |
| `flagOver`, `qOver`, `hint` | 16x16 | Player marks (pit flag, question mark) and the lit-neighbor corner brackets |
| `pilSideSheet` | 32x16 | Two walk frames, facing east |
| `pilDownSheet` | 32x16 | Two walk frames, facing the camera |
| `brazierSheet` | 48x16 | Three flame frames |
| `fogA`, `fogB` | 64x64 | Tileable dithered fog, semi-transparent |
| `snowA`, `snowB` | 64x64 | Tileable snowflake layers |
| `wallH`, `wallSnow` | 16x16 | Temple wall frame and its snow cap |
| `lantern`, `relicIcon`, `coldIcon`, `glintIcon` | 12x12 | HUD icons (show at 36 or 48px) |
| `arrow` | 10x10 | D-pad arrow (white, rotate by CSS in 90 degree steps only) |
| `lock` | 8x8 | Encrypted marker in Chain view |
| `spark` | 5x5 | Reserved. The shipped sparkle is pure CSS (see 6.6) |

To change or add sprites, edit the matrices in `art-source/art.py` and `terrain.py`, run them locally to regenerate PNGs, and keep the 16 x 16 grid and palette.

## 5. Map and journey model

### 5.1 Regions (terrain is decoration, not game state)

`lib/zones.ts`. Rows are 1 to 8 top to bottom, columns A to H left to right, so `ZONES[row][col]`:

```
      A B C D E F G H
r1    G C C C T T T T
r2    C C C C T T T T
r3    C C T T T I I I
r4    C T T T I I I I
r5    T T I I I I B B
r6    T I I I B B B S
r7    I I I B B S S S
r8    I I B B S S S S
```

`G` gate, `C` courtyard, `T` frozen garden, `I` mirror lake (ice), `B` bell bridge, `S` the sanctum. The gate cell A1 belongs to chapter 1.

| Chapter | Name | Zone |
| --- | --- | --- |
| 1 | The Courtyard | C, G |
| 2 | Frozen Garden | T |
| 3 | Mirror Lake | I |
| 4 | Bell Bridge | B |
| 5 | The Sanctum | S |

Variant rule for the base tile (deterministic, same every run, same for every player):

```ts
function tileKey(cell: Cell): string {
  const z = zoneName(cell);                    // courtyard | garden | ice | plank | sanct
  const [c, r] = [col(cell), row(cell)];       // 0-based
  if (z === 'courtyard') return `courtyard${(c + r * 5) % 7 === 0 ? 3 : ((c * 3 + r) % 2 === 0 ? 1 : 2)}`;
  const n = { garden: 3, ice: 3, plank: 2, sanct: 2 }[z];
  return `${z}${(c * 3 + r * 5) % n + 1}`;
}
```

Decoration rule: a cell gets a decoration overlay when `(c * 5 + r * 3) % 4 === 0` and it is not A1. Key by zone: courtyard alternates `decCourtyard` (when `(c + r)` is even) and `decCourtyard2`, garden `decGarden`, ice `decIce`, plank `decPlank`, sanctum `decSanct`. At reveal, skip decoration on pit and relic cells.

**Hard rules**
- Terrain and decoration are functions of the cell only. They must never depend on hazards, treasure or any encrypted value. Otherwise the art leaks the map.
- All 63 non-gate cells must look walkable. No trees, walls or boulders. Decoration stays small and in a corner.
- The pit sprite is chosen by the zone of the pit cell: `pit` + zone name (`pitgarden`, `pitice`, ...). Courtyard uses `pitcourtyard`.

### 5.2 Journey

- **Current chapter** is the chapter of the player's current cell. It comes from the decrypted position (or the local prediction before decryption lands).
- **Chapters reached** is the set of chapters containing any cell the player has stood on. This is client-side, derived from the decrypted path so far, and never sent anywhere.
- When the pilgrim first enters a new chapter, show a **chapter banner** at the top of the Journey log (amber box, see 7.2) and add the log entry.
- On reveal, the ribbon shows reached chapters lit and the rest dimmed with the subtitle `The rest of the road stayed unseen`. If all five were reached, use `You crossed the whole road`.

### 5.3 Journey log (local only)

One entry per step, newest first, stored in `localStorage` keyed by run id. Never write it to the chain.

Entry title: `{Direction}. {Signals}.` where Direction is North, South, East or West, and Signals is `Quiet`, `Cold`, `Glint`, `Cold and Glint`, optionally prefixed with `Relic taken.` Example: `East. Relic taken. Cold.`

Entry flavor line:

| Situation | Line |
| --- | --- |
| Quiet | `Only the wind.` |
| Cold | `Your breath fogs. Something is below the stone.` |
| Glint | `A faint shine ahead.` |
| Cold and Glint | `Frost on your sleeve, and gold close by.` |
| Relic taken, with Cold | `You pocket it. The slabs feel thin here.` |
| Relic taken, otherwise | `Heavier. The lantern sways.` |

Show the newest 3 entries on the desktop board (4 if the banner is absent) and make the list scrollable with a fixed max height.

## 6. Board rendering

### 6.1 Structure (desktop)

```
Frame (144 x 144 art px = 576px): wall tiles repeating, snow cap on top edge, 4 braziers at corners
  Board (128 x 128 art px = 512px, 8x8 tiles of 16 art px), overflow hidden, background #151831
    1. Tiles (64 absolutely positioned divs)
    2. Path dots
    3. Torch glow
    4. Pilgrim
    5. Sparks (Glint only)
    6. Fog layers (fogA, fogB)
    7. Frost (Cold only)
    8. Snow (snowA)
```

Z-order from bottom: tiles 0, dots 3, glow 4, pilgrim 6, sparks 7, frost 8, snow 9. Wall frame and braziers sit outside the board (braziers z 7).

### 6.2 Cell states

| State | Rendering |
| --- | --- |
| Gate (A1) | `gate` sprite, never dimmed |
| Current cell | Terrain tile at full brightness |
| Visited | Terrain tile with `filter: brightness(.62) saturate(.85)` |
| Lit neighbor (not visited) | Terrain tile with `brightness(.58) saturate(.85)` plus the `hint` overlay blinking at 1.2s, `steps(1)`, 50% opacity |
| Unknown | Terrain tile with `brightness(.34) saturate(.65)` |

Visited, neighbor and unknown cells all show their terrain and decoration. No cell ever shows a pit or a relic during play. A relic you picked up shows the small `relicIcon` marker (12 art px) in its cell's bottom right corner.

### 6.3 Player marks

Local notes the player places by clicking an unknown or neighbor cell. Cycle on click: none, pit flag (`flagOver`), question mark (`qOver`), none. Stored in `localStorage` per run, never on chain. Marks are drawn over the tile at full brightness.

### 6.4 Path dots

For each consecutive pair of visited cells, draw 2 x 2 art pixel squares (`#FF9B4A`, with a `0 0 0 calc(var(--s) * .5) #14102A` outline) every 8 art pixels along the straight line between cell centers (center = 8 art px into the cell). Do not draw a segment to the current cell's center beyond the player sprite.

### 6.5 Torch glow

One div over the board, centered on the player's cell center, using three hard-stepped rings (no smooth gradient):

```
radial-gradient(circle at CENTER,
  rgba(255,181,71,.15) 0 20s, rgba(255,181,71,.085) 20s 34s, rgba(255,181,71,.035) 34s 50s, transparent 50s)
```

where `s` is `var(--s)`. Flicker animation: 2.4s steps(1), opacity 1, .82, .94, .76.

### 6.6 Signals on the board

- **Cold active:** show the frost layer, an inset box-shadow stepped frame (`2s`, `5s`, `9s` insets at .30, .16, .08 alpha of `rgba(168,208,240,x)`), pulsing opacity 1 to .6 every 3s with `steps(1)`.
- **Glint active:** three 1 art px gold sparks (`#FFE9A8` center with `#F2C14E` arms of 1 art px) placed around the player cell at offsets `(-4, 3)`, `(19, 2)`, `(18, 15)` art px, twinkling over 1.6s with staggered delays.
- Both can be active at once.

### 6.7 Fog

Two tiled layers over the board: `fogA` at 75% opacity drifting `(+64, -16)` art px per 40s linear, `fogB` at 35% opacity drifting `(-64, +24)` art px per 64s linear. Tile size is `64 * --s`.

### 6.8 Pilgrim

16 x 16 sprite, `background-size: 200% 100%`, two frames swapped by `background-position` with a 0.6s `steps(1)` loop, plus a 1.2s `steps(1)` loop that lifts the sprite 1 art px for the idle bob. Use `pilSideSheet` for horizontal moves. Use `pilDownSheet` when idle at a gate or in the replay. Mirror the side sheet with `scaleX(-1)` for westward moves (to build, see 10).

### 6.9 Movement

A move tweens the pilgrim between cell origins over 0.5s with `steps(16)` (one step per art pixel, so the motion stays on the pixel grid). While the tx and decrypt are pending the pilgrim keeps walking in place at the target cell (predicted position, see `ARCHITECTURE.md` on local prediction). On a mismatch after decrypt, snap to the decrypted cell and add a log line `The wind pushes you back.`

## 7. Screens

All copy below is final unless noted.

### 7.1 Start (1440 x 780)

- Full-bleed night scene. Sky is five hard bands (`#0A0C22` 0 to 22%, `#0F1230` to 40%, `#151945` to 58%, `#1D2257` to 74%, `#272E6C` to 100%). Three mountain ridges (`#20265A`, `#171B45`, `#0E1030`) drawn as 1 art px wide columns, snow caps `#3A4280`, `#2B3270` on the two far ridges. A stepped-roof pagoda (red roofs `#7A2E3E`, white snow line, amber windows, gold finial) stands on the far ridge near x = 250 art px of 360, with a plinth down to the ridge. 46 stars. Snow layers on top. See `reference/Start.dc.html` for the exact rectangles.
- Left block (padding 36px 56px): hero title `Whiteout`, tagline `The chain can’t see you die.` (32 / 600, max 20ch), paragraph `Climb a snowbound temple with one lantern and 24 steps. The map, your position and whether you still live stay encrypted until you finish.` (18, max 44ch), buttons `Connect wallet` (primary, 22px, min-height 60) and `Practice run` (alt), note `Practice runs play on your device, with nothing encrypted. Real runs need Sepolia ETH for gas.`
- Pilgrim (front view, `--s: 8px`, 128px) stands at the bottom right, bobbing.
- Three panels at the bottom, 300px wide each: `24 steps of oil` / `The storm closes at zero.`, `Bring relics home` / `Only if you finish alive.`, `Read the signals` / `Cold means a pit is near.`
- Header: network dot with `Sepolia`, and an alt button `Leaderboard`.

### 7.2 Board (1440 x 1060)

Header (padding 20px 40px 12px): mini pilgrim 48px, logo, run chip `Run No. 0042`, segmented control `Split` / `Your view` / `Chain view` (active one uses `.btn.on`), network dot plus `Sepolia`, mono address.

Main row, centered, gap 40px, three columns:

**Left, 300px, panels stacked with 20px gap**
1. `Lantern oil` panel: lantern icon 48px, title, sub `Each step burns one.`, big number (steps left), `of 24 left`, then 24 pips in 12 columns, 12px each, 6px gap. Spent pips are `.off` (first), remaining pips `.on` (amber, shade `#F26B3A`).
2. `Pack`: relic icons 48px (one per carried relic) and `{n} relics`, sub `The gate at A1 is {d} steps away. Relics count only if you finish alive at the gate.`, row with lock icon, `Alive`, sub `only you can tell`.
3. `Signals at {cell}`: sub `Decrypted just for you.` Two rows, each a dark `#12153A` box with a 4px inset border (Cold `#3C86B0`, Glint `#B8862B`), 48px icon, label 20 / 600, sub. Cold: `A pit is next to you`. Glint: `Treasure is next to you`. An inactive signal is the same box dimmed to 40% opacity with sub `Nothing here`.

**Center, 576px**
1. Journey ribbon panel: heading `Chapter {n} of 5`, right sub `Where this road has led you so far`. Five nodes (72px wide): 40px tile image of `courtyard1`, `garden1`, `ice1`, `plank1`, `sanct1` with a 4px outline, label below (13px). Current node: 4px amber ring, amber label, mini pilgrim (`--s: 2px`) standing above it. Reached nodes: normal. Not reached: `brightness(.38) saturate(.5)` and muted label. Between nodes a 4px dashed line (`8px` on, `8px` off), amber if both ends are reached or the next node is current, else `#3A4180`.
2. Pennant strip (12 flags, colors `#4C7BD9 #EAF1F7 #D6423A #4FBF9F #F2C14E` repeating, 24 x 28 triangles, flapping 1.6s `steps(1)` with 0.4s stagger groups).
3. Framed board.
4. Controls row, 22px below: four D-pad keys (56 x 56 `.btn.alt`, arrows rotated 0, 270, 180, 90 for N, W, S, E), flexible gap, `Finish run` primary button.

**Right, 340px**
1. `Journey log` panel (see 5.3). Sub `Your notes. They stay in this browser.` Chapter banner when the latest step entered a new chapter: amber-tinted box (`#3A2A12` with 4px inset `#B8862B`), 32px tile thumbnail of the chapter, `Chapter {n}, step {k}` and `You enter the {Chapter name}`.
2. `Chain view` panel (stone): sub `What an explorer sees for run No. {id}.` Table with columns `Question`, `You`, `Chain`. Rows: `Where am I?` (you: cell, chain: position handle), `Am I alive?` (you: Yes or No, chain: alive handle), `Where are the pits?` (you: `{cell} +`, chain: hazards handle). The chain column shows a lock icon and the handle shortened as `0xc10e…5a98`. Footer sub: `Same call every step. Nothing here says which way I went or whether I am alive.`

The `Split` / `Your view` / `Chain view` control: `Split` shows all three columns (default). `Your view` hides the Chain view panel and widens the board region. `Chain view` shows only the Chain view panel, expanded, with the handles and the last transactions list (see `reference/Reveal.dc.html` for the list styling). This toggle is a headline demo feature; keep it fast and obvious.

### 7.3 Reveal (1440 x 1020)

Same header, with a green `Finalized` chip. Fog is gone, all 64 tiles are shown at full brightness. Pits use the zone pit tiles, missed relics use `relicOver` on their terrain tile, picked-up relics keep the small marker, decoration skips pit and relic cells.

- **Left:** `Score` panel with the score at 112px, one `relicIcon` per relic, a red `Home alive` stamp (use `Out of oil` or `Lost in the storm` for other endings, see below), sub `Back at the gate with {n} relics and {k} steps of oil left.` Facts panel: `Steps used`, `Missed`, `Closest call`. `Replay` panel: 14 white pips (one per step used), back key, `Play again`, forward key, sub `Runs in your browser. Nothing is sent.`
- **Center:** the journey ribbon (`Reached {n} of 5 chapters`, see 5.2), the revealed framed board with path dots and the replay pilgrim (front sprite) walking the path: 8% hold, then constant per-step tween with `steps(16)` between cells, 90% hold, loop 12s. Below: legend (`Your path`, `Pit`, `Taken`, `Missed relic`) and the sentence `The fog is gone because finishing opened the map. Every tile here comes from values you can check on Sepolia.`
- **Right:** `Check the run` panel with three numbered steps (`Finish opens the map`, `The network signs the values`, `The contract checks it`) and `Revealed values` (pits hex, relics hex, moves, finalize tx, button `Open on Etherscan`).

Ending stamps (final scores follow `GAME_DESIGN.md`): finished alive at the gate = `Home alive` (red); storm closed before reaching the gate = `Out of oil` (alt fill); died on a pit = `Lost in the storm` (alt fill). The player only learns they died at Finish, so in `Lost in the storm` the replay pilgrim stops at the death cell and the sprite there is replaced by a small cairn (to be drawn, see 10).

### 7.4 Mobile (390 x 844, `--s: 3px`)

Single column, 10px top padding, in this order: logo and run chip, lantern row (icon, number, `of 24 steps left`, relic icons), 24 pips in one row (10px each, space-between), chapter row (`Chapter {n} of 5` plus chapter name left, five 22px mini tiles right, current one with amber ring), the board at 384 x 384 centered with a 4px edge, Cold and Glint boxes side by side, D-pad (3 x 3 grid of 52px keys) left and `Chain view` / `Finish run` buttons right, pinned to the bottom. Chain view opens as a bottom sheet, not a column.

## 8. Data binding (what is private)

| UI element | Source | Visibility |
| --- | --- | --- |
| Pilgrim cell, signals, alive, relics carried | User decryption of the run's ciphertext handles (EIP-712 permit, relayer SDK) | Only the player |
| Steps left | `MAX_MOVES - moves` (public counter) | Public |
| Chain view handles | Ciphertext handles read from the contract (`bytes32`) | Public |
| Pits, relics at start, path, score on Reveal | Public decryption after `finish` (`checkSignatures` in `finalize`) | Public after finish |
| Terrain, decoration, chapters | Static client constants (`ZONES`) | Public, never derived from hidden data |
| Journey log, marks, reached chapters | Client-side from decrypted values | Local only |

Do not render a pit, relic or hazard-derived hint anywhere before Reveal. The two signal boxes are the only hazard-related UI during play.

Practice mode: runs entirely in the browser with a local plaintext engine, labeled with a persistent chip `Practice run, nothing is encrypted` in the header. It must be impossible to confuse with a real run (different chip, no Chain view panel, no wallet).

## 9. States, motion and accessibility

### 9.1 Loading and error states

| State | UI |
| --- | --- |
| Wallet not connected | Start screen CTA `Connect wallet` |
| Wrong network | Banner under header: `Switch to Sepolia to play.` with button `Switch network` |
| Starting a run | `Start run` button disabled, label `Lighting the lantern...`; lantern icon flickers |
| Move submitted | Pilgrim walks to the predicted cell, D-pad disabled, queue one pending input |
| Decrypting signals | Signals panel boxes show `Reading the wind...` (pulsing, `steps(1)`) |
| Relayer or tx error | Inline panel above the D-pad: `That step did not go through. Your lantern is unchanged. Try again.` plus a `Retry` button. State what failed in one sentence, no apology |
| Finalizing | Reveal screen shows the `Check the run` steps with step 2 or 3 marked in progress |

Loading labels use three plain period characters, or an animated ellipsis stepped with `steps(1)`.

### 9.2 Motion inventory

Snow layers (9s and 14s linear), fog drift (40s, 64s), brazier flames (0.45s, three frames), pilgrim walk (0.6s) and bob (1.2s), torch flicker (2.4s), pennant flap (1.6s), frost pulse (3s), spark twinkle (1.6s), hint blink (1.2s), replay walk (12s loop), `steps(1)` or `steps(16)` timing everywhere so motion stays on the pixel grid.

`@media (prefers-reduced-motion: reduce)` disables every one of these (`animation: none`). The game must stay fully playable and legible with all animation off.

### 9.3 Accessibility

- Keyboard: arrow keys and WASD move, Enter finishes after a confirmation step built into the page (no `confirm()`), focus ring `3px solid #FFB547` with 6px offset.
- Touch targets at least 44 x 44. D-pad keys are 56 (desktop) and 52 (mobile).
- Every sprite that carries meaning has an accessible name (`aria-label` or `role="img"`): cabin sprite is `Gate`, pit flag is `Marked as pit`, relic marker is `Relic taken`. Decorative overlays use empty alt.
- The lantern number and pips expose `aria-label="15 of 24 steps left"`.
- Text contrast at least 4.5:1 on its panel. Do not put body text on animated snow; snow sits behind panels.
- Announce signals and chapter changes through an `aria-live="polite"` region (`Cold. Glint.`, `You enter the Frozen Garden.`).

## 10. Not designed yet (build as simple placeholders, flag in your summary)

1. Pilgrim sprites for north, south and west (only east side and front view exist). West can be a CSS mirror of east. North needs a back view.
2. Event animations: relic pickup (sparkle burst), chapter transition card, death reveal at Finish, the fog-lift on Reveal.
3. Sound: footsteps in snow, relic chime, heartbeat on Cold. Optional, off by default, with a mute control.
4. Cairn sprite for the `Lost in the storm` ending.
5. Leaderboard screen (use the same panels and pip counters; list rank, address, score, steps).
6. Daily mode and ghost race (stretch goals in `GAME_DESIGN.md`).

## 11. Terminology

The UI says **Gate** where the contract and docs say **cabin**. Keep identifiers (`CABIN`, `cabin`) in code as they are. User-facing strings use: Gate, relic (treasure), lantern oil (steps left), pit, Cold, Glint, chapter, Journey log, Chain view, Your view.

## 12. Acceptance checklist

- [ ] All four screens match the reference at 1440 x 1060 (board), 1440 x 1020 (reveal), 1440 x 780 (start) and 390 x 844 (mobile); pixel art is crisp, no blurred scaling.
- [ ] Scale is controlled by one `--s` variable; changing it from 4px to 3px resizes the board without layout bugs.
- [ ] Terrain, decoration and pit variants follow the rules in 5.1; a test asserts `tileKey` and `decor` take only a cell as input.
- [ ] No hazard or treasure information is visible before Reveal (manual check plus a test that the Board component never receives hazard data until the run is finalized).
- [ ] Chain view toggle works and shows identical-looking handles for different runs.
- [ ] Cold and Glint effects appear only when the decrypted signal is true.
- [ ] Reduced motion fully disables animation and the game remains usable.
- [ ] Keyboard-only play works end to end, including Finish.
- [ ] Fonts load through `next/font` with sensible fallbacks; layout survives a fallback font without overflow (see the reference PNGs, which were rendered with fallbacks).
- [ ] Lighthouse accessibility score of 95 or higher on Start and Board.
