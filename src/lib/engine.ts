// Wrapper around Stockfish (WASM, lite single-threaded) running in a Web Worker.
// All scores returned are from WHITE's point of view.

export interface Score {
  cp: number | null; // centipawns, white POV
  mate: number | null; // moves to mate, >0 white mates, <0 black mates
}

export interface Line extends Score {
  multipv: number;
  depth: number;
  pv: string[]; // UCI moves
}

export interface Analysis {
  fen: string;
  best: string | null;
  depth: number;
  lines: Line[];
}

export interface AnalyseOptions {
  depth?: number;
  movetime?: number;
  multipv?: number;
  onInfo?: (a: Analysis) => void;
}

interface Job {
  fen: string;
  opts: AnalyseOptions;
  resolve: (a: Analysis | null) => void;
}

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

export class Engine {
  private worker: Worker;
  private queue: Job[] = [];
  private current: Job | null = null;
  private lines: Map<number, Line> = new Map();
  private ready: Promise<void>;
  private readyResolve!: () => void;
  private currentOptions: Record<string, string> = {};
  private stopped = false;

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.ready = new Promise((r) => (this.readyResolve = r));
    this.worker.onmessage = (e) => this.onLine(String(e.data));
    this.send('uci');
    this.send('setoption name Hash value 16');
    this.send('isready');
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  /** Set a UCI option (only sent if changed). Takes effect for the next search. */
  setOption(name: string, value: string | number | boolean) {
    const v = String(value);
    if (this.currentOptions[name] === v) return;
    this.currentOptions[name] = v;
    this.send(`setoption name ${name} value ${v}`);
  }

  private onLine(line: string) {
    if (line === 'readyok') {
      this.readyResolve();
      return;
    }
    const job = this.current;
    if (!job) return;
    if (line.startsWith('info') && line.includes(' pv ')) {
      const parsed = parseInfo(line, job.fen);
      if (parsed) {
        this.lines.set(parsed.multipv, parsed);
        if (job.opts.onInfo && parsed.multipv === (job.opts.multipv ?? 1)) {
          job.opts.onInfo(this.snapshot(job.fen, null));
        }
      }
    } else if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      const res = this.snapshot(job.fen, best && best !== '(none)' ? best : null);
      this.current = null;
      job.resolve(this.stopped && res.lines.length === 0 ? null : res);
      this.stopped = false;
      this.next();
    }
  }

  private snapshot(fen: string, best: string | null): Analysis {
    const lines = [...this.lines.values()].sort((a, b) => a.multipv - b.multipv);
    return { fen, best: best ?? lines[0]?.pv[0] ?? null, depth: lines[0]?.depth ?? 0, lines };
  }

  private async next() {
    if (this.current || this.queue.length === 0) return;
    const job = this.queue.shift()!;
    this.current = job;
    await this.ready;
    this.lines = new Map();
    this.setOption('MultiPV', job.opts.multipv ?? 1);
    this.send(`position fen ${job.fen}`);
    const parts = ['go'];
    if (job.opts.depth) parts.push('depth', String(job.opts.depth));
    if (job.opts.movetime) parts.push('movetime', String(job.opts.movetime));
    if (!job.opts.depth && !job.opts.movetime) parts.push('depth', '12');
    this.send(parts.join(' '));
  }

  /** Queue an analysis. Resolves with null if cancelled before it started. */
  analyse(fen: string, opts: AnalyseOptions = {}): Promise<Analysis | null> {
    return new Promise((resolve) => {
      this.queue.push({ fen, opts, resolve });
      this.next();
    });
  }

  /** Drop all queued jobs and stop the running search (it resolves with partial results). */
  stop() {
    for (const j of this.queue) j.resolve(null);
    this.queue = [];
    if (this.current) {
      this.stopped = true;
      this.send('stop');
    }
  }

  newGame() {
    this.stop();
    this.send('ucinewgame');
  }

  terminate() {
    this.stop();
    this.worker.terminate();
  }
}

function parseInfo(line: string, fen: string): Line | null {
  const tok = line.split(' ');
  let depth = 0,
    multipv = 1,
    cp: number | null = null,
    mate: number | null = null;
  let pv: string[] = [];
  for (let i = 0; i < tok.length; i++) {
    const t = tok[i];
    if (t === 'depth') depth = +tok[++i];
    else if (t === 'multipv') multipv = +tok[++i];
    else if (t === 'score') {
      const kind = tok[++i];
      const val = +tok[++i];
      if (kind === 'cp') cp = val;
      else if (kind === 'mate') mate = val;
      if (tok[i + 1] === 'lowerbound' || tok[i + 1] === 'upperbound') return null;
    } else if (t === 'pv') {
      pv = tok.slice(i + 1);
      break;
    }
  }
  if (!pv.length) return null;
  const blackToMove = fen.split(' ')[1] === 'b';
  if (blackToMove) {
    if (cp !== null) cp = -cp;
    if (mate !== null) mate = -mate;
  }
  return { depth, multipv, cp, mate, pv };
}

// ---------- helpers on scores ----------

/** Win probability (0-100) for white, lichess formula. */
export function winPercent(s: Score): number {
  if (s.mate !== null) return s.mate > 0 ? 100 : s.mate < 0 ? 0 : 50;
  const cp = Math.max(-1000, Math.min(1000, s.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Single number for sorting, white POV. */
export function scoreValue(s: Score): number {
  if (s.mate !== null) return s.mate > 0 ? 100000 - s.mate * 100 : -100000 - s.mate * 100;
  return s.cp ?? 0;
}

export function formatScore(s: Score | null | undefined): string {
  if (!s) return '0.0';
  if (s.mate !== null) return s.mate === 0 ? '#' : `${s.mate > 0 ? '' : '-'}M${Math.abs(s.mate)}`;
  const v = (s.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}

// Shared engines (lazy): 'bot' plays moves, 'coach' reviews moves, 'live' runs the analysis board.
const engines = new Map<string, Engine>();
export function getEngine(name: 'bot' | 'coach' | 'live'): Engine {
  let e = engines.get(name);
  if (!e) {
    e = new Engine();
    engines.set(name, e);
  }
  return e;
}

/** Cached fixed-depth analysis on the coach engine (used for move reviews). */
const cache = new Map<string, Promise<Analysis | null>>();
export function coachAnalyse(fen: string, depth = 12, multipv = 2): Promise<Analysis | null> {
  const key = `${fen}|${depth}|${multipv}`;
  let p = cache.get(key);
  if (!p) {
    p = getEngine('coach').analyse(fen, { depth, multipv });
    p.then((r) => { if (!r) cache.delete(key); });
    cache.set(key, p);
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  }
  return p;
}
