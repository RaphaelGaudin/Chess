import { SettingsBox, navigate } from '../App';
import { store } from '../lib/storage';
import { ALL_LESSONS } from '../data/lessons';
import { BOTS } from '../lib/bots';

export default function Home() {
  const games = store.games();
  const ps = store.puzzleState();
  const lessons = store.lessonsDone();
  const current = store.get<{ botId: string; over?: unknown } | null>('chess.current', null);
  const wins = games.filter((g) => (g.result === '1-0' && g.playerColor === 'w') || (g.result === '0-1' && g.playerColor === 'b')).length;
  const nextLesson = ALL_LESSONS.find((l) => !lessons.includes(l.id)) ?? ALL_LESSONS[0];
  const bot = current ? BOTS.find((b) => b.id === current.botId) : null;

  return (
    <div className="page home">
      <div className="hero">
        <div>
          <h1>Échecs Coach</h1>
          <p className="muted">Jouez contre des robots de tous niveaux, résolvez des problèmes, suivez des cours, et progressez grâce aux explications du coach.</p>
        </div>
      </div>
      <div className="home-grid">
        <button className="home-card play" onClick={() => navigate('/play')}>
          <div className="hc-icon">♞</div>
          <div className="hc-title">{current && !current.over ? 'Reprendre la partie' : 'Jouer contre un robot'}</div>
          <div className="hc-sub">{current && !current.over && bot ? `Contre ${bot.name} (${bot.elo})` : `${BOTS.length} niveaux, de 250 à 3200 Elo`}</div>
        </button>
        <button className="home-card" onClick={() => navigate('/puzzles')}>
          <div className="hc-icon">🧩</div>
          <div className="hc-title">Problèmes</div>
          <div className="hc-sub">Classement {ps.rating} · {ps.solved.length} résolus</div>
        </button>
        <button className="home-card" onClick={() => navigate(`/lessons/${nextLesson.id}`)}>
          <div className="hc-icon">🎓</div>
          <div className="hc-title">Cours</div>
          <div className="hc-sub">{lessons.length}/{ALL_LESSONS.length} · Suivant : {nextLesson.title}</div>
        </button>
        <button className="home-card" onClick={() => navigate('/analysis')}>
          <div className="hc-icon">🔍</div>
          <div className="hc-title">Analyse</div>
          <div className="hc-sub">Échiquier libre avec Stockfish</div>
        </button>
        <button className="home-card" onClick={() => navigate('/history')}>
          <div className="hc-icon">📜</div>
          <div className="hc-title">Mes parties</div>
          <div className="hc-sub">{games.length} parties · {wins} victoires</div>
        </button>
      </div>
      <div className="tip">
        <b>💡 Conseil du jour :</b> {TIPS[new Date().getDate() % TIPS.length]}
      </div>
      <SettingsBox className="mobile-only" />
      <p className="tiny muted center">Sur iPhone : ouvrez cette page dans Safari, touchez Partager puis « Sur l'écran d'accueil » pour l'installer comme une application.</p>
    </div>
  );
}

const TIPS = [
  'Avant chaque coup, cherchez les échecs, les prises et les menaces — pour vous ET pour votre adversaire.',
  'Développez vos cavaliers avant vos fous, et roquez tôt.',
  'Une pièce non défendue est une pièce en danger.',
  'En finale, le roi devient une pièce d\'attaque : activez-le !',
  'Quand vous avez l\'avantage, échangez les pièces ; quand vous êtes moins bien, gardez-les.',
  'Les tours adorent les colonnes ouvertes et la 7e rangée.',
  'Ne prenez pas un pion si cela retarde trop votre développement.',
  'Si vous ne savez pas quoi jouer, améliorez votre pièce la moins active.',
];
