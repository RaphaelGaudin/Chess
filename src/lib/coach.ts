import { Chess, type Color, type Move } from 'chess.js';
import { winPercent, type Analysis, type Score } from './engine';
import {
  VALUE, aP, attackedTargets, fig, formatLine, hangingPieces, pvToSan, theP, uciToMove, yourP,
} from './chessUtil';
import { isBookMove } from './openings';

export type Classification =
  | 'book' | 'brilliant' | 'great' | 'best' | 'excellent' | 'good'
  | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export const CLASS_INFO: Record<Classification, { label: string; symbol: string; color: string; points: number }> = {
  brilliant: { label: 'Brillant', symbol: '!!', color: '#26c2a3', points: 1 },
  great: { label: 'Très bon coup', symbol: '!', color: '#5c8bb0', points: 1 },
  best: { label: 'Meilleur coup', symbol: '★', color: '#81b64c', points: 1 },
  excellent: { label: 'Excellent', symbol: '👍', color: '#96bc4b', points: 0.9 },
  good: { label: 'Bon', symbol: '✓', color: '#96af8b', points: 0.75 },
  book: { label: 'Théorique', symbol: '📖', color: '#a88865', points: 1 },
  inaccuracy: { label: 'Imprécision', symbol: '?!', color: '#f7c631', points: 0.5 },
  mistake: { label: 'Erreur', symbol: '?', color: '#ffa459', points: 0.25 },
  miss: { label: 'Occasion manquée', symbol: '✗', color: '#ff7769', points: 0.2 },
  blunder: { label: 'Gaffe', symbol: '??', color: '#fa412d', points: 0 },
};

export const CLASS_ORDER: Classification[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export interface MoveReview {
  ply: number;
  san: string;
  uci: string;
  color: Color;
  classification: Classification;
  winBefore: number; // mover POV
  winAfter: number; // mover POV
  scoreAfter: Score; // white POV
  bestUci: string | null;
  bestSan: string | null;
  bestLine: string; // formatted
  comment: string[];
}

/** Score after a move, white POV, handling finished games. */
export function scoreOf(fen: string, a: Analysis | null): Score {
  const c = new Chess(fen);
  // side to move is mated
  if (c.isCheckmate()) return { cp: null, mate: c.turn() === 'w' ? -1 : 1 };
  if (c.isDraw() || c.isStalemate()) return { cp: 0, mate: null };
  const l = a?.lines[0];
  if (!l) return { cp: 0, mate: null };
  return { cp: l.cp, mate: l.mate };
}

const povWin = (s: Score, color: Color) => (color === 'w' ? winPercent(s) : 100 - winPercent(s));

/** Accuracy for a single move from win% loss (lichess formula). */
export function moveAccuracy(loss: number) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}

export function describeEval(s: Score): string {
  if (s.mate !== null) {
    const who = s.mate > 0 ? 'les blancs' : 'les noirs';
    return `Mat en ${Math.abs(s.mate)} pour ${who}.`;
  }
  const cp = s.cp ?? 0;
  const a = Math.abs(cp);
  const who = cp > 0 ? 'Les blancs' : 'Les noirs';
  if (a < 40) return 'La position est équilibrée.';
  if (a < 100) return `${who} sont légèrement mieux.`;
  if (a < 250) return `${who} ont un net avantage.`;
  if (a < 600) return `${who} ont un avantage décisif.`;
  return `${who} sont en train de gagner.`;
}

