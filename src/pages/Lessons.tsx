import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import Board from '../components/Board';
import { CoachBubble } from '../components/Widgets';
import { ALL_LESSONS, COURSES, type LessonStep } from '../data/lessons';
import { uciToMove } from '../lib/chessUtil';
import { getEngine } from '../lib/engine';
import { moveSound, play } from '../lib/sound';
import { store } from '../lib/storage';
import { navigate } from '../App';

export function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>,
  );
}

export function LessonList() {
  const done = new Set(store.lessonsDone());
  const total = ALL_LESSONS.length;
  return (
    <div className="page">
      <div className="page-title">
        <h2>🎓 Cours</h2>
        <div className="muted">{done.size} / {total} leçons terminées</div>
      </div>
      <div className="progress big"><div style={{ width: `${(done.size / total) * 100}%` }} /></div>
      {COURSES.map((c) => (
        <section key={c.id} className="course">
          <div className="course-head">
            <h3>{c.title}</h3>
            <span className={`level lvl-${c.level}`}>{c.level}</span>
          </div>
          <p className="muted">{c.description}</p>
          <div className="lesson-grid">
            {c.lessons.map((l) => (
              <button key={l.id} className={`lesson-card ${done.has(l.id) ? 'done' : ''}`} onClick={() => navigate(`/lessons/${l.id}`)}>
                <div className="lesson-icon">{l.icon}</div>
                <div>
                  <div className="lesson-title">{l.title} {done.has(l.id) && <span className="pos">✓</span>}</div>
                  <div className="small muted">{l.summary}</div>
                  <div className="tiny muted">{l.steps.length} étapes</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

type TaskState = 'idle' | 'wrong' | 'done';

export function LessonView({ id }: { id: string }) {
  const lesson = ALL_LESSONS.find((l) => l.id === id);
  const [stepIdx, setStepIdx] = useState(0);
  if (!lesson) return <div className="page"><p>Leçon introuvable.</p></div>;
  const step = lesson.steps[stepIdx];
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  const nextLesson = ALL_LESSONS[idx + 1];
  const last = stepIdx === lesson.steps.length - 1;
  return (
    <StepView
      key={`${id}-${stepIdx}`}
      step={step}
      header={<>
        <button className="btn ghost small" onClick={() => navigate('/lessons')}>← Cours</button>
        <span>{lesson.icon} {lesson.title}</span>
      </>}
      progress={(stepIdx + 1) / lesson.steps.length}
      stepLabel={`Étape ${stepIdx + 1} / ${lesson.steps.length}`}
      onPrev={stepIdx > 0 ? () => setStepIdx(stepIdx - 1) : undefined}
      onNext={() => {
        if (!last) setStepIdx(stepIdx + 1);
        else {
          store.markLesson(lesson.id);
          play('success');
          if (nextLesson) navigate(`/lessons/${nextLesson.id}`);
          else navigate('/lessons');
        }
      }}
      nextLabel={last ? (nextLesson ? 'Terminer · leçon suivante ▶' : 'Terminer ✓') : 'Suivant ▶'}
    />
  );
}

function StepView({ step, header, progress, stepLabel, onPrev, onNext, nextLabel }: {
  step: LessonStep; header: React.ReactNode; progress: number; stepLabel: string;
  onPrev?: () => void; onNext: () => void; nextLabel: string;
}) {
  const startFen = step.fen ?? new Chess().fen();
  const [fen, setFen] = useState(startFen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [k, setK] = useState(0); // index in task.moves
  const [state, setState] = useState<TaskState>('idle');
  const [hint, setHint] = useState(false);
  const [practiceMoves, setPracticeMoves] = useState(0);
  const [practiceMsg, setPracticeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; getEngine('bot').stop(); }, []);

  const solverColor = useMemo(() => new Chess(startFen).turn(), [startFen]);
  const orientation = step.orientation ?? (solverColor === 'w' ? 'white' : 'black');
  const interactive = !!(step.task || step.practice);
  const complete = !interactive || state === 'done';

  const reset = () => {
    setFen(startFen); setLast(null); setK(0); setState('idle'); setHint(false); setPracticeMoves(0); setPracticeMsg(null);
  };

  const onMove = async (uci: string) => {
    const c = new Chess(fen);
    const m = uciToMove(c, uci);
    if (!m) return;
    if (step.task) {
      const t = step.task;
      const expected = t.moves[k];
      const ok = uci === expected || (k === 0 && t.accept?.includes(uci)) || (t.mate && c.isCheckmate());
      if (!ok) {
        play('error');
        setState('wrong');
        setFen(c.fen()); setLast([m.from, m.to]);
        setTimeout(() => { if (!alive.current) return; setFen(fen); setLast(null); setState('idle'); }, 900);
        return;
      }
      moveSound(m);
      setFen(c.fen()); setLast([m.from, m.to]); setHint(false);
      // if user played an accepted alternative, finish here
      const deviated = uci !== expected;
      const nk = k + 1;
      if (deviated || nk >= t.moves.length || c.isGameOver()) { setState('done'); play('success'); return; }
      const reply = t.moves[nk];
      setBusy(true);
      setTimeout(() => {
        if (!alive.current) return;
        const rm = uciToMove(c, reply);
        if (rm) { moveSound(rm); setFen(c.fen()); setLast([rm.from, rm.to]); }
        setBusy(false);
        if (nk + 1 >= t.moves.length) { setState('done'); play('success'); } else setK(nk + 1);
      }, 550);
      return;
    }
    if (step.practice) {
      const p = step.practice;
      moveSound(m);
      setFen(c.fen()); setLast([m.from, m.to]);
      const n = practiceMoves + 1;
      setPracticeMoves(n);
      if (p.goal === 'promote' && m.promotion) { setState('done'); play('success'); return; }
      if (c.isCheckmate()) { setState('done'); play('success'); return; }
      if (c.isGameOver()) { setPracticeMsg(c.isStalemate() ? 'Pat ! La partie est nulle. Laissez toujours une case libre au roi adverse.' : 'La partie est nulle.'); play('error'); return; }
      if (n >= p.maxMoves) { setPracticeMsg(`Limite de ${p.maxMoves} coups atteinte. Réessayez !`); play('error'); return; }
      setBusy(true);
      const eng = getEngine('bot');
      eng.setOption('UCI_LimitStrength', false);
      const a = await eng.analyse(c.fen(), { movetime: 300 });
      if (!alive.current) return;
      setBusy(false);
      if (!a?.best) return;
      const rm = uciToMove(c, a.best);
      if (!rm) return;
      moveSound(rm);
      setFen(c.fen()); setLast([rm.from, rm.to]);
      if (p.goal === 'promote' && !c.board().flat().some((x) => x && x.color === solverColor && x.type === 'p')) {
        setPracticeMsg('Le pion a été capturé. Réessayez !'); play('error');
      } else if (c.isGameOver()) {
        setPracticeMsg('La partie est nulle. Réessayez !'); play('error');
      }
    }
  };

  const shapes: DrawShape[] = [];
  if (fen === startFen) {
    for (const [a, b] of step.arrows ?? []) shapes.push({ orig: a as never, dest: b as never, brush: 'green' });
    for (const c of step.circles ?? []) shapes.push({ orig: c as never, brush: 'green' });
  }
  if (hint && step.task && state === 'idle') {
    const u = step.task.moves[k];
    shapes.push({ orig: u.slice(0, 2) as never, brush: 'yellow' });
  }
  const turnColor = new Chess(fen).turn();
  const canMove = interactive && state !== 'done' && !busy && !practiceMsg && turnColor === solverColor && state !== 'wrong';

  return (
    <div className="page game-layout">
      <div className="board-col">
        <div className="board-row">
          <Board fen={fen} orientation={orientation} movable={canMove ? (solverColor === 'w' ? 'white' : 'black') : null} lastMove={last} onMove={onMove} shapes={shapes} />
        </div>
      </div>
      <div className="side-col">
        <div className="panel">
          <div className="panel-head">{header}</div>
          <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>
          <div className="small muted pad-x">{stepLabel}</div>
          <div className="coach-area">
            <CoachBubble tone={state === 'done' ? 'good' : state === 'wrong' ? 'bad' : 'neutral'}>
              <p>{rich(step.text)}</p>
              {state === 'wrong' && <p className="neg"><b>Pas tout à fait… essayez encore !</b></p>}
              {state === 'done' && <p className="pos"><b>{rich(step.task?.success || step.practice?.success || 'Bravo !')}</b></p>}
              {step.practice && state !== 'done' && !practiceMsg && <p className="small muted">Coups joués : {practiceMoves} / {step.practice.maxMoves}</p>}
              {practiceMsg && <p className="neg"><b>{practiceMsg}</b></p>}
              {hint && step.task?.hint && state === 'idle' && <p className="small">💡 {step.task.hint}</p>}
            </CoachBubble>
          </div>
          <div className="actions">
            {onPrev && <button className="btn" onClick={onPrev}>◀ Précédent</button>}
            {interactive && state !== 'done' && step.task && <button className="btn" onClick={() => setHint(true)}>💡 Indice</button>}
            {interactive && <button className="btn" onClick={reset}>↺ Recommencer</button>}
            <button className="btn primary" onClick={onNext} disabled={!complete}>{nextLabel}</button>
            {interactive && !complete && <button className="btn ghost small" onClick={onNext}>Passer</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
