# ♞ Échecs Coach

Application d'échecs inspirée de chess.com, utilisable sur **PC** et **iPhone** (application web installable / PWA).

## Fonctionnalités

- **Jouer contre des robots** : 11 niveaux, de 250 à 3200 Elo, tous basés sur **Stockfish 19** (WebAssembly, directement dans le navigateur).
- **Coach** : chaque coup est classé (Brillant, Meilleur coup, Excellent, Imprécision, Erreur, Gaffe…) et expliqué en français : ce que fait le coup, ce qu'il permet à l'adversaire, quel était le meilleur coup et pourquoi. Avec les boutons **Indice**, **Réessayer** et **Voir le meilleur coup**.
- **Historique des coups** cliquable, navigation au clavier (← →), badges de classification, nom de l'ouverture.
- **Bilan de partie** : précision de chaque joueur, nombre de coups par catégorie, graphique d'évaluation, revue coup par coup.
- **Problèmes** : classement Elo, séries, thèmes (fourchette, mat, pièce en prise…), indices et solution expliquée.
- **Cours interactifs** : les bases, les règles spéciales, les tactiques, les mats élémentaires (contre Stockfish), les ouvertures et les finales.
- **Analyse libre** : Stockfish en direct (3 lignes), import/export PGN et FEN.
- **Mes parties** : toutes vos parties sont sauvegardées sur l'appareil.
- Fonctionne **hors ligne** une fois installée.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:5173. Pour la version de production : `npm run build` puis `npm run preview`.

## Installer sur iPhone

1. Publiez le site (voir ci-dessous) ou ouvrez-le depuis votre réseau local (`npm run dev -- --host`).
2. Ouvrez l'adresse dans **Safari**.
3. Touchez **Partager** → **Sur l'écran d'accueil**.

L'application s'ouvre alors en plein écran, comme une application native.

## Publication sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et publie le site à chaque push sur `main`.
Activez-le une fois dans **Settings → Pages → Source : GitHub Actions**. Le site sera disponible à
`https://<utilisateur>.github.io/<dépôt>/`.

## Scripts utiles

- `npm run verify` : vérifie que toutes les positions et solutions des cours et le livre d'ouvertures sont légales.
- `node scripts/gen-puzzles.cjs <graine> <nombre> <fichier.json>` : génère de nouveaux problèmes par auto-parties de Stockfish (avec `MODE=mate` pour des mats). Chaque solution est vérifiée comme **unique** par le moteur.
- `node scripts/merge-puzzles.cjs fichiers...json` : ajoute les problèmes générés à `src/data/puzzles.json`.

## Technique

React + TypeScript + Vite, [chess.js](https://github.com/jhlywa/chess.js) pour les règles,
[chessground](https://github.com/lichess-org/chessground) pour l'échiquier (souris et tactile),
[Stockfish.js](https://github.com/nmrugg/stockfish.js) (version « lite single-threaded ») dans des Web Workers.

Stockfish et chessground sont distribués sous licence GPL-3.0.