/** Positive facts about a move (French sentences). `before` is the position before the move. */
export function moveFacts(before: Chess, move: Move, opts: { ply: number; you?: boolean } = { ply: 0 }): string[] {
  const facts: string[] = [];
  const after = new Chess(before.fen());
  after.move(move.san);
  const subj = opts.you === false ? 'Ce coup' : 'Ce coup';
  if (after.isCheckmate()) {
    facts.push('Échec et mat ! La partie est terminée.');
    return facts;
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    facts.push(`Le roque met le roi en sécurité et connecte les tours.`);
  }
  if (move.captured) {
    const defended = before.attackers(move.to, move.color === 'w' ? 'b' : 'w').length > 0;
    if (!defended) facts.push(`${subj} capture ${theP(move.captured)} qui n'était pas défendu${['r', 'q'].includes(move.captured) ? 'e' : ''} : du matériel gratuit !`);
    else if (VALUE[move.captured] > VALUE[move.piece]) facts.push(`${subj} échange ${theP(move.piece)} contre ${theP(move.captured)}, plus précieux${['r', 'q'].includes(move.captured) ? 'se' : ''}.`);
    else facts.push(`${subj} capture ${theP(move.captured)}.`);
  }
  if (move.promotion) facts.push(`Le pion arrive sur la dernière rangée et devient ${aP(move.promotion)} !`);
  if (after.inCheck()) facts.push(`Ce coup donne échec au roi adverse.`);
  const targets = attackedTargets(after, move.to).filter((t) => t.type !== 'k' || after.inCheck());
  const nonKing = targets.filter((t) => t.type !== 'k');
  if (targets.length >= 2) {
    facts.push(`Fourchette ! ${capFirst(theP(move.piece))} attaque ${targets.map((t) => `${theP(t.type)} (${t.square})`).join(' et ')} en même temps.`);
  } else if (nonKing.length === 1 && !move.captured) {
    facts.push(`${capFirst(theP(move.piece))} menace ${theP(nonKing[0].type)} en ${nonKing[0].square}.`);
  }
  if (opts.ply < 20) {
    const backRank = move.color === 'w' ? '1' : '8';
    if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank && !move.captured)
      facts.push(`Développe ${theP(move.piece)} vers une case active, comme le veulent les principes d'ouverture.`);
    if (move.piece === 'p' && ['e4', 'd4', 'e5', 'd5'].includes(move.to) && !move.captured)
      facts.push('Occupe le centre avec un pion : il contrôle des cases importantes.');
    if (move.piece === 'q' && opts.ply < 8 && !move.captured)
      facts.push('Attention : sortir la dame très tôt l\'expose aux attaques des pièces adverses.');
  }
  return facts;
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Describes what the opponent threatens with their best reply. */
function describeRefutation(fenAfter: string, after: Analysis | null, moverColor: Color): string | null {
  const l = after?.lines[0];
  if (!l || !l.pv.length) return null;
  const c = new Chess(fenAfter);
  const reply = uciToMove(c, l.pv[0]);
  if (!reply) return null;
  const line = formatLine(fenAfter, pvToSan(fenAfter, l.pv, 5));
  const oppMates = l.mate !== null && (moverColor === 'w' ? l.mate < 0 : l.mate > 0);
  if (oppMates) return `Ce coup permet à l'adversaire de mater en ${Math.abs(l.mate!)} : ${line}.`;
  if (reply.captured) return `L'adversaire peut répondre ${fig(reply.san)} et prendre ${yourP(reply.captured)}. Suite probable : ${line}.`;
  if (c.inCheck()) return `L'adversaire répond par ${fig(reply.san)} avec une attaque forte. Suite probable : ${line}.`;
  const t = attackedTargets(c, reply.to);
  if (t.length >= 2) return `L'adversaire a ${fig(reply.san)}, une fourchette sur ${t.map((x) => theP(x.type)).join(' et ')}.`;
  return `La meilleure réponse adverse est ${fig(reply.san)}. Suite probable : ${line}.`;
}

/**
 * Builds a full review of a move.
 * @param before analysis of the position before the move (ideally MultiPV 2)
 * @param after analysis of the position after the move
 * @param prevWinForMover win% of the mover before the opponent's previous move (to detect missed punishments)
 */
