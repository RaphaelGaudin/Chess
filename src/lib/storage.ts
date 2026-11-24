import { useEffect, useState } from 'react';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or unavailable */
  }
}

export interface SavedGame {
  id: string;
  date: number;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  reason: string;
  pgn: string;
  playerColor: 'w' | 'b';
  botId?: string;
  accuracy?: { w: number; b: number };
}

export interface Settings {
  sound: boolean;
  showCoach: boolean;
  showEvalBar: boolean;
  showLegal: boolean;
  autoQueen: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, showCoach: true, showEvalBar: true, showLegal: true, autoQueen: false };

export interface PuzzleState { rating: number; solved: string[]; failed: string[]; streak: number; best: number }

export const store = {
  games: (): SavedGame[] => read<SavedGame[]>('chess.games', []),
  saveGame(g: SavedGame) {
    const games = store.games().filter((x) => x.id !== g.id);
    games.unshift(g);
    write('chess.games', games.slice(0, 200));
  },
  deleteGame(id: string) {
    write('chess.games', store.games().filter((x) => x.id !== id));
  },
  puzzleState: (): PuzzleState => read<PuzzleState>('chess.puzzles', { rating: 800, solved: [], failed: [], streak: 0, best: 0 }),
  savePuzzleState(s: PuzzleState) {
    write('chess.puzzles', s);
  },
  lessonsDone: (): string[] => read<string[]>('chess.lessons', []),
  markLesson(id: string) {
    const d = new Set(store.lessonsDone());
    d.add(id);
    write('chess.lessons', [...d]);
  },
  settings: (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>('chess.settings', {}) }),
  saveSettings(s: Settings) {
    write('chess.settings', s);
  },
  get<T>(k: string, f: T): T { return read<T>(k, f); },
  set(k: string, v: unknown) { write(k, v); },
};

const listeners = new Set<() => void>();
export function useSettings(): [Settings, (s: Partial<Settings>) => void] {
  const [s, setS] = useState(store.settings());
  useEffect(() => {
    const l = () => setS(store.settings());
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return [s, (patch) => {
    const n = { ...store.settings(), ...patch };
    store.saveSettings(n);
    listeners.forEach((l) => l());
  }];
}
