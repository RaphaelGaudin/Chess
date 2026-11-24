import { useState } from 'react';
import { navigate } from '../App';
import { store } from '../lib/storage';

export default function History() {
  const [games, setGames] = useState(store.games());
  const res = (g: (typeof games)[0]) => {
    if (g.result === '1/2-1/2') return { t: 'Nulle', c: 'draw' };
    const won = (g.result === '1-0') === (g.playerColor === 'w');
    return won ? { t: 'Victoire', c: 'win' } : { t: 'Défaite', c: 'loss' };
  };
  const wins = games.filter((g) => res(g).c === 'win').length;
  const losses = games.filter((g) => res(g).c === 'loss').length;
  const draws = games.length - wins - losses;
  return (
    <div className="page">
      <div className="page-title">
        <h2>📜 Mes parties</h2>
        <div className="muted">{wins} victoires · {draws} nulles · {losses} défaites</div>
      </div>
      {!games.length && <p className="muted">Aucune partie pour l'instant. <button className="btn primary" onClick={() => navigate('/play')}>Jouer une partie</button></p>}
      <div className="game-list">
        {games.map((g) => {
          const r = res(g);
          const n = Math.ceil((g.pgn.match(/\d+\./g) ?? []).length);
          return (
            <div key={g.id} className="game-row">
              <div className={`result-badge ${r.c}`}>{r.t}</div>
              <div className="game-info" onClick={() => navigate(`/review/${g.id}`)}>
                <div><b>{g.white}</b> vs <b>{g.black}</b></div>
                <div className="small muted">{new Date(g.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {n} coups · {g.result}
                  {g.accuracy && <> · précision {(g.playerColor === 'w' ? g.accuracy.w : g.accuracy.b).toFixed(1)}%</>}</div>
              </div>
              <div className="row gap">
                <button className="btn small" onClick={() => navigate(`/review/${g.id}`)}>📊 Bilan</button>
                <button className="btn small ghost" onClick={() => { if (confirm('Supprimer cette partie ?')) { store.deleteGame(g.id); setGames(store.games()); } }} aria-label="Supprimer">🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
