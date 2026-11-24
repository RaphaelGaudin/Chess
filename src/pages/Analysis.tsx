import { useEffect, useMemo, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import Board from '../components/Board';
import { EvalBar, Modal, MoveList, NavButtons, ReviewComment } from '../components/Widgets';
import { coachAnalyse, formatScore, getEngine, type Analysis as A } from '../lib/engine';
import { CLASS_INFO, describeEval, reviewMove, scoreOf, type MoveReview } from '../lib/coach';
import { START_FEN, formatLine, pvToSan, uciToMove } from '../lib/chessUtil';
import { detectOpening } from '../lib/openings';
import { moveSound } from '../lib/sound';

function parseParams() {
  const q = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q);
}

export default function Analysis() {
  const init = useMemo(() => {
    const p = parseParams();
    const pgn = p.get('pgn');
    const fen = p.get('fen');
    if (pgn) {
      const c = new Chess();
      try {
        c.loadPgn(pgn);
        const h = c.history({ verbose: true }) as Move[];
        const ply = p.get('ply');
        return { start: c.getHeaders()['FEN'] ?? START_FEN, ucis: h.map((m) => m.lan), view: ply !== null ? Math.min(+ply, h.length - 1) : h.length - 1 };
      } catch { /* ignore */ }
    }
    if (fen) {
      try { new Chess(fen); return { start: fen, ucis: [], view: -1 }; } catch { /* ignore */ }
    }
    return { start: START_FEN, ucis: [] as string[], view: -1 };
  }, []);

  const [start, setStart] = useState(init.start);
  const [ucis, setUcis] = useState<string[]>(init.ucis);
  const [view, setView] = useState(init.view);
  const [flipped, setFlipped] = useState(false);
  const [live, setLive] = useState<A | null>(null);
  const [engineOn, setEngineOn] = useState(true);
  const [review, setReview] = useState<MoveReview | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { fens, moves } = useMemo(() => {
    const c = new Chess(start);
    const fens = [start];
    const moves: Move[] = [];
    for (const u of ucis) {
      const m = uciToMove(c, u);
      if (!m) break;
      moves.push(m);
      fens.push(c.fen());
    }
    return { fens, moves };
  }, [start, ucis]);
  const fen = fens[view + 1];

  // live engine
  useEffect(() => {
    const eng = getEngine('live');
    eng.stop();
    setLive(null);
    if (!engineOn) return;
    const c = new Chess(fen);
    if (c.isGameOver()) return;
    eng.analyse(fen, { depth: 22, multipv: 3, onInfo: (a) => setLive(a) }).then((a) => { if (a) setLive(a); });
    return () => eng.stop();
  }, [fen, engineOn]);

  // coach review of the displayed move
  useEffect(() => {
    setReview(null);
    if (view < 0) return;
    let cancel = false;
    const before = fens[view], after = fens[view + 1];
    Promise.all([coachAnalyse(before, 12, 2), coachAnalyse(after, 12, 2)]).then(([a0, a1]) => {
      if (cancel) return;
      setReview(reviewMove(before, ucis[view], a0, a1, moves.map((m) => m.san), view));
    });
    return () => { cancel = true; };
  }, [view, fens, ucis, moves]);

  const onMove = (uci: string) => {
    const c = new Chess(fen);
    const m = uciToMove(c, uci);
    if (!m) return;
    moveSound(m);
    // if same as next move in line, just advance
    if (ucis[view + 1] === uci) { setView(view + 1); return; }
    setUcis([...ucis.slice(0, view + 1), uci]);
    setView(view + 1);
  };

  const score = live && live.fen === fen ? scoreOf(fen, live) : null;
  const shapes: DrawShape[] = [];
  if (live && live.fen === fen && engineOn) {
    live.lines.slice(0, 3).forEach((l, i) => {
      const u = l.pv[0];
      if (u) shapes.push({ orig: u.slice(0, 2) as never, dest: u.slice(2, 4) as never, brush: i === 0 ? 'paleBlue' : 'paleGrey' });
    });
  }
  const mv = view >= 0 ? moves[view] : null;
  const opening = detectOpening(moves.slice(0, view + 1).map((m) => m.san));
  const startNo = +start.split(' ')[5];
  const blackFirst = start.split(' ')[1] === 'b';

  return (
    <div className="page game-layout">
      <div className="board-col">
        <div className="board-row">
          <EvalBar score={score} orientation={flipped ? 'black' : 'white'} />
          <Board fen={fen} orientation={flipped ? 'black' : 'white'} movable="both" lastMove={mv ? [mv.from, mv.to] : null} onMove={onMove} shapes={shapes}
            badge={mv && review ? { square: mv.to, symbol: CLASS_INFO[review.classification].symbol, color: CLASS_INFO[review.classification].color } : null} />
        </div>
      </div>
      <div className="side-col">
        <div className="panel">
          <div className="panel-head">
            <span>🔍 Analyse</span>
            <label className="small"><input type="checkbox" checked={engineOn} onChange={(e) => setEngineOn(e.target.checked)} /> Stockfish</label>
          </div>
          {opening && <div className="opening-line">📖 {opening.opening.name}{opening.opening.idea ? <span className="muted"> — {opening.opening.idea}</span> : null}</div>}
          {engineOn && (
            <div className="engine-lines">
              <div className="small muted">{live ? `Profondeur ${live.depth}` : 'Calcul…'} {score && `· ${describeEval(score)}`}</div>
              {live?.fen === fen && live.lines.map((l) => (
                <button key={l.multipv} className="engine-line" onClick={() => onMove(l.pv[0])}>
                  <span className={`eval-chip ${(l.mate !== null ? l.mate < 0 : (l.cp ?? 0) < 0) ? 'neg' : ''}`}>{formatScore(l)}</span>
                  <span className="line-text">{formatLine(fen, pvToSan(fen, l.pv, 10))}</span>
                </button>
              ))}
            </div>
          )}
          <div className="coach-area"><ReviewComment review={review} thinking={view >= 0} /></div>
          <MoveList moves={moves.map((m) => ({ san: m.san }))} current={view} onSelect={setView} startMoveNumber={startNo} blackFirst={blackFirst} />
          <NavButtons ply={view} max={moves.length - 1} onGo={setView} extra={<button className="btn icon" onClick={() => setFlipped((f) => !f)} aria-label="Tourner">⇅</button>} />
          <div className="actions">
            <button className="btn" onClick={() => setImportOpen(true)}>📥 Importer PGN / FEN</button>
            <button className="btn" onClick={() => { setStart(START_FEN); setUcis([]); setView(-1); }}>♻ Réinitialiser</button>
            <button className="btn" onClick={() => {
              const c = new Chess(start);
              moves.forEach((m) => c.move(m.san));
              navigator.clipboard?.writeText(c.pgn());
            }}>📋 Copier PGN</button>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(fen)}>📋 Copier FEN</button>
          </div>
        </div>
      </div>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onLoad={(s, u) => { setStart(s); setUcis(u); setView(u.length - 1); setImportOpen(false); }} />}
    </div>
  );
}

function ImportModal({ onClose, onLoad }: { onClose: () => void; onLoad: (start: string, ucis: string[]) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  return (
    <Modal onClose={onClose}>
      <h3>Importer une partie</h3>
      <p className="small muted">Collez un PGN (partie complète) ou une FEN (position).</p>
      <textarea className="textarea" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="1. e4 e5 2. Nf3 Nc6 …  ou  rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" />
      {err && <p className="error">{err}</p>}
      <div className="row gap">
        <button className="btn primary" onClick={() => {
          const t = text.trim();
          try {
            const c = new Chess(t);
            onLoad(c.fen(), []);
            return;
          } catch { /* not a fen */ }
          try {
            const c = new Chess();
            c.loadPgn(t);
            const h = c.history({ verbose: true }) as Move[];
            onLoad(c.getHeaders()['FEN'] ?? START_FEN, h.map((m) => m.lan));
          } catch {
            setErr('Impossible de lire ce PGN ou cette FEN.');
          }
        }}>Charger</button>
        <button className="btn" onClick={onClose}>Annuler</button>
      </div>
    </Modal>
  );
}
