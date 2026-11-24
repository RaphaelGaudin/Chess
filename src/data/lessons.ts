// Interactive lessons. Every position/solution is checked by scripts/verify-data.ts.

export interface LessonStep {
  /** Text shown by the coach. **bold** is supported. */
  text: string;
  fen?: string;
  arrows?: [string, string][];
  circles?: string[];
  orientation?: 'white' | 'black';
  /**
   * Move task: `moves` alternate between the student and automatic replies (UCI).
   * `accept` lists alternative correct first moves; `mate: true` accepts any checkmating move.
   */
  task?: { moves: string[]; accept?: string[]; mate?: boolean; success?: string; hint?: string };
  /** Play the position against Stockfish until the goal is reached. */
  practice?: { goal: 'mate' | 'promote'; maxMoves: number; success?: string };
}

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  summary: string;
  steps: LessonStep[];
}

export interface Course {
  id: string;
  title: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  description: string;
  lessons: Lesson[];
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const COURSES: Course[] = [
  {
    id: 'bases',
    title: 'Les bases',
    level: 'Débutant',
    description: 'L\'échiquier, la marche des pièces et le but du jeu.',
    lessons: [
      {
        id: 'echiquier',
        title: 'L\'échiquier et les pièces',
        icon: '♟',
        summary: 'Découvrez la position de départ et comment chaque pièce se déplace.',
        steps: [
          { text: 'Bienvenue ! Voici la **position de départ**. L\'échiquier compte 64 cases. Chaque joueur a 16 pièces : 8 pions, 2 tours, 2 cavaliers, 2 fous, 1 dame et 1 roi. Les **blancs commencent** toujours.', fen: START },
          { text: 'Repère important : la case en bas à droite (h1) est toujours **blanche**. Les colonnes sont nommées de **a à h** et les rangées de **1 à 8**. Chaque case a donc un nom, comme e4 ou d5.', fen: START, circles: ['h1', 'e4', 'd5'] },
          { text: 'La **tour** se déplace en ligne droite, horizontalement ou verticalement, d\'autant de cases qu\'elle veut. Prenez le pion noir avec la tour !', fen: '4k3/8/8/8/1p6/8/8/1R2K3 w - - 0 1', task: { moves: ['b1b4'], success: 'Parfait ! La tour prend en se plaçant sur la case de la pièce adverse.' } },
          { text: 'Le **fou** se déplace en diagonale, d\'autant de cases qu\'il veut. Il reste toujours sur la même couleur de case. Capturez le cavalier noir.', fen: '4k3/8/8/8/8/2n5/8/B3K3 w - - 0 1', task: { moves: ['a1c3'], success: 'Bravo ! Le fou a filé sur la grande diagonale.' } },
          { text: 'La **dame** est la pièce la plus puissante : elle combine les mouvements de la tour et du fou. Capturez la tour noire.', fen: '6k1/8/8/7r/8/8/8/3QK3 w - - 0 1', task: { moves: ['d1h5'], success: 'Excellent ! La dame se déplace dans toutes les directions.' } },
          { text: 'Le **cavalier** se déplace en « L » : deux cases dans une direction puis une sur le côté. C\'est la seule pièce qui peut **sauter** par-dessus les autres. Capturez le fou noir.', fen: '4k3/8/8/8/3b4/8/4N3/4K3 w - - 0 1', task: { moves: ['e2d4'], success: 'Très bien ! Le mouvement du cavalier demande un peu d\'entraînement.' } },
          { text: 'Le **roi** se déplace d\'une seule case dans n\'importe quelle direction. Il ne peut jamais aller sur une case attaquée. Capturez le cavalier qui s\'est approché.', fen: '4k3/8/8/8/8/8/5n2/4K3 w - - 0 1', task: { moves: ['e1f2'], success: 'Bien joué ! Le roi peut capturer une pièce non défendue.' } },
          { text: 'Le **pion** avance tout droit d\'une case, ou de **deux cases** lors de son premier déplacement. Avancez le pion de deux cases.', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', task: { moves: ['e2e4'], success: 'Exact ! Le pion ne recule jamais.' } },
          { text: 'Attention : le pion **capture en diagonale**, d\'une case vers l\'avant. Prenez le pion noir.', fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', task: { moves: ['e4d5'], success: 'Bravo ! Vous connaissez maintenant la marche de toutes les pièces.' } },
        ],
      },
      {
        id: 'regles-speciales',
        title: 'Les règles spéciales',
        icon: '♜',
        summary: 'Le roque, la promotion et la prise en passant.',
        steps: [
          { text: 'Le **roque** est un coup spécial qui met le roi à l\'abri et active la tour. Le roi se déplace de **deux cases** vers la tour, et la tour saute de l\'autre côté du roi.', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']] },
          { text: 'Conditions : ni le roi ni la tour ne doivent avoir bougé, les cases entre eux doivent être vides, et le roi ne doit pas être en échec ni traverser une case attaquée. Faites le **petit roque** (roi en g1).', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', task: { moves: ['e1g1'], success: 'Parfait ! Le petit roque est le plus fréquent.' } },
          { text: 'Maintenant le **grand roque** : le roi va en c1 et la tour en d1.', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', task: { moves: ['e1c1'], success: 'Bien ! Le grand roque place la tour directement au centre.' } },
          { text: 'La **promotion** : un pion qui atteint la dernière rangée se transforme en dame, tour, fou ou cavalier. On choisit presque toujours la **dame**. Faites promouvoir le pion.', fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', task: { moves: ['a7a8q'], accept: ['a7a8q', 'a7a8r'], success: 'Une nouvelle dame ! Et elle donne même échec.' } },
          { text: 'La **prise en passant** : quand un pion adverse avance de deux cases et arrive juste à côté de votre pion, vous pouvez le prendre **comme s\'il n\'avait avancé que d\'une case**. Le pion noir vient de jouer d7-d5. Prenez-le en passant !', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', arrows: [['e5', 'd6']], task: { moves: ['e5d6'], success: 'Bravo ! Attention, ce droit n\'existe qu\'au coup immédiatement suivant.' } },
        ],
      },
      {
        id: 'echec-mat',
        title: 'Échec, mat et pat',
        icon: '♚',
        summary: 'Le but du jeu : mettre le roi adverse échec et mat.',
        steps: [
          { text: 'Un roi attaqué est **en échec**. Le joueur doit immédiatement parer l\'échec : déplacer le roi, capturer la pièce qui attaque, ou s\'interposer.', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8']] },
          { text: 'Si aucun de ces moyens n\'est possible, c\'est **échec et mat** : la partie est gagnée ! Ici, le roi noir est enfermé derrière ses pions. Trouvez le mat en un coup.', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', task: { moves: ['a1a8'], mate: true, success: 'Échec et mat ! C\'est le célèbre **mat du couloir**.', hint: 'La tour peut atteindre la 8e rangée.' } },
          { text: 'La dame et le roi travaillent ensemble. Matez le roi noir en un coup.', fen: '7k/8/6K1/8/8/8/8/Q7 w - - 0 1', task: { moves: ['a1a8'], mate: true, success: 'Mat ! Le roi blanc contrôle les cases de fuite g7 et h7.' } },
          { text: 'Attention au **pat** ! Si le joueur qui doit jouer n\'a **aucun coup légal** mais n\'est **pas en échec**, la partie est **nulle**. Ici, les noirs ne peuvent plus bouger : c\'est pat. Avec un gros avantage, laissez toujours une case au roi adverse… jusqu\'au mat !', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', circles: ['h8'] },
          { text: 'Le **mat de l\'escalier** avec deux tours : une tour coupe la 7e rangée, l\'autre donne mat sur la 8e. Matez en un coup.', fen: 'k7/7R/8/8/8/8/8/6RK w - - 0 1', task: { moves: ['g1g8'], mate: true, success: 'Parfait ! Les deux tours forment un mur infranchissable.' } },
        ],
      },
      {
        id: 'valeur',
        title: 'La valeur des pièces',
        icon: '⚖',
        summary: 'Savoir ce que vaut chaque pièce pour bien échanger.',
        steps: [
          { text: 'Pour savoir si un échange est bon, on compte en **points** : pion = **1**, cavalier = **3**, fou = **3**, tour = **5**, dame = **9**. Le roi n\'a pas de valeur : il est inestimable !', fen: START },
          { text: 'Votre cavalier peut prendre un pion ou la dame. Choisissez la meilleure capture !', fen: '4k3/8/3q4/2p5/4N3/8/8/4K3 w - - 0 1', task: { moves: ['e4d6'], success: 'Bien sûr ! 9 points valent mieux qu\'un seul. Et en plus, c\'est échec.', hint: 'Quelle pièce vaut le plus ?' } },
          { text: 'Une pièce est **en prise** quand elle est attaquée et non défendue. Ici, la tour noire en a5 n\'est pas protégée. Capturez-la avec le fou.', fen: '4k3/8/r7/8/8/8/8/4KB2 w - - 0 1', task: { moves: ['f1a6'], hint: 'Suivez la diagonale du fou f1.', success: 'Bien vu ! 5 points gagnés gratuitement. Avant chaque coup, demandez-vous : « Qu\'est-ce qui est en prise ? »' } },
        ],
      },
    ],
  },
  {
    id: 'tactiques',
    title: 'Les tactiques',
    level: 'Intermédiaire',
    description: 'Fourchettes, clouages, enfilades et attaques à la découverte.',
    lessons: [
      {
        id: 'fourchette',
        title: 'La fourchette',
        icon: '🍴',
        summary: 'Attaquer deux pièces à la fois.',
        steps: [
          { text: 'Une **fourchette** est une attaque simultanée sur deux pièces (ou plus). L\'adversaire ne peut en sauver qu\'une. Le **cavalier** est le roi des fourchettes ! Trouvez la fourchette royale.', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', task: { moves: ['b5c7', 'e8e7', 'c7a8'], hint: 'Cherchez une case d\'où le cavalier attaque le roi ET la tour.', success: 'Superbe ! Échec au roi, puis la tour tombe.' } },
          { text: 'Les **pions** aussi peuvent faire des fourchettes. Attaquez les deux cavaliers noirs avec un seul pion !', fen: '4k3/8/3n1n2/8/4P3/8/8/4K3 w - - 0 1', task: { moves: ['e4e5'], success: 'Bien vu ! Un pion (1 point) attaque deux cavaliers (3 points chacun).' } },
          { text: 'La **dame** peut aussi faire des fourchettes. Trouvez un échec qui attaque en même temps la tour noire.', fen: 'r5k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1', task: { moves: ['d1d5', 'g8h8', 'd5a8'], hint: 'Un échec sur la diagonale du roi noir…', success: 'Exact ! Dd5+ attaque à la fois le roi et la tour a8.' } },
        ],
      },
      {
        id: 'clouage',
        title: 'Le clouage',
        icon: '📌',
        summary: 'Immobiliser une pièce devant une pièce plus importante.',
        steps: [
          { text: 'Un **clouage** immobilise une pièce : si elle bouge, une pièce plus précieuse derrière elle est exposée. Quand la pièce de derrière est le **roi**, le clouage est **absolu** : la pièce clouée ne peut pas bouger du tout.', fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1', arrows: [['b5', 'e8']] },
          { text: 'Clouez le cavalier noir sur son roi avec votre fou !', fen: '4k3/8/2n5/8/8/8/3P4/4KB2 w - - 0 1', task: { moves: ['f1b5'], success: 'Bien ! Le cavalier c6 ne peut plus bouger.' } },
          { text: 'Une pièce clouée est une cible idéale : attaquez-la avec un pion ! Le cavalier ne peut pas fuir.', fen: '4k3/7p/2n5/1B6/8/8/3P4/4K3 w - - 0 1', task: { moves: ['d2d4', 'h7h6', 'd4d5'], hint: 'Un pion peut avancer pour attaquer le cavalier.', success: 'Le cavalier est attaqué et toujours cloué : il va tomber !' } },
        ],
      },
      {
        id: 'enfilade',
        title: 'L\'enfilade',
        icon: '🍢',
        summary: 'Attaquer une pièce pour gagner celle qui est derrière.',
        steps: [
          { text: 'L\'**enfilade** est l\'inverse du clouage : la pièce la plus précieuse est **devant**. Quand elle s\'écarte, la pièce de derrière est capturée. Ici, le roi noir et la dame sont sur la même colonne. Donnez échec !', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', task: { moves: ['a1e1', 'e5d4', 'e1e8'], hint: 'Placez la tour sur la colonne e.', success: 'Enfilade réussie ! Le roi s\'écarte et la dame tombe.' } },
        ],
      },
      {
        id: 'decouverte',
        title: 'L\'attaque à la découverte',
        icon: '💥',
        summary: 'Démasquer une attaque en déplaçant une pièce.',
        steps: [
          { text: 'Une **attaque à la découverte** se produit quand une pièce se déplace et **démasque** l\'attaque d\'une autre pièce placée derrière elle. Ici, le fou bloque la tour qui vise le roi noir.', fen: '4k3/8/q7/8/8/8/4B3/4R1K1 w - - 0 1', arrows: [['e1', 'e8']] },
          { text: 'Déplacez le fou en donnant un **échec à la découverte** tout en attaquant la dame noire !', fen: '4k3/8/q7/8/8/8/4B3/4R1K1 w - - 0 1', task: { moves: ['e2d3'], accept: ['e2d3', 'e2b5'], hint: 'Quelle case du fou attaque la dame en a6 ?', success: 'Magnifique ! Les noirs doivent parer l\'échec de la tour, et la dame est perdue.' } },
        ],
      },
    ],
  },
  {
    id: 'mats',
    title: 'Les mats élémentaires',
    level: 'Débutant',
    description: 'Mater avec la dame, la tour, et reconnaître les mats classiques.',
    lessons: [
      {
        id: 'mat-berger',
        title: 'Le coup du berger',
        icon: '🐑',
        summary: 'Le piège le plus célèbre… et comment l\'éviter.',
        steps: [
          { text: 'Le **coup du berger** vise la case **f7**, défendue seulement par le roi noir. La dame et le fou blancs l\'attaquent ensemble. Les noirs viennent de jouer ...Cf6 ?? : matez en un coup !', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', arrows: [['c4', 'f7'], ['h5', 'f7']], task: { moves: ['h5f7'], mate: true, success: 'Échec et mat ! La dame est protégée par le fou.' } },
          { text: 'Maintenant, vous avez les **noirs**. La dame blanche menace f7. Défendez-vous en attaquant la dame ou en protégeant f7 !', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', orientation: 'black', task: { moves: ['g7g6'], accept: ['g7g6', 'd8e7', 'd8f6'], hint: 'Un pion peut chasser la dame, ou votre dame peut protéger f7.', success: 'Bien défendu ! Attention : ...g6 est le plus fort car il chasse la dame avec gain de temps.' } },
        ],
      },
      {
        id: 'mat-dame',
        title: 'Mater avec la dame',
        icon: '♕',
        summary: 'Roi et dame contre roi : la technique pour gagner.',
        steps: [
          { text: 'Technique : utilisez la dame pour **réduire la zone** du roi adverse (comme une boîte qui rétrécit), en restant à un saut de cavalier de lui. Puis amenez votre roi et donnez le mat sur le bord. **Attention au pat !**', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1' },
          { text: 'À vous ! Matez le roi noir (Stockfish défend). Vous avez 25 coups.', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', practice: { goal: 'mate', maxMoves: 25, success: 'Bravo, vous maîtrisez le mat de la dame !' } },
        ],
      },
      {
        id: 'mat-tour',
        title: 'Mater avec la tour',
        icon: '♖',
        summary: 'Roi et tour contre roi.',
        steps: [
          { text: 'Avec une tour, il faut l\'aide du roi. La tour **coupe** le roi adverse sur une rangée ou une colonne, votre roi se place **en face** du roi adverse (opposition), et la tour donne échec : le roi recule d\'une rangée. On répète jusqu\'au bord.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
          { text: 'Mat final typique : les rois sont face à face, la tour mate sur le bord. Trouvez-le !', fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1', task: { moves: ['h1h8'], mate: true, success: 'Mat ! Le roi blanc contrôle d7, e7 et f7.' } },
          { text: 'À vous ! Matez avec roi et tour contre Stockfish en 35 coups.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', practice: { goal: 'mate', maxMoves: 35, success: 'Excellent, c\'est l\'une des techniques les plus importantes !' } },
        ],
      },
      {
        id: 'mat-deux-tours',
        title: 'Le mat de l\'escalier',
        icon: '🪜',
        summary: 'Deux tours qui poussent le roi vers le bord.',
        steps: [
          { text: 'Les deux tours donnent échec **à tour de rôle** sur des rangées voisines, comme les marches d\'un escalier. Le roi adverse recule jusqu\'au bord.', fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1' },
          { text: 'À vous ! Matez avec les deux tours (sans vous approcher trop du roi adverse : il pourrait les attaquer).', fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1', practice: { goal: 'mate', maxMoves: 20, success: 'Parfait ! Les tours sont imparables.' } },
        ],
      },
    ],
  },
  {
    id: 'ouvertures',
    title: 'Les ouvertures',
    level: 'Intermédiaire',
    description: 'Les principes pour bien commencer une partie.',
    lessons: [
      {
        id: 'principes',
        title: 'Les 5 principes d\'ouverture',
        icon: '📖',
        summary: 'Centre, développement, roque… les règles d\'or.',
        steps: [
          { text: '**1. Occupez le centre.** Les cases e4, d4, e5 et d5 sont les plus importantes : une pièce au centre contrôle plus de cases. Jouez un pion central de deux cases.', fen: START, circles: ['e4', 'd4', 'e5', 'd5'], task: { moves: ['e2e4'], accept: ['e2e4', 'd2d4'], success: 'Très bien ! Ce pion contrôle le centre et libère vos pièces.' } },
          { text: '**2. Développez vos pièces** (cavaliers et fous) vers le centre, avant de bouger la dame. Les noirs ont répondu ...e5. Développez un cavalier en attaquant le pion e5.', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', task: { moves: ['g1f3'], success: 'Parfait ! Le cavalier se développe avec une menace.' } },
          { text: '**3. Ne bougez pas deux fois la même pièce** sans raison, et **4. ne sortez pas la dame trop tôt** : elle se ferait chasser par les pièces adverses avec gain de temps. Développez maintenant votre fou vers une bonne diagonale.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', task: { moves: ['f1c4'], accept: ['f1c4', 'f1b5'], success: 'Bien ! Le fou vise la case f7 (Fc4) ou le cavalier c6 (Fb5).' } },
          { text: '**5. Roquez tôt** pour mettre votre roi à l\'abri et connecter vos tours. Roquez maintenant !', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', task: { moves: ['e1g1'], success: 'Excellent ! Vous avez joué la **Partie italienne** en respectant tous les principes.' } },
        ],
      },
      {
        id: 'repertoire',
        title: 'Les grandes ouvertures',
        icon: '🗺',
        summary: 'Un tour d\'horizon des ouvertures les plus jouées.',
        steps: [
          { text: '**La Partie italienne** (1.e4 e5 2.Cf3 Cc6 3.Fc4) : un développement rapide, le fou vise f7. Idéale pour débuter.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', arrows: [['c4', 'f7']] },
          { text: '**La Partie espagnole** (3.Fb5) : le fou attaque le défenseur du pion e5. Une des ouvertures les plus riches et les plus jouées par les champions.', fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', arrows: [['b5', 'c6'], ['c6', 'e5']] },
          { text: '**La Défense sicilienne** (1.e4 c5) : les noirs luttent pour d4 avec un pion de côté. Elle crée des positions déséquilibrées où les noirs jouent pour gagner.', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', arrows: [['c5', 'd4']] },
          { text: '**La Défense française** (1.e4 e6 2.d4 d5) : solide, les noirs contestent le centre avec ...d5 et contre-attaquent souvent avec ...c5.', fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', arrows: [['d5', 'e4']] },
          { text: '**La Caro-Kann** (1.e4 c6 2.d4 d5) : comme la française, mais le fou c8 peut sortir avant ...e6. Très solide.', fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3' },
          { text: '**Le Gambit dame** (1.d4 d5 2.c4) : les blancs proposent un pion pour détourner le pion d5 du centre. S\'il est pris, les blancs le récupèrent souvent.', fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2', arrows: [['c4', 'd5']] },
          { text: '**Le Système de Londres** (1.d4 et 2.Ff4) : un plan simple et solide, très populaire chez les joueurs de club. Le fou sort avant de fermer la chaîne de pions avec e3.', fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3' },
          { text: 'Conseil du coach : au début, **comprenez les idées** plutôt que d\'apprendre par cœur. Dans l\'onglet **Analyse**, le nom de l\'ouverture s\'affiche automatiquement quand vous jouez des coups.', fen: START },
        ],
      },
    ],
  },
  {
    id: 'finales',
    title: 'Les finales',
    level: 'Avancé',
    description: 'Opposition, règle du carré et pion passé.',
    lessons: [
      {
        id: 'carre',
        title: 'La règle du carré',
        icon: '⬛',
        summary: 'Le roi peut-il rattraper le pion ?',
        steps: [
          { text: 'Pour savoir si un roi peut rattraper un pion passé, tracez un **carré** depuis le pion jusqu\'à la case de promotion. Si le roi peut **entrer dans le carré** au coup suivant, il rattrape le pion. Sinon, le pion va à dame !', fen: '8/8/8/8/P7/8/5k2/7K w - - 0 1', circles: ['a4', 'a8', 'e8', 'e4'] },
          { text: 'Ici, le roi noir est **hors du carré** (a4-a8-e8-e4). Poussez le pion : il ira à dame !', fen: '8/8/8/8/P7/8/5k2/7K w - - 0 1', practice: { goal: 'promote', maxMoves: 6, success: 'Le pion a gagné la course !' } },
        ],
      },
      {
        id: 'opposition',
        title: 'L\'opposition',
        icon: '♔',
        summary: 'Roi et pion contre roi.',
        steps: [
          { text: 'Deux rois face à face avec une case entre eux sont en **opposition**. Le joueur qui **ne doit pas** jouer « a l\'opposition » : l\'autre roi doit céder le passage.', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', arrows: [['e6', 'e8']] },
          { text: 'Règle d\'or : si votre roi atteint la **6e rangée devant son pion** (hors pion de la colonne a ou h), la partie est gagnée. Faites promouvoir le pion contre Stockfish !', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', practice: { goal: 'promote', maxMoves: 12, success: 'Bravo ! Vous maîtrisez la finale roi et pion contre roi.' } },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = COURSES.flatMap((c) => c.lessons.map((l) => ({ ...l, courseId: c.id })));
