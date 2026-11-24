// Verifies lessons and openings: run with `node --experimental-strip-types scripts/verify-data.ts`
import { Chess } from 'chess.js';
import { COURSES } from '../src/data/lessons.ts';
import { OPENINGS } from '../src/lib/openings.ts';

let errors = 0;
const err = (m: string) => { errors++; console.error('✗', m); };
for (const c of COURSES) for (const l of c.lessons) l.steps.forEach((s, i) => {
  const where = `${l.id}#${i}`;
  if (!s.fen) return;
  let ch: Chess;
  try { ch = new Chess(s.fen); } catch (e) { err(`${where} bad fen ${e}`); return; }
  if (s.task) {
    const t = s.task;
    for (const a of t.accept ?? []) {
      const c2 = new Chess(s.fen);
      try { c2.move({ from: a.slice(0, 2), to: a.slice(2, 4), promotion: a[4] }); } catch { err(`${where} illegal accept ${a}`); }
    }
    t.moves.forEach((u, k) => {
      try { ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { err(`${where} illegal move ${u} (#${k})`); }
    });
    if (t.mate && !ch.isCheckmate()) err(`${where} claims mate but not mate`);
  }
});
for (const o of OPENINGS) {
  const ch = new Chess();
  for (const m of o.moves.split(' ')) { try { ch.move(m); } catch { err(`opening ${o.name}: illegal ${m}`); break; } }
}
console.log(errors ? `${errors} error(s)` : 'All lesson & opening data OK');
process.exit(errors ? 1 : 0);
