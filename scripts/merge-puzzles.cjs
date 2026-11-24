// Merges generated puzzle files into src/data/puzzles.json (dedup by position), adds extra themes.
// Usage: node scripts/merge-puzzles.cjs file1.json file2.json ...
const fs = require('fs');
const { Chess } = require('chess.js');
const out = 'src/data/puzzles.json';
const all = new Map();
for (const p of JSON.parse(fs.readFileSync(out, 'utf8'))) all.set(p.fen.split(' ').slice(0, 4).join(' '), p);
for (const f of process.argv.slice(2)) {
  for (const p of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const key = p.fen.split(' ').slice(0, 4).join(' ');
    if (all.has(key)) continue;
    // validate & enrich
    const c = new Chess(p.fen);
    let ok = true, last;
    for (const u of p.moves) { try { last = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { ok = false; break; } }
    if (!ok) continue;
    const themes = new Set(p.themes);
    if (c.isCheckmate() && (last.piece === 'r' || last.piece === 'q') && (last.to[1] === '8' || last.to[1] === '1')) {
      const kingRank = last.color === 'w' ? '8' : '1';
      if (last.to[1] === kingRank) themes.add('backRank');
    }
    all.set(key, { ...p, themes: [...themes] });
  }
}
const list = [...all.values()];
// keep existing ids stable, number new puzzles after the highest id
let next = Math.max(0, ...list.filter((p) => /^\d+$/.test(p.id)).map((p) => +p.id)) + 1;
for (const p of list) if (!/^\d+$/.test(p.id)) p.id = String(next++);
fs.writeFileSync(out, JSON.stringify(list));
console.log(list.length, 'puzzles');
