import { Chess, type Move, type PieceSymbol, type Square, type Color } from 'chess.js';

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const NAMES: Record<PieceSymbol, { n: string; f: boolean }> = {
  p: { n: 'pion', f: false },
  n: { n: 'cavalier', f: false },
  b: { n: 'fou', f: false },
  r: { n: 'tour', f: true },
  q: { n: 'dame', f: true },
  k: { n: 'roi', f: false },
};

export const pieceName = (p: PieceSymbol) => NAMES[p].n;
export const theP = (p: PieceSymbol) => `${NAMES[p].f ? 'la' : 'le'} ${NAMES[p].n}`;
export const aP = (p: PieceSymbol) => `${NAMES[p].f ? 'une' : 'un'} ${NAMES[p].n}`;
export const yourP = (p: PieceSymbol) => `votre ${NAMES[p].n}`;
export const colorName = (c: Color) => (c === 'w' ? 'Blancs' : 'Noirs');
export const colorNameLower = (c: Color) => (c === 'w' ? 'les blancs' : 'les noirs');

const FIG: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
/** Converts SAN to figurine notation (♘f3). */
export function fig(san: string): string {
  return san.replace(/[KQRBN]/g, (c) => FIG[c]);
}

export function uciToMove(chess: Chess, uci: string): Move | null {
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
  } catch {
    return null;
  }
}

export function moveToUci(m: { from: string; to: string; promotion?: string }) {
  return m.from + m.to + (m.promotion ?? '');
}

/** Converts a UCI principal variation into SAN list. */
export function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    const m = uciToMove(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/** Formats a SAN line with move numbers, starting at the given fen. */
export function formatLine(fen: string, sans: string[]): string {
  const parts = fen.split(' ');
  let moveNo = +parts[5];
  let white = parts[1] === 'w';
  const out: string[] = [];
  sans.forEach((s, i) => {
    if (white) out.push(`${moveNo}.`);
    else if (i === 0) out.push(`${moveNo}…`);
    out.push(fig(s));
    if (!white) moveNo++;
    white = !white;
  });
  return out.join(' ');
}

/** Legal destinations map for chessground. */
export function legalDests(chess: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>();
  for (const m of chess.moves({ verbose: true })) {
    const arr = dests.get(m.from) ?? [];
    arr.push(m.to);
    dests.set(m.from, arr);
  }
  return dests;
}

export function materialBalance(chess: Chess): number {
  let s = 0;
  for (const row of chess.board())
    for (const p of row) if (p && p.type !== 'k') s += (p.color === 'w' ? 1 : -1) * VALUE[p.type];
  return s;
}

/** Captured pieces for display: what each side has taken. */
export function capturedPieces(chess: Chess): { w: PieceSymbol[]; b: PieceSymbol[] } {
  const start: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const count = { w: { ...start }, b: { ...start } };
  for (const row of chess.board()) for (const p of row) if (p) count[p.color][p.type]--;
  const order: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
  const res = { w: [] as PieceSymbol[], b: [] as PieceSymbol[] };
  // res.w = black pieces captured by white
  for (const t of order) {
    for (let i = 0; i < Math.max(0, count.b[t]); i++) res.w.push(t);
    for (let i = 0; i < Math.max(0, count.w[t]); i++) res.b.push(t);
  }
  return res;
}

/** Pieces of `color` that are attacked and either undefended or attacked by a cheaper piece. */
export function hangingPieces(chess: Chess, color: Color): { square: Square; type: PieceSymbol; by: PieceSymbol }[] {
  const opp: Color = color === 'w' ? 'b' : 'w';
  const out: { square: Square; type: PieceSymbol; by: PieceSymbol }[] = [];
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue;
      const attackers = chess.attackers(p.square, opp);
      if (!attackers.length) continue;
      const cheapest = attackers
        .map((sq) => chess.get(sq)!.type)
        .sort((a, b) => VALUE[a] - VALUE[b])[0];
      const defended = chess.attackers(p.square, color).length > 0;
      if (!defended || VALUE[cheapest] < VALUE[p.type]) out.push({ square: p.square, type: p.type, by: cheapest });
    }
  return out;
}

/** Enemy pieces attacked by the piece standing on `sq` that are valuable targets. */
export function attackedTargets(chess: Chess, sq: Square): { square: Square; type: PieceSymbol }[] {
  const piece = chess.get(sq);
  if (!piece) return [];
  const opp: Color = piece.color === 'w' ? 'b' : 'w';
  const out: { square: Square; type: PieceSymbol }[] = [];
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.color !== opp || p.type === 'p') continue;
      if (!chess.attackers(p.square, piece.color).includes(sq)) continue;
      const defended = chess.attackers(p.square, opp).length > 0;
      if (p.type === 'k' || VALUE[p.type] > VALUE[piece.type] || !defended) out.push({ square: p.square, type: p.type });
    }
  return out;
}

export function isGameOverReason(chess: Chess): string | null {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient';
  if (chess.isThreefoldRepetition()) return 'repetition';
  if (chess.isDrawByFiftyMoves()) return 'fifty';
  return null;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
