import { type ReactNode, useEffect, useRef } from 'react';
import { formatScore, winPercent, type Score } from '../lib/engine';
import { CLASS_INFO, type Classification, type MoveReview } from '../lib/coach';
import { fig } from '../lib/chessUtil';

export function EvalBar({ score, orientation, mateText }: { score: Score | null; orientation: 'white' | 'black'; mateText?: string }) {
  const w = score ? winPercent(score) : 50;
  const whiteBottom = orientation === 'white';
  const label = mateText ?? formatScore(score);
  const whiteAhead = w >= 50;
  return (
    <div className={`eval-bar ${whiteBottom ? '' : 'flipped'}`} title="Évaluation de Stockfish">
      <div className="eval-white" style={{ height: `${w}%` }} />
      <span className={`eval-label ${whiteAhead ? 'on-white' : 'on-black'}`}>{label.replace('+', '')}</span>
    </div>
  );
}

export interface MoveListItem {
  san: string;
  classification?: Classification;
}

export function MoveList({ moves, current, onSelect, startMoveNumber = 1, blackFirst = false }: {
  moves: MoveListItem[];
  current: number; // index of the ply displayed (-1 = start)
  onSelect: (ply: number) => void;
  startMoveNumber?: number;
  blackFirst?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector('.mv.active') as HTMLElement | null;
    if (el && ref.current) {
      const top = el.offsetTop - ref.current.offsetTop;
      if (top < ref.current.scrollTop || top > ref.current.scrollTop + ref.current.clientHeight - 30) ref.current.scrollTop = top - 40;
    } else if (ref.current && current === moves.length - 1) ref.current.scrollTop = ref.current.scrollHeight;
  }, [current, moves.length]);

  const rows: ReactNode[] = [];
  const offset = blackFirst ? 1 : 0;
  const total = moves.length + offset;
  for (let i = 0; i < total; i += 2) {
    const n = startMoveNumber + i / 2;
    const cell = (idx: number) => {
      const ply = idx - offset;
      if (ply < 0) return <span className="mv empty">…</span>;
      const m = moves[ply];
      if (!m) return <span className="mv empty" />;
      const info = m.classification ? CLASS_INFO[m.classification] : null;
      return (
        <button className={`mv ${ply === current ? 'active' : ''}`} onClick={() => onSelect(ply)}>
          {info && ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder', 'miss', 'book'].includes(m.classification!) && (
            <span className="cls-dot" style={{ background: info.color }} title={info.label}>{info.symbol}</span>
          )}
          {fig(m.san)}
        </button>
      );
    };
    rows.push(
      <div className="mv-row" key={i}>
        <span className="mv-num">{n}.</span>
        {cell(i)}
        {cell(i + 1)}
      </div>,
    );
  }
  return (
    <div className="move-list" ref={ref}>
      {rows.length ? rows : <div className="muted small pad">Aucun coup joué.</div>}
    </div>
  );
}

export function NavButtons({ ply, max, onGo, extra }: { ply: number; max: number; onGo: (p: number) => void; extra?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') onGo(Math.max(-1, ply - 1));
      else if (e.key === 'ArrowRight') onGo(Math.min(max, ply + 1));
      else if (e.key === 'ArrowUp') onGo(-1);
      else if (e.key === 'ArrowDown') onGo(max);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ply, max, onGo]);
  return (
    <div className="nav-buttons">
      <button className="btn icon" onClick={() => onGo(-1)} disabled={ply < 0} aria-label="Début">⏮</button>
      <button className="btn icon" onClick={() => onGo(Math.max(-1, ply - 1))} disabled={ply < 0} aria-label="Précédent">◀</button>
      <button className="btn icon" onClick={() => onGo(Math.min(max, ply + 1))} disabled={ply >= max} aria-label="Suivant">▶</button>
      <button className="btn icon" onClick={() => onGo(max)} disabled={ply >= max} aria-label="Fin">⏭</button>
      {extra}
    </div>
  );
}

export function CoachBubble({ title, children, tone = 'neutral', avatar = '🧑‍🏫' }: { title?: ReactNode; children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'info'; avatar?: string }) {
  return (
    <div className={`coach ${tone}`}>
      <div className="coach-avatar">{avatar}</div>
      <div className="coach-bubble">
        {title && <div className="coach-title">{title}</div>}
        <div className="coach-text">{children}</div>
      </div>
    </div>
  );
}

export function ReviewComment({ review, thinking }: { review: MoveReview | null; thinking?: boolean }) {
  if (!review) return <CoachBubble>{thinking ? 'J\'analyse votre coup…' : 'Jouez un coup, je vous dirai ce que j\'en pense !'}</CoachBubble>;
  const info = CLASS_INFO[review.classification];
  const tone = info.points >= 0.75 ? 'good' : 'bad';
  return (
    <CoachBubble
      tone={tone}
      title={<><span className="cls-pill" style={{ background: info.color }}>{info.symbol}</span> {fig(review.san)} — {info.label}</>}
    >
      {review.comment.map((c, i) => <p key={i}>{c}</p>)}
    </CoachBubble>
  );
}

/** Evaluation graph over a game. */
export function EvalGraph({ scores, current, onSelect, marks }: { scores: (Score | null)[]; current: number; onSelect: (ply: number) => void; marks?: (Classification | undefined)[] }) {
  const W = 600, H = 90;
  const n = scores.length;
  if (n < 2) return null;
  const pts = scores.map((s, i) => [ (i / (n - 1)) * W, H - ((s ? winPercent(s) : 50) / 100) * H ]);
  const d = `M0 ${H} ` + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ` L${W} ${H} Z`;
  return (
    <svg className="eval-graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      onClick={(e) => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
        onSelect(i - 1);
      }}>
      <rect width={W} height={H} fill="#403d39" />
      <path d={d} fill="#e8e6e3" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#888" strokeWidth="1" strokeDasharray="4 4" />
      {marks?.map((m, i) => {
        if (!m || !['blunder', 'mistake', 'miss', 'brilliant', 'great'].includes(m)) return null;
        const [x, y] = pts[i + 1] ?? [0, 0];
        return <circle key={i} cx={x} cy={y} r="4" fill={CLASS_INFO[m].color} stroke="#000" strokeWidth="0.5" />;
      })}
      {current >= -1 && <line x1={pts[current + 1]?.[0] ?? 0} x2={pts[current + 1]?.[0] ?? 0} y1="0" y2={H} stroke="#81b64c" strokeWidth="2" />}
    </svg>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function PlayerTag({ name, avatar, elo, captured, diff, active }: { name: string; avatar: string; elo?: number | string; captured?: string[]; diff?: number; active?: boolean }) {
  return (
    <div className={`player-tag ${active ? 'active' : ''}`}>
      <div className="player-avatar">{avatar}</div>
      <div className="player-info">
        <div className="player-name">{name} {elo !== undefined && <span className="muted">({elo})</span>}</div>
        <div className="captured">{captured?.join('')}{diff && diff > 0 ? <span className="muted"> +{diff}</span> : null}</div>
      </div>
    </div>
  );
}

export const CAPTURE_GLYPH: Record<string, { w: string; b: string }> = {
  p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' }, r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' },
};
