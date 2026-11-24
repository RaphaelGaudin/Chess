import { useEffect, useMemo, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import Board from '../components/Board';
import { EvalBar, EvalGraph, MoveList, NavButtons, ReviewComment, CoachBubble } from '../components/Widgets';
import { coachAnalyse, winPercent, type Analysis } from '../lib/engine';
import { CLASS_INFO, CLASS_ORDER, estimatedElo, gameAccuracy, reviewMove, scoreOf, type MoveReview } from '../lib/coach';
import { store } from '../lib/storage';
import { detectOpening } from '../lib/openings';
import { navigate } from '../App';

const DEPTH = 13;

export default function Review({ id }: { id: string }) {
  const [saved, setSaved] = useState(() => store.games().find((g) => g.id === id));
  const parsed = useMemo(() => {
    if (!saved) return null;
    const c = new Chess();
    try { c.loadPgn(saved.pgn); } catch { return null; }
    const moves = c.history({ verbose: true }) as Move[];
    const startFen = c.getHeaders()['FEN'] ?? new Chess().fen();
    const fens = [startFen, ...moves.map((m) => m.after)];
    return { moves, fens };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.pgn]);

  const [analyses, setAnalyses] = useState<(Analysis | null)[]>([]);
  const [view, setView] = useState(-1);
  const [showBest, setShowBest] = useState(true);
  const [flipped, setFlipped] = useState(saved?.playerColor === 'b');

  useEffect(() => {
    if (!parsed) return;
    let cancel = false;
    (async () => {
      const res: (Analysis | null)[] = [];
      for (const f of parsed.fens) {
        const a = await coachAnalyse(f, DEPTH, 2);
        if (cancel) return;
        res.push(a);
        setAnalyses([...res]);
      }
    })();
    return () => { cancel = true; };
  }, [parsed]);

  const done = parsed ? analyses.length === parsed.fens.length : false;
  const reviews: MoveReview[] = useMemo(() => {
    if (!parsed || !done) return [];
    const sans = parsed.moves.map((m) => m.san);
    return parsed.moves.map((m, i) => {
      let prevWin: number | undefined;
      if (i >= 1) {
        const w = winPercent(scoreOf(parsed.fens[i - 1], analyses[i - 1]));
        prevWin = m.color === 'w' ? w : 100 - w;
      }
      return reviewMove(parsed.fens[i], m.lan, analyses[i], analyses[i + 1], sans, i, prevWin);
    });
  }, [parsed, analyses, done]);

  useEffect(() => {
    if (done && saved && !saved.accuracy && reviews.length) {
      const g = { ...saved, accuracy: gameAccuracy(reviews) };
      store.saveGame(g);
      setSaved(g);
    }
  }, [done, reviews, saved]);

  if (!saved || !parsed) return <div className="page"><p>Partie introuvable.</p><button className="btn" onClick={() => navigate('/history')}>Retour</button></div>;

  const { moves, fens } = parsed;
  const fen = fens[view + 1];
  const mv = view >= 0 ? moves[view] : null;
  const rv = view >= 0 ? reviews[view] : null;
  const orientation = flipped ? 'black' : 'white';
  const shapes: DrawShape[] = [];
  if (rv && showBest && rv.bestUci && rv.bestUci !== rv.uci && CLASS_INFO[rv.classification].points < 0.9)
    shapes.push({ orig: rv.bestUci.slice(0, 2) as never, dest: rv.bestUci.slice(2, 4) as never, brush: 'green' });
  const acc = reviews.length ? gameAccuracy(reviews) : null;
  const opening = detectOpening(moves.map((m) => m.san));

  const counts = (c: 'w' | 'b') => {
    const r: Record<string, number> = {};
    for (const x of reviews) if (x.color === c) r[x.classification] = (r[x.classification] ?? 0) + 1;
    return r;
  };
  const cw = counts('w'), cb = counts('b');
  const firstMistake = reviews.findIndex((r) => r.color === saved.playerColor && ['mistake', 'blunder', 'miss'].includes(r.classification));

  return (
    <div className="page game-layout">
      <div className="board-col">
        <div className="player-tag"><div className="player-info"><div className="player-name">{orientation === 'white' ? saved.black : saved.white}</div></div></div>
        <div className="board-row">
          <EvalBar score={analyses[view + 1] !== undefined ? scoreOf(fen, analyses[view + 1]) : null} orientation={orientation} />
          <Board fen={fen} orientation={orientation} lastMove={mv ? [mv.from, mv.to] : null} shapes={shapes}
            badge={mv && rv ? { square: mv.to, symbol: CLASS_INFO[rv.classification].symbol, color: CLASS_INFO[rv.classification].color } : null} />
        </div>
        <div className="player-tag"><div className="player-info"><div className="player-name">{orientation === 'white' ? saved.white : saved.black}</div></div></div>
      </div>
      <div className="side-col">
        <div className="panel">
          <div className="panel-head"><span>📊 Bilan de la partie</span><span className="muted small">{saved.result}</span></div>
          {!done ? (
            <div className="pad">
              <p>Analyse par Stockfish en cours…</p>
              <div className="progress"><div style={{ width: `${(analyses.length / fens.length) * 100}%` }} /></div>
            </div>
          ) : (
            <>
              <EvalGraph scores={fens.map((f, i) => scoreOf(f, analyses[i]))} current={view} onSelect={setView} marks={reviews.map((r) => r.classification)} />
              {view < 0 && acc && (
                <div className="summary">
                  {opening && <div className="muted small center">Ouverture : {opening.opening.name}</div>}
                  <div className="acc-row">
                    <div className="acc-box white"><div className="acc-val">{acc.w.toFixed(1)}</div><div className="small">Précision blancs</div><div className="tiny muted">≈ {estimatedElo(acc.w)} Elo</div></div>
                    <div className="acc-box black"><div className="acc-val">{acc.b.toFixed(1)}</div><div className="small">Précision noirs</div><div className="tiny muted">≈ {estimatedElo(acc.b)} Elo</div></div>
                  </div>
                  <table className="cls-table">
                    <tbody>
                      {CLASS_ORDER.map((k) => (
                        <tr key={k}>
                          <td className="num">{cw[k] ?? 0}</td>
                          <td><span className="cls-pill" style={{ background: CLASS_INFO[k].color }}>{CLASS_INFO[k].symbol}</span> {CLASS_INFO[k].label}</td>
                          <td className="num">{cb[k] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <CoachBubble tone="info" title="Le mot du coach">
                    {summaryText(reviews, saved.playerColor)}
                  </CoachBubble>
                  <div className="row gap center">
                    <button className="btn primary" onClick={() => setView(0)}>▶ Commencer la revue</button>
                    {firstMistake >= 0 && <button className="btn" onClick={() => setView(firstMistake)}>Aller à ma 1ʳᵉ erreur</button>}
                  </div>
                </div>
              )}
              {view >= 0 && (
                <div className="coach-area">
                  <ReviewComment review={rv} />
                  {rv && rv.bestUci !== rv.uci && <label className="small"><input type="checkbox" checked={showBest} onChange={(e) => setShowBest(e.target.checked)} /> Afficher la flèche du meilleur coup</label>}
                </div>
              )}
            </>
          )}
          <MoveList moves={moves.map((m, i) => ({ san: m.san, classification: reviews[i]?.classification }))} current={view} onSelect={setView} />
          <NavButtons ply={view} max={moves.length - 1} onGo={setView} extra={<button className="btn icon" onClick={() => setFlipped((f) => !f)} aria-label="Tourner">⇅</button>} />
          <div className="actions">
            <button className="btn" onClick={() => navigate(`/analysis?pgn=${encodeURIComponent(saved.pgn)}&ply=${view}`)}>🔍 Analyser librement</button>
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(saved.pgn); }}>📋 Copier le PGN</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function summaryText(reviews: MoveReview[], color: 'w' | 'b') {
  const mine = reviews.filter((r) => r.color === color);
  const count = (k: string) => mine.filter((r) => r.classification === k).length;
  const bl = count('blunder'), mi = count('mistake') + count('miss'), good = mine.filter((r) => CLASS_INFO[r.classification].points >= 0.9).length;
  const parts: string[] = [];
  if (!mine.length) return 'Partie trop courte pour un bilan.';
  const ratio = good / mine.length;
  if (ratio > 0.8) parts.push('Superbe partie ! La grande majorité de vos coups sont parmi les meilleurs.');
  else if (ratio > 0.6) parts.push('Bonne partie dans l\'ensemble.');
  else parts.push('Partie difficile, mais chaque erreur est une occasion d\'apprendre.');
  if (bl) parts.push(`Vous avez commis ${bl} gaffe${bl > 1 ? 's' : ''} : avant chaque coup, vérifiez quelles pièces sont attaquées et ce que menace l'adversaire.`);
  if (mi) parts.push(`${mi} erreur${mi > 1 ? 's' : ''} ou occasion${mi > 1 ? 's' : ''} manquée${mi > 1 ? 's' : ''} : cherchez systématiquement les échecs, les prises et les menaces (« E.P.M. »).`);
  if (!bl && !mi) parts.push('Aucune erreur grave, bravo !');
  return parts.join(' ');
}
