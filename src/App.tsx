import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Play from './pages/Play';
import Puzzles from './pages/Puzzles';
import { LessonList, LessonView } from './pages/Lessons';
import Analysis from './pages/Analysis';
import History from './pages/History';
import Review from './pages/Review';
import { useSettings } from './lib/storage';

export function navigate(path: string) {
  window.location.hash = '#' + path;
}

function useRoute() {
  const get = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get());
  useEffect(() => {
    const h = () => { setRoute(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}

const NAV = [
  { path: '/', icon: '🏠', label: 'Accueil' },
  { path: '/play', icon: '♞', label: 'Jouer' },
  { path: '/puzzles', icon: '🧩', label: 'Problèmes' },
  { path: '/lessons', icon: '🎓', label: 'Cours' },
  { path: '/analysis', icon: '🔍', label: 'Analyse' },
  { path: '/history', icon: '📜', label: 'Parties' },
];

export default function App() {
  const route = useRoute();
  const [path] = route.split('?');
  const parts = path.split('/').filter(Boolean);
  const [settings, setSettings] = useSettings();

  let page: React.ReactNode;
  switch (parts[0]) {
    case 'play': page = <Play />; break;
    case 'puzzles': page = <Puzzles />; break;
    case 'lessons': page = parts[1] ? <LessonView key={parts[1]} id={parts[1]} /> : <LessonList />; break;
    case 'analysis': page = <Analysis key={route} />; break;
    case 'history': page = <History />; break;
    case 'review': page = <Review key={parts[1]} id={parts[1]} />; break;
    default: page = <Home />;
  }
  const active = '/' + (parts[0] ?? '');

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo" onClick={() => navigate('/')}>♞ <span>Échecs Coach</span></div>
        {NAV.map((n) => (
          <button key={n.path} className={`nav-item ${active === n.path ? 'active' : ''}`} onClick={() => navigate(n.path)}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
        <div className="sidebar-foot">
          <label className="small"><input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} /> Sons</label>
          <label className="small"><input type="checkbox" checked={settings.showLegal} onChange={(e) => setSettings({ showLegal: e.target.checked })} /> Coups possibles</label>
          <label className="small"><input type="checkbox" checked={settings.autoQueen} onChange={(e) => setSettings({ autoQueen: e.target.checked })} /> Promotion auto en dame</label>
          <div className="tiny muted">Moteur : Stockfish 19 (GPL)</div>
        </div>
      </nav>
      <main className="main">{page}</main>
    </div>
  );
}

export function SettingsBox({ className = '' }: { className?: string }) {
  const [settings, setSettings] = useSettings();
  return (
    <div className={`settings-box ${className}`}>
      <b>⚙ Réglages</b>
      <label><input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} /> Sons</label>
      <label><input type="checkbox" checked={settings.showLegal} onChange={(e) => setSettings({ showLegal: e.target.checked })} /> Afficher les coups possibles</label>
      <label><input type="checkbox" checked={settings.autoQueen} onChange={(e) => setSettings({ autoQueen: e.target.checked })} /> Promotion automatique en dame</label>
    </div>
  );
}