export function reviewMove(
  fenBefore: string,
  uci: string,
  before: Analysis | null,
  after: Analysis | null,
  sans: string[],
  ply: number,
  prevWinForMover?: number,
): MoveReview {
  const chess = new Chess(fenBefore);
  const color = chess.turn();
  const move = uciToMove(new Chess(fenBefore), uci)!;
  const fenAfter = (() => { const c = new Chess(fenBefore); c.move(move.san); return c.fen(); })();
  const scoreBefore = scoreOf(fenBefore, before);
  const scoreAfter = scoreOf(fenAfter, after);
  const winBefore = povWin(scoreBefore, color);
  const winAfter = povWin(scoreAfter, color);
  const loss = Math.max(0, winBefore - winAfter);

  const bestUci = before?.best ?? null;
  const bestMove = bestUci ? uciToMove(new Chess(fenBefore), bestUci) : null;
  const bestSan = bestMove?.san ?? null;
  const bestLine = before?.lines[0] ? formatLine(fenBefore, pvToSan(fenBefore, before.lines[0].pv, 6)) : '';
  const isBest = bestUci === uci;

  let cls: Classification;
  const book = isBookMove(sans, ply);
  if (book && loss < 8) cls = 'book';
  else if (isBest || loss < 1) {
    cls = 'best';
    const second = before?.lines[1];
    const afterChess = new Chess(fenAfter);
    // sacrifice: the moved piece can be taken by a cheaper piece or is undefended, and it's not a winning capture
    const hang = hangingPieces(afterChess, color).some((h) => h.square === move.to);
    const sac = hang && move.piece !== 'p' && (!move.captured || VALUE[move.captured] < VALUE[move.piece]) && !afterChess.isCheckmate();
    if (sac && winAfter >= 50 && winBefore < 95) cls = 'brilliant';
    else if (second && winBefore < 90) {
      const secondWin = povWin({ cp: second.cp, mate: second.mate }, color);
      if (winAfter - secondWin >= 18 && winAfter > 45) cls = 'great';
    }
  } else if (loss < 2.5) cls = 'excellent';
  else if (loss < 6) cls = 'good';
  else if (loss < 12) cls = 'inaccuracy';
  else if (loss < 22) cls = 'mistake';
  else cls = 'blunder';

  if ((cls === 'mistake' || cls === 'blunder' || cls === 'inaccuracy') && prevWinForMover !== undefined && winBefore - prevWinForMover > 15 && winAfter < winBefore - 10 && winAfter > 30) {
    cls = 'miss';
  }

  // ---------- comment ----------
  const comment: string[] = [];
  const san = fig(move.san);
  const info = CLASS_INFO[cls];
  const facts = moveFacts(chess, move, { ply });
  switch (cls) {
    case 'book':
      comment.push(`${san} est un coup théorique, joué par les maîtres dans cette ouverture.`);
      break;
    case 'brilliant':
      comment.push(`${san} est un coup brillant ! Vous sacrifiez du matériel, mais l'adversaire ne peut pas en profiter.`);
      break;
    case 'great':
      comment.push(`${san} est un très bon coup : c'était le seul coup qui gardait l'avantage.`);
      break;
    case 'best':
      comment.push(`${san} est le meilleur coup de la position.`);
      break;
    case 'excellent':
      comment.push(`${san} est un excellent coup, presque aussi fort que le meilleur.`);
      break;
    case 'good':
      comment.push(`${san} est un coup correct.`);
      break;
    case 'inaccuracy':
      comment.push(`${san} est une imprécision : il y avait mieux.`);
      break;
    case 'mistake':
      comment.push(`${san} est une erreur qui donne l'avantage à l'adversaire.`);
      break;
    case 'miss':
      comment.push(`${san} : occasion manquée ! L'adversaire venait de faire une erreur et vous pouviez en profiter.`);
      break;
    case 'blunder':
      comment.push(`${san} est une gaffe qui change le cours de la partie.`);
      break;
  }
  if (info.points >= 0.75) {
    comment.push(...facts);
    const l = after?.lines[0];
    if (l?.mate != null && (color === 'w' ? l.mate > 0 : l.mate < 0)) comment.push(`Vous avez un mat forcé en ${Math.abs(l.mate)} !`);
  } else {
    // what is wrong
    comment.push(...facts.filter((f) => f.startsWith('Attention')));
    const afterChess = new Chess(fenAfter);
    const ref = describeRefutation(fenAfter, after, color);
    if (ref) comment.push(ref);
    else {
      const hang = hangingPieces(afterChess, color).filter((h) => h.type !== 'p');
      if (hang.length) comment.push(`${capFirst(yourP(hang[0].type))} en ${hang[0].square} est maintenant en prise.`);
    }
    if (bestMove && bestSan) {
      const bm = new Chess(fenBefore);
      const bf = moveFacts(bm, bestMove, { ply });
      const bl = before?.lines[0];
      let why = '';
      if (bl?.mate != null && (color === 'w' ? bl.mate > 0 : bl.mate < 0)) why = ` qui menait à un mat en ${Math.abs(bl.mate)}`;
      comment.push(`Le meilleur coup était ${fig(bestSan)}${why}.${bf.length ? ' ' + bf[0] : ''}`);
      if (bestLine) comment.push(`Ligne conseillée : ${bestLine}`);
    }
  }
  comment.push(describeEval(scoreAfter));

  return {
    ply, san: move.san, uci, color, classification: cls, winBefore, winAfter, scoreAfter,
    bestUci, bestSan, bestLine, comment,
  };
}

/** Accuracy of each player for a list of reviews. */
export function gameAccuracy(reviews: MoveReview[]): { w: number; b: number } {
  const acc = { w: [] as number[], b: [] as number[] };
  for (const r of reviews) acc[r.color].push(moveAccuracy(Math.max(0, r.winBefore - r.winAfter)));
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 100);
  return { w: avg(acc.w), b: avg(acc.b) };
}

/** Rough performance estimate from accuracy (for fun, like chess.com "game rating"). */
export function estimatedElo(accuracy: number) {
  return Math.round(Math.max(100, Math.min(3000, 100 + (accuracy / 100) ** 3 * 2900)));
}

/** A short tip for the player before they move (used by hint button). */
export function hintText(fen: string, a: Analysis | null): string[] {
  const best = a?.best;
  if (!best) return ['Je réfléchis encore…'];
  const c = new Chess(fen);
  const m = uciToMove(new Chess(fen), best);
  if (!m) return [];
  const tips: string[] = [];
  const piece = theP(m.piece);
  tips.push(`Regardez ${piece} en ${m.from}.`);
  const after = new Chess(fen); after.move(m.san);
  if (after.isCheckmate()) tips.push('Il y a un mat en un coup !');
  else if (m.captured) tips.push('Une capture intéressante est possible.');
  else if (after.inCheck()) tips.push('Un échec peut être très fort ici.');
  const hang = hangingPieces(c, c.turn()).filter((h) => h.type !== 'p');
  if (hang.length && hang.some((h) => h.square === m.from)) tips.push(`${capFirst(yourP(hang[0].type))} est attaqué : mettez-le à l'abri.`);
  return tips;
}
