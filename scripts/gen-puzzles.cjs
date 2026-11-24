// Generates tactical puzzles by self-play with Stockfish (lite) and verifies uniqueness.
// Usage: node scripts/gen-puzzles.cjs <seed> <count> <outfile>
const { createEngine } = require("./sfnode.cjs");
const { Chess } = require("chess.js");
const fs = require("fs");

let seed = +process.argv[2] || 1;
const target = +process.argv[3] || 50;
const out = process.argv[4] || "puzzles.json";
const MATE_MODE = process.env.MODE === "mate";
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const score = (l) => (l.mate != null ? (l.mate > 0 ? 100000 - l.mate * 100 : -100000 - l.mate * 100) : l.cp);
const material = (ch, color) => ch.board().flat().filter(Boolean).reduce((s, p) => s + (p.type === "k" ? 0 : (p.color === color ? 1 : -1) * VAL[p.type]), 0);
const uci = (m) => m.from + m.to + (m.promotion || "");

function isUnique(lines) {
  const [a, b] = lines;
  if (!a) return false;
  if (a.mate != null && a.mate > 0) return !b || b.mate == null || b.mate <= 0 || b.mate > a.mate + 2;
  if (a.cp == null || a.cp < 250) return false;
  if (!b) return true;
  if (b.mate != null) return b.mate < 0;
  return b.cp <= a.cp - 300 && b.cp < 200;
}

function forkTheme(ch, move) {
  // after move: does moved piece attack >=2 valuable enemy pieces?
  const me = move.color, opp = me === "w" ? "b" : "w";
  let targets = 0;
  for (const row of ch.board()) for (const sq of row) {
    if (!sq || sq.color !== opp || sq.type === "p") continue;
    const attackers = ch.attackers(sq.square, me);
    if (!attackers.includes(move.to)) continue;
    const defended = ch.attackers(sq.square, opp).length > 0;
    if (sq.type === "k" || VAL[sq.type] > VAL[move.piece] || !defended) targets++;
  }
  return targets >= 2;
}

(async () => {
  const eng = await createEngine();
  const puzzles = [];
  const seen = new Set();
  let games = 0;
  while (puzzles.length < target) {
    games++;
    const ch = new Chess();
    let prevBest = 0; // eval for side to move
    for (let ply = 0; ply < 140 && !ch.isGameOver(); ply++) {
      const fenP = ch.fen();
      const a = await eng.analyse(fenP, { depth: 7, multipv: 4 });
      if (!a.lines.length) break;
      // weak-ish move selection
      let idx = 0;
      const r = rand();
      if (ply < 8) idx = Math.floor(rand() * Math.min(4, a.lines.length));
      else if (r < 0.12) idx = a.lines.length - 1;
      else if (r < 0.3) idx = Math.min(1, a.lines.length - 1);
      const evalP = score(a.lines[0]);
      const chosen = a.lines[idx].pv[0];
      const blunder = ch.move({ from: chosen.slice(0, 2), to: chosen.slice(2, 4), promotion: chosen[4] });
      if (MATE_MODE) { if (ply < 10) continue; }
      else if (ply < 10 || Math.abs(evalP) > 150 || idx === 0) continue;
      // Check puzzle at Q
      const fenQ = ch.fen();
      if (seen.has(fenQ.split(" ").slice(0, 4).join(" "))) continue;
      const q = await eng.analyse(fenQ, { depth: 15, multipv: 2 });
      if (!isUnique(q.lines)) continue;
      if (MATE_MODE && !(q.lines[0].mate > 0 && q.lines[0].mate <= 3)) continue;
      // build solution
      const sim = new Chess(fenQ);
      const solver = sim.turn();
      const startMat = material(sim, solver);
      const sol = [];
      const themes = new Set();
      let lines = q.lines, ok = true, firstQuiet = false, sac = false;
      for (let k = 0; k < 4; k++) {
        if (sim.moves().length < 2) { ok = false; break; }
        const mv = lines[0].pv[0];
        const m = sim.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
        sol.push(uci(m));
        if (k === 0 && !m.captured && !sim.inCheck()) firstQuiet = true;
        if (m.promotion) themes.add("promotion");
        if (forkTheme(sim, m)) themes.add("fork");
        if (sim.isCheckmate()) { themes.add("mate"); themes.add("mateIn" + (k + 1)); break; }
        if (sim.isGameOver()) { ok = false; break; }
        const rep = await eng.analyse(sim.fen(), { depth: 14, multipv: 1 });
        const rmv = rep.best;
        if (!rmv || rmv === "(none)") { ok = false; break; }
        const rm = sim.move({ from: rmv.slice(0, 2), to: rmv.slice(2, 4), promotion: rmv[4] });
        if (k === 0 && material(sim, solver) < startMat - 1) sac = true;
        const nx = await eng.analyse(sim.fen(), { depth: 15, multipv: 2 });
        if (!isUnique(nx.lines)) { sol.push(uci(rm)); break; }
        sol.push(uci(rm));
        lines = nx.lines;
      }
      if (!ok) continue;
      // must end on solver move
      if (sol.length % 2 === 0) sol.pop();
      if (!sol.length) continue;
      // require something concrete happening
      const tmp = new Chess(fenQ); let concrete = false;
      for (const s of sol) { const m = tmp.move({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] }); if (m.color === solver && (m.captured || m.promotion || tmp.inCheck())) concrete = true; }
      if (!concrete) continue;
      const nSolver = Math.ceil(sol.length / 2);
      if (sac) themes.add("sacrifice");
      const pieces = new Chess(fenQ).board().flat().filter((p) => p && p.type !== "p" && p.type !== "k").length;
      if (pieces <= 4) themes.add("endgame");
      if (!themes.has("mate")) {
        const first = new Chess(fenQ).move({ from: sol[0].slice(0, 2), to: sol[0].slice(2, 4), promotion: sol[0][4] });
        if (nSolver === 1 && first.captured) themes.add("hangingPiece");
        themes.add(lines[0].mate ? "crushing" : (q.lines[0].cp > 500 ? "crushing" : "advantage"));
      }
      let rating = 700 + 280 * (nSolver - 1);
      if (themes.has("mateIn1")) rating -= 100;
      if (firstQuiet) rating += 250;
      if (sac) rating += 250;
      if (themes.has("fork")) rating += 100;
      rating += Math.round((rand() - 0.5) * 120);
      seen.add(fenQ.split(" ").slice(0, 4).join(" "));
      puzzles.push({ id: `g${process.argv[2]}-${puzzles.length}`, fen: fenP, moves: [uci(blunder), ...sol], rating: Math.max(500, Math.min(2400, rating)), themes: [...themes] });
      process.stderr.write(`#${puzzles.length} game ${games} ${sol.join(" ")} ${[...themes]}\n`);
      fs.writeFileSync(out, JSON.stringify(puzzles));
      ply += 6; // continue the game, skip a few plies for variety
    }
  }
  fs.writeFileSync(out, JSON.stringify(puzzles));
  process.exit(0);
})();
