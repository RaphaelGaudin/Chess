import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import Board from '../components/Board';
import { CAPTURE_GLYPH, CoachBubble, EvalBar, Modal, MoveList, NavButtons, PlayerTag, ReviewComment } from '../components/Widgets';
import { BOTS, botMove, type Bot } from '../lib/bots';
import { coachAnalyse, getEngine, winPercent, type Analysis } from '../lib/engine';
import { CLASS_INFO, gameAccuracy, hintText, reviewMove, scoreOf, type MoveReview } from '../lib/coach';
import { START_FEN, capturedPieces, isGameOverReason, materialBalance, uciToMove } from '../lib/chessUtil';
import { detectOpening } from '../lib/openings';
import { moveSound, play } from '../lib/sound';
import { store, useSettings } from '../lib/storage';
import { navigate } from '../App';

interface GameState {
  botId: string;
  playerColor: 'w' | 'b';
  ucis: string[];
  id: string;
  over?: { result: string; reason: string } | null;
}

const REASONS: Record<string, string> = {
  checkmate: 'par échec et mat',
  stalemate: 'par pat',
  insufficient: 'par matériel insuffisant',
  repetition: 'par triple répétition',
  fifty: 'par la règle des 50 coups',
  resign: 'par abandon',
};

function replay(ucis: string[]) {
  const chess = new Chess();
  const fens = [START_FEN];
  const moves: Move[] = [];
  for (const u of ucis) {
    const m = uciToMove(chess, u);
    if (!m) break;
    moves.push(m);
    fens.push(chess.fen());
  }
  return { chess, fens, moves };
}

export default function Play() {
  const [game, setGame] = useState<GameState | null>(() => store.get<GameState | null>('chess.current', null));
  if (!game) return <Setup onStart={(g) => { setGame(g); store.set('chess.current', g); play('start'); }} />;
  return <Game key={game.id} initial={game} onExit={() => { store.set('chess.current', null); setGame(null); }} />;
}

function Setup({ onStart }: { onStart: (g: GameState) => void }) {
  const [botId, setBotId] = useState(() => store.get('chess.lastBot', 'nina'));
  const [color, setColor] = useState<'w' | 'b' | 'r'>('w');
  const bot = BOTS.find((b) => b.id === botId) ?? BOTS[0];
  return (
    <div className="page setup">
      <div className="setup-hero">
        <div className="bot-avatar-big" style={{ background: bot.color }}>{bot.avatar}</div>
        <div>
          <h2>{bot.name} <span className="muted">({bot.elo})</span></h2>
          <p className="muted">{bot.description}</p>
        </div>
      </div>
      <h3>Choisissez votre adversaire</h3>
      <div className="bot-grid">
        {BOTS.map((b) => (
          <button key={b.id} className={`bot-card ${b.id === botId ? 'selected' : ''}`} onClick={() => setBotId(b.id)}>
            <div className="bot-avatar" style={{ background: b.color }}>{b.avatar}</div>
            <div className="bot-name">{b.name}</div>
            <div className="bot-elo">{b.elo}</div>
          </button>
        ))}
      </div>
      <h3>Je joue avec</h3>
      <div className="color-pick">
        {([['w', '♔ Blancs'], ['r', '🎲 Au hasard'], ['b', '♚ Noirs']] as const).map(([c, l]) => (
          <button key={c} className={`btn ${color === c ? 'primary' : ''}`} onClick={() => setColor(c)}>{l}</button>
        ))}
      </div>
      <button className="btn primary big" onClick={() => {
        store.set('chess.lastBot', botId);
        const pc = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        onStart({ botId, playerColor: pc, ucis: [], id: String(Date.now()) });
      }}>Jouer</button>
    </div>
  );
}

