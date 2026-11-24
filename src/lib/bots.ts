import { Chess } from 'chess.js';
import { getEngine, scoreValue } from './engine';

export interface Bot {
  id: string;
  name: string;
  elo: number;
  avatar: string;
  color: string;
  description: string;
  // weak levels: softmax over MultiPV lines
  depth?: number;
  multipv?: number;
  temperature?: number; // centipawns
  randomRate?: number; // probability of a totally random move
  // strong levels: Stockfish limit strength
  uciElo?: number;
  movetime?: number;
}

export const BOTS: Bot[] = [
  { id: 'pousse', name: 'Pousse-Pion', elo: 250, avatar: '🐣', color: '#f4c542', description: 'Découvre tout juste comment bougent les pièces. Laisse souvent ses pièces en prise.', depth: 1, multipv: 10, temperature: 400, randomRate: 0.45 },
  { id: 'lea', name: 'Léa', elo: 400, avatar: '🙂', color: '#7fc97f', description: 'Débutante enthousiaste. Elle voit les prises simples, mais rarement les menaces.', depth: 2, multipv: 8, temperature: 250, randomRate: 0.25 },
  { id: 'max', name: 'Max', elo: 600, avatar: '😎', color: '#62a8e5', description: 'Aime attaquer la dame adverse très tôt. Commet encore des gaffes.', depth: 3, multipv: 6, temperature: 150, randomRate: 0.12 },
  { id: 'nina', name: 'Nina', elo: 800, avatar: '🦊', color: '#e5874a', description: 'Joueuse de club débutante. Connaît les principes d\'ouverture.', depth: 4, multipv: 5, temperature: 90, randomRate: 0.06 },
  { id: 'hugo', name: 'Hugo', elo: 1000, avatar: '🧢', color: '#a77fe5', description: 'Solide sur les tactiques simples, mais ses finales sont fragiles.', depth: 6, multipv: 4, temperature: 55, randomRate: 0.03 },
  { id: 'sofia', name: 'Sofia', elo: 1200, avatar: '🎓', color: '#e55f8a', description: 'Calcule bien à court terme et punit les erreurs évidentes.', depth: 8, multipv: 4, temperature: 30, randomRate: 0.01 },
  { id: 'karim', name: 'Karim', elo: 1500, avatar: '♟️', color: '#4bbf9f', description: 'Joueur de club confirmé. Positionnel et patient.', uciElo: 1500, movetime: 400 },
  { id: 'elena', name: 'Elena', elo: 1800, avatar: '🧠', color: '#d9b64c', description: 'Forte joueuse de tournoi. Elle exploite la moindre faiblesse.', uciElo: 1800, movetime: 600 },
  { id: 'prof', name: 'Le Professeur', elo: 2200, avatar: '🎩', color: '#9aa6b2', description: 'Niveau maître. Bonne chance !', uciElo: 2200, movetime: 800 },
  { id: 'gm', name: 'Grand Maître', elo: 2700, avatar: '👑', color: '#e5b84a', description: 'Niveau grand maître international.', uciElo: 2700, movetime: 1200 },
  { id: 'stockfish', name: 'Stockfish', elo: 3200, avatar: '🐟', color: '#81b64c', description: 'Le moteur à pleine puissance. Quasiment imbattable.', movetime: 1500 },
];

/** Returns a UCI move for the bot in the given position. */
export async function botMove(bot: Bot, fen: string): Promise<string | null> {
  const eng = getEngine('bot');
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;

  if (bot.uciElo || !bot.temperature) {
    if (bot.uciElo) {
      eng.setOption('UCI_LimitStrength', true);
      eng.setOption('UCI_Elo', bot.uciElo);
    } else {
      eng.setOption('UCI_LimitStrength', false);
      eng.setOption('Skill Level', 20);
    }
    const a = await eng.analyse(fen, { movetime: bot.movetime ?? 1000, multipv: 1 });
    return a?.best ?? legal[0].lan;
  }

  eng.setOption('UCI_LimitStrength', false);
  eng.setOption('Skill Level', 20);
  const delay = new Promise((r) => setTimeout(r, 350 + Math.random() * 500));

  if (Math.random() < (bot.randomRate ?? 0)) {
    await delay;
    // random but slightly prefers captures (beginners love captures)
    const caps = legal.filter((m) => m.captured);
    const pool = caps.length && Math.random() < 0.5 ? caps : legal;
    const m = pool[Math.floor(Math.random() * pool.length)];
    return m.from + m.to + (m.promotion ?? '');
  }

  const a = await eng.analyse(fen, { depth: bot.depth ?? 4, multipv: Math.min(bot.multipv ?? 4, legal.length) });
  await delay;
  if (!a || !a.lines.length) return legal[0].lan;
  const sign = chess.turn() === 'w' ? 1 : -1;
  const vals = a.lines.map((l) => Math.max(-3000, Math.min(3000, sign * scoreValue(l))));
  const best = Math.max(...vals);
  const T = bot.temperature!;
  const weights = vals.map((v) => Math.exp((v - best) / T));
  const total = weights.reduce((x, y) => x + y, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return a.lines[i].pv[0];
  }
  return a.lines[0].pv[0];
}
