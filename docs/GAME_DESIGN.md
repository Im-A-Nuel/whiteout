# Whiteout: Game Design

Everything here is a design target. Numbers marked **(tune)** are hypotheses to be settled by the balance simulator and playtests, not facts.

## 1. Pitch

A solo roguelike on an 8x8 snowfield. The map is hidden, your position is hidden, and your death is hidden. You navigate by two private signals and a step counter. The chain learns nothing until you finish, then the fog lifts and the whole run becomes verifiable.

Design pillars:

1. **Dying is private.** This is the core insight. Public death is a hazard disclosure.
2. **One wallet is enough.** A judge can play a full run alone, with no opponent online.
3. **Ten seconds to learn.** Four directions, two signals, one goal.
4. **Everything revealed at the end.** Trust comes from the final reveal and the replay, not from a promise.

## 2. Board

- 8x8 grid, 64 cells, cell index `i = row * 8 + col`, bit `i` of a 64-bit word.
- **Cabin** at index 0 (top-left). It is always safe and is the only place a run can be finished for a score.
- **Hazards (pits):** each cell is a pit with probability 1/8, so about 8 pits per map **(tune)**.
- **Treasure:** each non-pit, non-cabin cell holds treasure with probability about 1/8, so about 8 treasures **(tune)**.
- **Safe zone:** cells 0, 1 and 8 (the cabin and its two neighbors) are never pits, so the first step cannot kill you.

Density comes from ANDing three uniform random 64-bit words (each bit is 1 with probability 1/2, so the AND is 1 with probability 1/8). Counts are binomial, so maps vary: some are gentle, some brutal. That variance is part of the roguelike feel, but see section 9 for the guardrail.

## 3. Turn structure

- A run has **24 steps** **(tune)**. A step is one `move` transaction.
- The step counter is public. Nothing else about a step is.
- Directions: North (up), South (down), West (left), East (right).
- Moving into a wall means you stay in place and the step is still spent (a "bump"). Bumps are indistinguishable from real moves to everyone except you.
- After you die, further moves are accepted and do nothing. Observers cannot tell you are dead.
- You can press **Finish** at any time. The run also auto-ends after step 24.

## 4. Signals

After each step you can privately decrypt two booleans about your new cell's four orthogonal neighbors:

| Signal | Meaning | Chance on a random cell |
| --- | --- | --- |
| Cold | at least one neighboring cell is a pit | about 41% |
| Glint | at least one neighboring cell holds treasure | about 41% |

Why booleans and not counts: a population count over a 64-bit word is expensive under FHE, and a yes/no signal already supports real deduction. Counts are a stretch goal (see section 10).

The player combines signals across steps to deduce pit locations, like Minesweeper but with a movement clock, hidden position tracking, and no safe undo.

## 5. Scoring

- Each treasure is worth 1 point and is consumed when picked up.
- **Score = treasures carried, if you are alive and standing on the cabin at Finish. Otherwise 0.**
- Auto-end at step 24 uses the same rule, so you must plan the walk home.

The all-or-nothing return rule creates the tension: greed is punished by the storm clock, not by a visible monster.

Per-run score range is roughly 0 to 8. A competent player should land around 2 to 4 **(tune)**. Target death or zero rate for competent play: 40 to 60 percent **(tune)**.

## 6. What is public and what is private

| Information | Who can see it |
| --- | --- |
| That a run started, by whom | Everyone |
| Number of steps taken | Everyone |
| Direction of each step | Only the encrypted input, nobody |
| Your position | You (user decryption) |
| Alive or dead | You |
| Cold and Glint signals | You |
| Treasure count | You |
| The map (pits and treasure) | Nobody until Finish, then everyone |
| Your path | Nobody until Finish, then everyone |
| Final score | Everyone, after Finish, with a KMS proof |

## 7. UX

Screens and states:

1. **Connect and fund.** Wallet connect, Sepolia check, link to a faucet if balance is low.
2. **Lobby.** Start run, leaderboard, "how it works".
3. **Board.**
   - 8x8 grid in heavy fog. The player's own tracked position is drawn from local state.
   - D-pad and arrow keys. Steps remaining as a storm bar.
   - Signal panel with two icons: Cold and Glint. State is "decrypting", then on or off.
   - A calm "alive" indicator that flips to "you fell" privately when the decrypted flag says so.
   - A running note of deductions (the player can mark cells as suspected pits, local only).
4. **Chain view vs Your view.** A toggle that shows what an explorer sees (opaque handles, identical transactions) next to what the player sees. This is the main storytelling device for the confidentiality criterion.
5. **Finish and reveal.** The fog lifts across the board, the map appears, the path animates as a replay, the score is stamped.
6. **Leaderboard.** Best scores per address, built from `RunFinalized` events.

Latency handling: each step needs a transaction plus a relayer user-decrypt. Show a visible "decrypting" state, allow the next input to be queued locally, and never block the board on a spinner without feedback.

Client-side position prediction: the client can compute its own position locally from its own inputs (deterministic movement rules), so the board stays responsive. An optional "verify" button decrypts the onchain position and confirms they match.

## 8. Fairness story

- The map is produced by `randEuint64` inside `startRun`, before the player has made any choice, and stored encrypted.
- Because the map is encrypted, a player cannot simulate a run and selectively revert a bad roll. The result is unreadable, so there is nothing to cherry-pick.
- At Finish, hazards, treasure and the packed path are made publicly decryptable. Anyone can fetch the cleartext with its KMS proof and replay the run against the same deterministic rules.
- The reveal cannot change the outcome of past runs and does not help future runs, since every run gets a fresh map.

## 9. Known design risks and guardrails

| Risk | Guardrail |
| --- | --- |
| A map with too many pits or zero treasure | Clamp via a retry rule only if simulation shows the tails hurt. Default: accept variance |
| Treasure unreachable behind pits | Accept, it is rare and part of the roguelike. Document it |
| Slow loop (tx plus decrypt per step) | Local position prediction, queued input, visible progress states |
| Players probing a shared map across wallets | Only matters in the daily mode stretch goal. Fresh random map per run avoids it |
| Dead players stop playing | The "silent death" still lets them finish for a reveal and replay, which is a payoff in itself |

## 10. Stretch goals (in priority order)

1. **Replay viewer and share card.** After Finish, a shareable replay of the run on the revealed map. High value for the demo and social post.
2. **Queued moves.** Submit up to 3 steps in one transaction. Fewer waits, and a real mechanic (running blind vs walking carefully). Needs an HCU check.
3. **Daily whiteout.** One shared map per day, one attempt per address, revealed at day end. Note: many wallets can pool private signals to map the board, which turns it into a community puzzle. Treat that as a feature, not a bug.
4. **Count signals.** Replace booleans with 0 to 4 neighbor counts.
5. **cUSDT entry fee and prize pot** using ERC-7984. Only after everything above is stable. It is not required by the judging criteria.

## 11. Out of scope

Multiplayer, real-time play, procedural art beyond a clean board, token economy, mobile native app.