function Game({ initial, onExit }: { initial: GameState; onExit: () => void }) {
  const bot: Bot = BOTS.find((b) => b.id === initial.botId) ?? BOTS[0];
  const playerColor = initial.playerColor;
  const [ucis, setUcis] = useState<string[]>(initial.ucis);
  const [view, setView] = useState<number>(initial.ucis.length - 1);
  const [over, setOver] = useState<GameState['over']>(initial.over ?? null);
  const [showEnd, setShowEnd] = useState(false);
  const [reviews, setReviews] = useState<Record<number, MoveReview>>({});
  const [analyses, setAnalyses] = useState<Record<string, Analysis | null>>({});
  const [hint, setHint] = useState<{ level: number; text: string[]; uci: string | null } | null>(null);
  const [showBest, setShowBest] = useState(false);
  const [flipped, setFlipped] = useState(playerColor === 'b');
  const [settings, setSettings] = useSettings();
  const botBusy = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const { chess, fens, moves } = useMemo(() => replay(ucis), [ucis]);
  const sans = useMemo(() => moves.map((m) => m.san), [moves]);
  const live = view === moves.length - 1;
  const viewFen = fens[view + 1];
  const turn = chess.turn();
  const myTurn = turn === playerColor && !over;

  // persist
  useEffect(() => {
    store.set('chess.current', { ...initial, ucis, over });
  }, [ucis, over, initial]);

  // analyse every position (coach), and review moves
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < fens.length; i++) {
        const f = fens[i];
        if (analyses[f] !== undefined) continue;
        const a = await coachAnalyse(f, 12, 2);
        if (cancelled || !alive.current) return;
        setAnalyses((x) => ({ ...x, [f]: a }));
        return; // effect re-runs with new state
      }
    })();
    return () => { cancelled = true; };
  }, [fens, analyses]);

  useEffect(() => {
    const next: Record<number, MoveReview> = {};
    let changed = false;
    for (let i = 0; i < moves.length; i++) {
      if (reviews[i]) continue;
      const a0 = analyses[fens[i]], a1 = analyses[fens[i + 1]];
      if (a0 === undefined || a1 === undefined) continue;
      const prev = i >= 1 ? analyses[fens[i - 1]] : undefined;
      let prevWin: number | undefined;
      if (prev !== undefined && i >= 1) {
        const s = scoreOf(fens[i - 1], prev);
        const wp = winPercent(s);
        prevWin = moves[i].color === 'w' ? wp : 100 - wp;
      }
      next[i] = reviewMove(fens[i], ucis[i], a0, a1, sans, i, prevWin);
      changed = true;
    }
    if (changed) setReviews((r) => ({ ...r, ...next }));
  }, [analyses, moves, fens, ucis, sans, reviews]);

  const finish = useCallback((result: string, reason: string) => {
    setOver({ result, reason });
    setShowEnd(true);
    play('end');
  }, []);

  // detect game end
  useEffect(() => {
    if (over) return;
    const r = isGameOverReason(chess);
    if (!r) return;
    const result = r === 'checkmate' ? (chess.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
    finish(result, r);
  }, [chess, over, finish]);

  // save finished games
  useEffect(() => {
    if (!over) return;
    const allReviewed = moves.every((_, i) => reviews[i]);
    const acc = allReviewed && moves.length ? gameAccuracy(Object.values(reviews)) : undefined;
    const pgnChess = new Chess();
    for (const m of moves) pgnChess.move(m.san);
    const me = 'Vous';
    pgnChess.setHeader('Event', `Partie contre ${bot.name}`);
    pgnChess.setHeader('White', playerColor === 'w' ? me : bot.name);
    pgnChess.setHeader('Black', playerColor === 'b' ? me : bot.name);
    pgnChess.setHeader('Result', over.result);
    pgnChess.setHeader('Date', new Date(+initial.id).toISOString().slice(0, 10).replace(/-/g, '.'));
    store.saveGame({
      id: initial.id, date: +initial.id, white: playerColor === 'w' ? me : `${bot.name} (${bot.elo})`, black: playerColor === 'b' ? me : `${bot.name} (${bot.elo})`,
      result: over.result as '1-0', reason: over.reason, pgn: pgnChess.pgn(), playerColor, botId: bot.id, accuracy: acc,
    });
  }, [over, reviews, moves, bot, playerColor, initial.id]);

  // bot moves
  useEffect(() => {
    if (over || turn === playerColor || botBusy.current) return;
    botBusy.current = true;
    const fen = chess.fen();
    const n = ucis.length;
    botMove(bot, fen).then((u) => {
      botBusy.current = false;
      if (!alive.current || !u) return;
      setUcis((cur) => {
        if (cur.length !== n) return cur; // takeback happened meanwhile
        const c = new Chess(fen);
        const m = uciToMove(c, u);
        if (!m) return cur;
        moveSound(m);
        return [...cur, u];
      });
      setView((v) => (v === n - 1 ? n : v));
    });
  }, [turn, playerColor, over, chess, ucis.length, bot]);

  // keep view on live position when new moves arrive
  useEffect(() => { setView(moves.length - 1); }, [moves.length]);

  const onMove = (uci: string) => {
    if (!myTurn || !live) return;
    const c = new Chess(chess.fen());
    const m = uciToMove(c, uci);
    if (!m) return;
    moveSound(m);
    setHint(null);
    setShowBest(false);
    setUcis([...ucis, uci]);
  };

  const takeback = () => {
    if (over) return;
    getEngine('bot').stop();
    botBusy.current = false;
    let n = ucis.length;
    if (n === 0) return;
    // remove until it's the player's turn with at least one of his moves removed
    n -= 1;
    while (n > 0 && replay(ucis.slice(0, n)).chess.turn() !== playerColor) n--;
    if (replay(ucis.slice(0, n)).chess.turn() !== playerColor) return;
    setUcis(ucis.slice(0, n));
    setReviews((r) => Object.fromEntries(Object.entries(r).filter(([k]) => +k < n)));
    setHint(null);
    setShowBest(false);
  };

  const askHint = async () => {
    if (!myTurn) return;
    const level = (hint?.level ?? 0) + 1;
    setHint({ level, text: ['Je réfléchis…'], uci: null });
    const a = await coachAnalyse(chess.fen(), 12, 2);
    setHint({ level, text: hintText(chess.fen(), a), uci: a?.best ?? null });
  };

  // ---- display ----
  const lastUserIdx = (() => {
    for (let i = moves.length - 1; i >= 0; i--) if (moves[i].color === playerColor) return i;
    return -1;
  })();
  const shownReview: MoveReview | null = live ? (reviews[lastUserIdx] ?? null) : (reviews[view] ?? null);
  const reviewPending = live ? lastUserIdx >= 0 && !reviews[lastUserIdx] : view >= 0 && !reviews[view];
  const viewMove = view >= 0 ? moves[view] : null;

  const shapes: DrawShape[] = [];
  if (hint?.uci && myTurn && live) {
    if (hint.level >= 2) shapes.push({ orig: hint.uci.slice(0, 2) as never, dest: hint.uci.slice(2, 4) as never, brush: 'green' });
    else shapes.push({ orig: hint.uci.slice(0, 2) as never, brush: 'green' });
  }
  if (showBest && shownReview?.bestUci && shownReview.bestUci !== shownReview.uci) {
    shapes.push({ orig: shownReview.bestUci.slice(0, 2) as never, dest: shownReview.bestUci.slice(2, 4) as never, brush: 'green' });
  }

  const displayReview = view >= 0 ? reviews[view] : undefined;
  const badge = settings.showCoach && viewMove && displayReview
    ? { square: viewMove.to, symbol: CLASS_INFO[displayReview.classification].symbol, color: CLASS_INFO[displayReview.classification].color }
    : null;

  const viewChess = useMemo(() => new Chess(viewFen), [viewFen]);
  const caps = capturedPieces(viewChess);
  const bal = materialBalance(viewChess);
  const evalScore = analyses[viewFen] !== undefined ? scoreOf(viewFen, analyses[viewFen]) : null;
  const opening = detectOpening(sans.slice(0, view + 1));

  const orientation = flipped ? 'black' : 'white';
  const top = orientation === 'white' ? 'b' : 'w';
  const tag = (c: 'w' | 'b') => {
    const isBot = c !== playerColor;
    const capList = caps[c].map((t) => CAPTURE_GLYPH[t][c === 'w' ? 'b' : 'w']);
    const diff = c === 'w' ? bal : -bal;
    return isBot
      ? <PlayerTag name={bot.name} avatar={bot.avatar} elo={bot.elo} captured={capList} diff={diff} active={turn === c && !over} />
      : <PlayerTag name="Vous" avatar="🙂" captured={capList} diff={diff} active={turn === c && !over} />;
  };

  const resultText = over ? (over.result === '1/2-1/2' ? 'Partie nulle' : (over.result === '1-0') === (playerColor === 'w') ? 'Vous avez gagné !' : `${bot.name} a gagné`) : '';

  return (
    <div className="page game-layout">
      <div className="board-col">
        {tag(top)}
        <div className="board-row">
          {settings.showEvalBar && <EvalBar score={evalScore} orientation={orientation} />}
          <Board
            fen={viewFen}
            orientation={orientation}
            movable={myTurn && live ? (playerColor === 'w' ? 'white' : 'black') : null}
            lastMove={viewMove ? [viewMove.from, viewMove.to] : null}
            onMove={onMove}
            shapes={shapes}
            badge={badge}
          />
        </div>
        {tag(top === 'w' ? 'b' : 'w')}
      </div>
      <div className="side-col">
        <div className="panel">
          <div className="panel-head">
            <span>{bot.avatar} {bot.name}</span>
            {opening && <span className="opening" title={opening.opening.idea}>{opening.opening.name}</span>}
          </div>
          {settings.showCoach ? (
            <div className="coach-area">
              {hint && myTurn && live ? (
                <CoachBubble tone="info" title="Indice">{hint.text.map((t, i) => <p key={i}>{t}</p>)}{hint.level === 1 && hint.uci && <p className="muted small">Cliquez encore sur « Indice » pour voir le coup.</p>}</CoachBubble>
              ) : (
                <ReviewComment review={shownReview} thinking={reviewPending} />
              )}
              {live && shownReview && CLASS_INFO[shownReview.classification].points < 0.6 && !over && (
                <div className="row gap">
                  <button className="btn" onClick={takeback}>↩ Réessayer</button>
                  <button className="btn" onClick={() => setShowBest((s) => !s)}>{showBest ? 'Masquer' : 'Voir'} le meilleur coup</button>
                </div>
              )}
              {!live && displayReview && displayReview.bestUci !== displayReview.uci && (
                <div className="row gap"><button className="btn" onClick={() => setShowBest((s) => !s)}>{showBest ? 'Masquer' : 'Voir'} le meilleur coup</button></div>
              )}
            </div>
          ) : (
            <div className="pad muted small">Coach désactivé.</div>
          )}
          <MoveList moves={moves.map((m, i) => ({ san: m.san, classification: settings.showCoach ? reviews[i]?.classification : undefined }))} current={view} onSelect={(p) => { setView(p); setShowBest(false); }} />
          <NavButtons ply={view} max={moves.length - 1} onGo={(p) => { setView(p); setShowBest(false); }} />
          <div className="actions">
            {!over ? (
              <>
                <button className="btn" onClick={askHint} disabled={!myTurn || !live}>💡 Indice</button>
                <button className="btn" onClick={takeback} disabled={!ucis.length}>↩ Annuler</button>
                <button className="btn" onClick={() => setFlipped((f) => !f)}>⇅ Tourner</button>
                <button className="btn danger" onClick={() => { if (confirm('Abandonner la partie ?')) finish(playerColor === 'w' ? '0-1' : '1-0', 'resign'); }}>🏳 Abandonner</button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => navigate(`/review/${initial.id}`)}>📊 Bilan de la partie</button>
                <button className="btn" onClick={onExit}>Nouvelle partie</button>
                <button className="btn" onClick={() => setFlipped((f) => !f)}>⇅ Tourner</button>
              </>
            )}
          </div>
          <div className="toggles">
            <label><input type="checkbox" checked={settings.showCoach} onChange={(e) => setSettings({ showCoach: e.target.checked })} /> Coach</label>
            <label><input type="checkbox" checked={settings.showEvalBar} onChange={(e) => setSettings({ showEvalBar: e.target.checked })} /> Barre d'évaluation</label>
          </div>
        </div>
      </div>
      {showEnd && over && (
        <Modal onClose={() => setShowEnd(false)}>
          <div className="end-modal">
            <div className="end-title">{resultText}</div>
            <div className="muted">{REASONS[over.reason] ?? ''}</div>
            <div className="end-players">
              <div><div className="player-avatar big">🙂</div>Vous</div>
              <div className="end-score">{over.result.replace('1/2', '½').replace('1/2', '½')}</div>
              <div><div className="player-avatar big" style={{ background: bot.color }}>{bot.avatar}</div>{bot.name}</div>
            </div>
            <button className="btn primary big" onClick={() => navigate(`/review/${initial.id}`)}>📊 Bilan de la partie</button>
            <div className="row gap center">
              <button className="btn" onClick={onExit}>Nouvelle partie</button>
              <button className="btn" onClick={() => setShowEnd(false)}>Voir l'échiquier</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
