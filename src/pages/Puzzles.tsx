import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import Board from '../components/Board';
import { CoachBubble } from '../components/Widgets';
import { PUZZLES, THEMES, type Puzzle } from '../data/puzzles';
import { fig, uciToMove } from '../lib/chessUtil';
import { moveSound, play } from '../lib/sound';
import { store } from '../lib/storage';
import { navigate } from '../App';

type Status = 'intro' | 'solving' | 'wrong' | 'solved' | 'shown';

function pickPuzzle(rating: number, theme: string, exclude: Set<string>): Puzzle {
  const pool = PUZZLES.filter((p) => (theme === 'all' || p.themes.includes(theme)) && !exclude.has(p.id));
  const list = pool.length ? pool : PUZZLES.filter((p) => theme === 'all' || p.themes.includes(theme));
  const near = [...list].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, 12);
  return near[Math.floor(Math.random() * near.length)] ?? PUZZLES[0];
}

export default function Puzzles() {
  const [ps, setPs] = useState(store.puzzleState());
  const [theme, setTheme] = useState('all');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => pickPuzzle(ps.rating, 'all', new Set(ps.solved)));
  const [step, setStep] = useState(0); // index into puzzle.moves of the next move to play
  const [status, setStatus] = useState<Status>('intro');
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [wrongFen, setWrongFen] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const positions = useMemo(() => {
    const c = new Chess(puzzle.fen);
    const fens = [c.fen()];
    const moves = puzzle.moves.map((u) => {
      const m = uciToMove(c, u)!;
      fens.push(c.fen());
      return m;
    });
    return { fens, moves };
  }, [puzzle]);
  const solverColor = new Chess(positions.fens[1]).turn();
  const orientation = solverColor === 'w' ? 'white' : 'black';

  // start: play the opponent's first move after a short delay
  useEffect(() => {
    setStep(0); setStatus('intro'); setFailed(false); setHint(0); setDelta(null); setWrongFen(null);
    timer.current = window.setTimeout(() => {
      moveSound(positions.moves[0]);
      setStep(1);
      setStatus('solving');
    }, 700);
    return () => clearTimeout(timer.current);
  }, [puzzle, positions]);

  const finish = (success: boolean) => {
    const s = store.puzzleState();
    const already = s.solved.includes(puzzle.id) || s.failed.includes(puzzle.id);
    let d = 0;
    if (!already) {
      const expected = 1 / (1 + Math.pow(10, (puzzle.rating - s.rating) / 400));
      d = Math.round(32 * ((success ? 1 : 0) - expected));
      s.rating = Math.max(100, s.rating + d);
    }
    if (success) {
      if (!s.solved.includes(puzzle.id)) s.solved.push(puzzle.id);
      s.streak += 1;
      s.best = Math.max(s.best, s.streak);
    } else {
      if (!s.failed.includes(puzzle.id)) s.failed.push(puzzle.id);
      s.streak = 0;
    }
    store.savePuzzleState(s);
    setPs({ ...s });
    setDelta(already ? null : d);
  };

  const onMove = (uci: string) => {
    if (status !== 'solving') return;
    const fen = positions.fens[step];
    const c = new Chess(fen);
    const m = uciToMove(c, uci);
    if (!m) return;
    const expected = puzzle.moves[step];
    const correct = uci === expected || c.isCheckmate();
    if (!correct) {
      moveSound(m);
      play('error');
      setWrongFen(c.fen());
      setStatus('wrong');
      if (!failed) { setFailed(true); finish(false); }
      timer.current = window.setTimeout(() => { setWrongFen(null); setStatus('solving'); }, 900);
      return;
    }
    moveSound(m);
    const next = step + 1;
    if (next >= puzzle.moves.length || c.isCheckmate()) {
      setStep(puzzle.moves.length);
      setStatus('solved');
      play('success');
      if (!failed) finish(true);
      return;
    }
    setStep(next);
    timer.current = window.setTimeout(() => {
      moveSound(positions.moves[next]);
      setStep(next + 1);
      setHint(0);
    }, 450);
  };

  const showSolution = () => {
    if (!failed) { setFailed(true); finish(false); }
    setStatus('shown');
    let i = step;
    const playNext = () => {
      if (i >= puzzle.moves.length) return;
      moveSound(positions.moves[i]);
      i++;
      setStep(i);
      timer.current = window.setTimeout(playNext, 700);
    };
    playNext();
  };

  const nextPuzzle = (t = theme) => {
    const s = store.puzzleState();
    setPuzzle(pickPuzzle(s.rating, t, new Set([...s.solved, puzzle.id])));
  };

  const fen = wrongFen ?? positions.fens[Math.min(step, positions.fens.length - 1)];
  const last = wrongFen ? null : step > 0 ? positions.moves[step - 1] : null;
  const expectedMove = status === 'solving' && step < positions.moves.length ? positions.moves[step] : null;
  const shapes: DrawShape[] = [];
  if (expectedMove && hint >= 1) shapes.push({ orig: expectedMove.from as never, brush: 'green' });
  if (expectedMove && hint >= 2) shapes.push({ orig: expectedMove.from as never, dest: expectedMove.to as never, brush: 'green' });

  const solverMoves = positions.moves.filter((_, i) => i % 2 === 1);
  const themeNames = puzzle.themes.map((t) => THEMES[t]?.name).filter(Boolean);

  return (
    <div className="page game-layout">
      <div className="board-col">
        <div className="board-row">
          <Board fen={fen} orientation={orientation} movable={status === 'solving' && step % 2 === 1 ? orientation : null}
            lastMove={last ? [last.from, last.to] : null} onMove={onMove} shapes={shapes}
          />
        </div>
      </div>
      <div className="side-col">
        <div className="panel">
          <div className="panel-head">
            <span>🧩 Problèmes</span>
            <span className="rating-chip">Classement : <b>{ps.rating}</b></span>
          </div>
          <div className="puzzle-stats">
            <div><b>{ps.solved.length}</b><span className="small muted">résolus</span></div>
            <div><b>🔥 {ps.streak}</b><span className="small muted">série</span></div>
            <div><b>{ps.best}</b><span className="small muted">meilleure série</span></div>
          </div>
          <div className="coach-area">
            {status === 'intro' && <CoachBubble>Observez le coup de l'adversaire…</CoachBubble>}
            {status === 'solving' && (
              <CoachBubble tone="info" title={`${solverColor === 'w' ? '⚪ Les blancs' : '⚫ Les noirs'} jouent`}>
                <p>Trouvez le meilleur coup{solverMoves.length > 1 ? ` (${solverMoves.length} coups à trouver)` : ''}.</p>
                {step > 1 && <p className="muted small">Bien joué, continuez !</p>}
                {failed && <p className="muted small">Ce problème est compté comme échoué, mais vous pouvez continuer.</p>}
              </CoachBubble>
            )}
            {status === 'wrong' && <CoachBubble tone="bad" title="✗ Ce n'est pas le bon coup">Essayez encore !</CoachBubble>}
            {(status === 'solved' || status === 'shown') && (
              <CoachBubble tone={status === 'solved' && !failed ? 'good' : 'info'} title={status === 'solved' && !failed ? '✓ Bravo, problème résolu !' : 'Solution'}>
                {delta !== null && <p><b className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '+' : ''}{delta}</b> points de classement</p>}
                <p>Solution : {solverMoves.map((m) => fig(m.san)).join(', ')}</p>
                {themeNames.length > 0 && <p>Thème : {themeNames.join(', ')}.</p>}
                {puzzle.themes.map((t) => THEMES[t]?.explain).filter(Boolean).slice(0, 2).map((e, i) => <p key={i} className="small">{e}</p>)}
              </CoachBubble>
            )}
          </div>
          <div className="actions">
            {status === 'solving' || status === 'wrong' || status === 'intro' ? (
              <>
                <button className="btn" onClick={() => setHint((h) => Math.min(2, h + 1))} disabled={status !== 'solving'}>💡 Indice</button>
                <button className="btn" onClick={showSolution} disabled={status !== 'solving'}>👁 Solution</button>
                <button className="btn" onClick={() => nextPuzzle()}>⏭ Passer</button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => nextPuzzle()}>Problème suivant ▶</button>
                <button className="btn" onClick={() => setPuzzle({ ...puzzle })}>↺ Recommencer</button>
                <button className="btn" onClick={() => navigate(`/analysis?fen=${encodeURIComponent(positions.fens[1])}`)}>🔍 Analyser</button>
              </>
            )}
          </div>
          <div className="pad">
            <div className="small muted">Problème n° {puzzle.id} · difficulté {puzzle.rating}</div>
            <h4>Thèmes</h4>
            <div className="chips">
              {['all', ...Object.keys(THEMES)].filter((t) => t === 'all' || PUZZLES.some((p) => p.themes.includes(t))).map((t) => (
                <button key={t} className={`chip ${theme === t ? 'active' : ''}`} onClick={() => { setTheme(t); nextPuzzle(t); }}>
                  {t === 'all' ? 'Tous' : THEMES[t].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
