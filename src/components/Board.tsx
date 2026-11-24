import { createElement, useEffect, useRef, useState } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Chess, type Square } from 'chess.js';
import { legalDests } from '../lib/chessUtil';
import { useSettings } from '../lib/storage';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.cburnett.css';

export interface BoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  /** which color the user may move; null = view only */
  movable?: 'white' | 'black' | 'both' | null;
  lastMove?: [string, string] | null;
  onMove?: (uci: string) => void;
  shapes?: DrawShape[];
  /** square -> css class, for highlights (e.g. move classification) */
  highlights?: Map<string, string>;
  badge?: { square: string; symbol: string; color: string } | null;
}

const PROMO = ['q', 'r', 'b', 'n'] as const;

export default function Board({ fen, orientation = 'white', movable = null, lastMove, onMove, shapes, highlights, badge }: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [promo, setPromo] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
  const [settings] = useSettings();
  const fenRef = useRef(fen);
  fenRef.current = fen;

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, {
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      coordinates: true,
      drawable: { enabled: true },
      premovable: { enabled: false },
      movable: {
        free: false,
        events: {
          after: (orig, dest) => {
            const chess = new Chess(fenRef.current);
            const piece = chess.get(orig as Square);
            if (piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1')) {
              if (useSettingsSnapshot().autoQueen) onMoveRef.current?.(orig + dest + 'q');
              else setPromo({ from: orig, to: dest, color: piece.color });
              return;
            }
            onMoveRef.current?.(orig + dest);
            const before = fenRef.current;
            setTimeout(() => { if (fenRef.current === before) syncRef.current(); }, 30);
          },
        },
      },
    });
    const ro = new ResizeObserver(() => api.current?.redrawAll());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      api.current?.destroy();
    };
  }, []);

  const sync = () => {
    const chess = new Chess(fen);
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const canMove = movable === 'both' || movable === turn;
    api.current?.set({
      fen,
      orientation,
      turnColor: turn,
      check: chess.inCheck() ? turn : false,
      lastMove: (lastMove as Key[] | undefined | null) ?? undefined,
      movable: {
        color: canMove ? turn : undefined,
        dests: canMove ? (legalDests(chess) as Map<Key, Key[]>) : new Map(),
        showDests: settings.showLegal,
      },
      highlight: { custom: highlights as Map<Key, string> | undefined },
    });
    if (!lastMove) api.current?.set({ lastMove: undefined });
  };
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    sync();
    setPromo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, orientation, movable, lastMove, highlights, settings.showLegal]);

  useEffect(() => {
    api.current?.setAutoShapes(shapes ?? []);
  }, [shapes]);

  // Badge position (classification icon on the destination square)
  let badgeStyle: React.CSSProperties | null = null;
  if (badge) {
    const f = badge.square.charCodeAt(0) - 97;
    const r = +badge.square[1] - 1;
    const x = orientation === 'white' ? f : 7 - f;
    const y = orientation === 'white' ? 7 - r : r;
    badgeStyle = { left: `calc(${(x + 1) * 12.5}% - 14px)`, top: `calc(${y * 12.5}% - 10px)`, background: badge.color };
  }

  return (
    <div className="board-wrap">
      <div ref={el} className="cg-board-host" />
      {badge && badgeStyle && (
        <div className="move-badge" style={badgeStyle}>{badge.symbol}</div>
      )}
      {promo && (
        <div className="promo-overlay" onClick={() => { setPromo(null); syncRef.current(); }}>
          <div className="cg-wrap promo-box" onClick={(e) => e.stopPropagation()}>
            {PROMO.map((p) => (
              <button
                key={p}
                className="promo-btn"
                onClick={() => { const pr = promo; setPromo(null); onMoveRef.current?.(pr.from + pr.to + p); }}
                aria-label={p}
              >
                {createElement('piece', { className: `${promo.color === 'w' ? 'white' : 'black'} ${({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' } as const)[p]}` })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useSettingsSnapshot() {
  try {
    return { ...JSON.parse(localStorage.getItem('chess.settings') || '{}') } as { autoQueen?: boolean };
  } catch {
    return {};
  }
}
