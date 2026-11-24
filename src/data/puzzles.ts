import generated from './puzzles.json';

export interface Puzzle {
  id: string;
  /** position BEFORE the opponent's move; moves[0] is played automatically */
  fen: string;
  moves: string[]; // UCI
  rating: number;
  themes: string[];
}

export const THEMES: Record<string, { name: string; explain: string }> = {
  mate: { name: 'Mat', explain: 'Le roi adverse est attaqué et ne peut échapper à l\'échec : la partie est gagnée.' },
  mateIn1: { name: 'Mat en 1', explain: 'Cherchez d\'abord tous les échecs possibles : l\'un d\'eux est mat.' },
  mateIn2: { name: 'Mat en 2', explain: 'Un premier coup forcé (souvent un échec ou un sacrifice) prépare le mat.' },
  mateIn3: { name: 'Mat en 3', explain: 'Une combinaison forcée de plusieurs coups : chaque coup laisse très peu de choix à l\'adversaire.' },
  hangingPiece: { name: 'Pièce en prise', explain: 'L\'adversaire a laissé une pièce sans défense (ou insuffisamment défendue). Vérifiez toujours si une prise gratuite est possible.' },
  fork: { name: 'Fourchette', explain: 'Une seule pièce attaque deux cibles en même temps ; l\'adversaire ne peut en sauver qu\'une.' },
  sacrifice: { name: 'Sacrifice', explain: 'On donne volontairement du matériel pour obtenir un avantage plus grand (mat, gain de matériel supérieur).' },
  promotion: { name: 'Promotion', explain: 'Un pion qui atteint la dernière rangée se transforme, généralement en dame.' },
  endgame: { name: 'Finale', explain: 'Peu de pièces restent sur l\'échiquier : l\'activité du roi et les pions passés deviennent décisifs.' },
  advantage: { name: 'Avantage', explain: 'Le bon coup donne un avantage net et durable.' },
  crushing: { name: 'Écrasant', explain: 'Le bon coup donne un avantage décisif.' },
  pin: { name: 'Clouage', explain: 'Une pièce ne peut pas bouger sans exposer une pièce plus importante derrière elle.' },
  skewer: { name: 'Enfilade', explain: 'Une pièce de valeur est attaquée ; quand elle s\'écarte, la pièce derrière elle tombe.' },
  backRank: { name: 'Mat du couloir', explain: 'Le roi est enfermé derrière ses propres pions sur sa première rangée.' },
  discovered: { name: 'Attaque à la découverte', explain: 'En déplaçant une pièce, on démasque l\'attaque d\'une autre pièce située derrière.' },
};

/** Hand-made classic puzzles (verified with Stockfish by scripts/verify-data.cjs). */
const CLASSICS: Puzzle[] = [];

export const PUZZLES: Puzzle[] = [...CLASSICS, ...(generated as Puzzle[])].sort((a, b) => a.rating - b.rating);
