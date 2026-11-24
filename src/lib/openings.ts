// Small opening book (SAN sequences from the initial position) with French names.
export interface Opening {
  name: string;
  moves: string; // space separated SAN
  idea?: string;
}

export const OPENINGS: Opening[] = [
  { name: 'Ouverture du pion roi', moves: 'e4', idea: 'Occupe le centre et libère la dame et le fou f1.' },
  { name: 'Ouverture du pion dame', moves: 'd4', idea: 'Occupe le centre, le pion d4 est protégé par la dame.' },
  { name: 'Ouverture anglaise', moves: 'c4', idea: 'Contrôle la case d5 par le flanc.' },
  { name: 'Ouverture Réti', moves: 'Nf3', idea: 'Développement souple, contrôle e5 et d4.' },
  { name: 'Partie ouverte', moves: 'e4 e5' },
  { name: 'Ouverture du cavalier roi', moves: 'e4 e5 Nf3', idea: 'Développe le cavalier en attaquant le pion e5.' },
  { name: 'Défense Petrov', moves: 'e4 e5 Nf3 Nf6', idea: 'Les noirs contre-attaquent le pion e4 au lieu de défendre e5.' },
  { name: 'Défense Philidor', moves: 'e4 e5 Nf3 d6', idea: 'Défense solide mais un peu passive du pion e5.' },
  { name: 'Partie des trois cavaliers', moves: 'e4 e5 Nf3 Nc6 Nc3' },
  { name: 'Partie des quatre cavaliers', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  { name: 'Partie italienne', moves: 'e4 e5 Nf3 Nc6 Bc4', idea: 'Le fou vise la case faible f7.' },
  { name: 'Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5', idea: 'Développement symétrique, les deux fous visent f7 et f2.' },
  { name: 'Gambit Evans', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4', idea: 'Les blancs sacrifient un pion pour gagner du temps et le centre.' },
  { name: 'Défense des deux cavaliers', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6', idea: 'Les noirs contre-attaquent e4.' },
  { name: 'Attaque Fegatello (Fried Liver)', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7', idea: 'Sacrifice du cavalier en f7 pour exposer le roi noir.' },
  { name: 'Défense hongroise', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7' },
  { name: 'Partie espagnole (Ruy Lopez)', moves: 'e4 e5 Nf3 Nc6 Bb5', idea: 'Le fou met la pression sur le cavalier qui défend e5.' },
  { name: 'Espagnole, variante Morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6', idea: 'Les noirs questionnent immédiatement le fou.' },
  { name: 'Espagnole, défense berlinoise', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6', idea: 'Défense très solide, célèbre au plus haut niveau.' },
  { name: 'Espagnole fermée', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7' },
  { name: 'Partie écossaise', moves: 'e4 e5 Nf3 Nc6 d4', idea: 'Les blancs ouvrent le centre tout de suite.' },
  { name: 'Gambit du roi', moves: 'e4 e5 f4', idea: 'Sacrifice de pion pour ouvrir la colonne f et dominer le centre.' },
  { name: 'Partie viennoise', moves: 'e4 e5 Nc3' },
  { name: 'Ouverture du fou', moves: 'e4 e5 Bc4' },
  { name: 'Partie du centre', moves: 'e4 e5 d4 exd4 Qxd4' },
  { name: 'Défense sicilienne', moves: 'e4 c5', idea: 'Lutte asymétrique pour la case d4. La réponse la plus combative à 1.e4.' },
  { name: 'Sicilienne ouverte', moves: 'e4 c5 Nf3 d6 d4' },
  { name: 'Sicilienne Najdorf', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', idea: 'Le coup a6 prépare ...e5 ou ...b5 et contrôle b5.' },
  { name: 'Sicilienne du Dragon', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', idea: 'Le fou en fianchetto en g7 souffle comme un dragon sur la grande diagonale.' },
  { name: 'Sicilienne, variante classique', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6' },
  { name: 'Sicilienne Taimanov', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6' },
  { name: 'Sicilienne Alapin', moves: 'e4 c5 c3', idea: 'Prépare d4 pour construire un centre de pions.' },
  { name: 'Sicilienne fermée', moves: 'e4 c5 Nc3' },
  { name: 'Gambit Smith-Morra', moves: 'e4 c5 d4 cxd4 c3' },
  { name: 'Défense française', moves: 'e4 e6', idea: 'Prépare ...d5 avec une structure solide.' },
  { name: 'Française, variante d\'avance', moves: 'e4 e6 d4 d5 e5' },
  { name: 'Française, variante d\'échange', moves: 'e4 e6 d4 d5 exd5 exd5' },
  { name: 'Française Winawer', moves: 'e4 e6 d4 d5 Nc3 Bb4' },
  { name: 'Française Tarrasch', moves: 'e4 e6 d4 d5 Nd2' },
  { name: 'Défense Caro-Kann', moves: 'e4 c6', idea: 'Prépare ...d5 en gardant le fou c8 libre.' },
  { name: 'Caro-Kann, variante d\'avance', moves: 'e4 c6 d4 d5 e5' },
  { name: 'Caro-Kann classique', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5' },
  { name: 'Défense scandinave', moves: 'e4 d5', idea: 'Attaque immédiatement le pion e4.' },
  { name: 'Défense Pirc', moves: 'e4 d6 d4 Nf6 Nc3 g6' },
  { name: 'Défense moderne', moves: 'e4 g6' },
  { name: 'Défense Alekhine', moves: 'e4 Nf6', idea: 'Provoque l\'avance des pions blancs pour les attaquer ensuite.' },
  { name: 'Défense Owen', moves: 'e4 b6' },
  { name: 'Partie du pion dame', moves: 'd4 d5' },
  { name: 'Gambit dame', moves: 'd4 d5 c4', idea: 'Les blancs offrent un pion pour détourner le pion d5 du centre.' },
  { name: 'Gambit dame accepté', moves: 'd4 d5 c4 dxc4' },
  { name: 'Gambit dame refusé', moves: 'd4 d5 c4 e6', idea: 'Les noirs maintiennent solidement leur pion d5.' },
  { name: 'Défense slave', moves: 'd4 d5 c4 c6', idea: 'Soutient d5 sans enfermer le fou c8.' },
  { name: 'Défense semi-slave', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6' },
  { name: 'Contre-gambit Albin', moves: 'd4 d5 c4 e5' },
  { name: 'Système de Londres', moves: 'd4 d5 Bf4', idea: 'Système simple et solide : fou en f4, pions e3-c3.' },
  { name: 'Système de Londres', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { name: 'Système de Londres', moves: 'd4 Nf6 Bf4' },
  { name: 'Système Colle', moves: 'd4 d5 Nf3 Nf6 e3' },
  { name: 'Défenses indiennes', moves: 'd4 Nf6' },
  { name: 'Défense est-indienne', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', idea: 'Les noirs laissent le centre aux blancs pour l\'attaquer plus tard avec ...e5 ou ...c5.' },
  { name: 'Défense Grünfeld', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  { name: 'Défense nimzo-indienne', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', idea: 'Le fou cloue le cavalier c3 et lutte pour la case e4.' },
  { name: 'Défense ouest-indienne', moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { name: 'Ouverture catalane', moves: 'd4 Nf6 c4 e6 g3' },
  { name: 'Gambit Benko', moves: 'd4 Nf6 c4 c5 d5 b5' },
  { name: 'Défense Benoni', moves: 'd4 Nf6 c4 c5 d5' },
  { name: 'Défense hollandaise', moves: 'd4 f5', idea: 'Contrôle e4 avec le pion f, plan d\'attaque sur l\'aile roi.' },
  { name: 'Gambit Budapest', moves: 'd4 Nf6 c4 e5' },
  { name: 'Ouverture anglaise, sicilienne inversée', moves: 'c4 e5' },
  { name: 'Ouverture anglaise symétrique', moves: 'c4 c5' },
  { name: 'Ouverture Bird', moves: 'f4' },
  { name: 'Ouverture Larsen', moves: 'b3' },
  { name: 'Ouverture Grob', moves: 'g4' },
];

const BY_MOVES = new Map<string, Opening>();
for (const o of OPENINGS) if (!BY_MOVES.has(o.moves)) BY_MOVES.set(o.moves, o);

/** Longest named opening matching the start of the SAN move list. */
export function detectOpening(sans: string[]): { opening: Opening; plies: number } | null {
  let found: { opening: Opening; plies: number } | null = null;
  for (let i = 1; i <= Math.min(sans.length, 14); i++) {
    const o = BY_MOVES.get(sans.slice(0, i).join(' '));
    if (o) found = { opening: o, plies: i };
  }
  return found;
}

/** Is the move at index `ply` part of a known book line? */
export function isBookMove(sans: string[], ply: number): boolean {
  const prefix = sans.slice(0, ply + 1).join(' ');
  for (const o of OPENINGS) {
    if (o.moves === prefix || o.moves.startsWith(prefix + ' ')) return true;
  }
  return false;
}
