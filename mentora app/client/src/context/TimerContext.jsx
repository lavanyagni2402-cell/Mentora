import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { patch, post } from '../lib/api';
import { useToast } from './ToastContext';

// The focus timer lives above the router so it keeps running while you switch pages.
const TimerCtx = createContext(null);

export function TimerProvider({ children }) {
  const toast = useToast();
  const [t, setT] = useState({ state: 'idle', preset: 25, durationMin: 25, elapsedMs: 0, startedAt: 0, subjectId: '', taskId: '' });
  const [, setTick] = useState(0);
  const ref = useRef(t);
  ref.current = t;
  const listeners = useRef(new Set());

  const elapsed = () => ref.current.elapsedMs + (ref.current.state === 'running' ? Date.now() - ref.current.startedAt : 0);
  const set = (patchObj) => setT((x) => ({ ...x, ...patchObj }));

  const finish = useCallback(async (auto = false) => {
    const cur = ref.current;
    const mins = Math.round(elapsed() / 60000);
    setT((x) => ({ ...x, state: 'idle', elapsedMs: 0, startedAt: 0 }));
    if (auto) beep();
    if (cur.preset === 5) { toast("Break's over. Ready for the next session?"); return; }
    if (mins < 1) { toast("Sessions under a minute aren't saved."); return; }
    try {
      await post('/sessions', { subjectId: cur.subjectId, taskId: cur.taskId || null, durationMinutes: mins });
      listeners.current.forEach((fn) => fn());
      toast(`Saved ${mins} min of study.`, cur.taskId ? {
        label: 'Mark task done',
        fn: async () => { await patch(`/tasks/${cur.taskId}`, { status: 'done' }); setT((x) => ({ ...x, taskId: '' })); listeners.current.forEach((fn) => fn()); },
      } : null);
    } catch (e) { toast(e.message); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (ref.current.state !== 'running') return;
      if (elapsed() >= ref.current.durationMin * 60000) finish(true); else setTick((n) => n + 1);
    }, 500);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);

  const api = {
    ...t, elapsedMs: elapsed(),
    remainingMs: Math.max(0, t.durationMin * 60000 - elapsed()),
    start: () => set({ state: 'running', startedAt: Date.now() }),
    pause: () => set({ state: 'paused', elapsedMs: elapsed(), startedAt: 0 }),
    discard: () => set({ state: 'idle', elapsedMs: 0, startedAt: 0 }),
    finish: () => finish(false),
    setPreset: (m) => set({ preset: m, durationMin: m === 'custom' ? 40 : m }),
    setDuration: (m) => set({ durationMin: m }),
    choose: (subjectId, taskId = '') => { if (ref.current.state === 'idle') set({ subjectId, taskId }); },
    onSaved: (fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); },
  };
  return <TimerCtx.Provider value={api}>{children}</TimerCtx.Provider>;
}
export const useTimer = () => useContext(TimerCtx);

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((s) => {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = 880; g.gain.setValueAtTime(0.15, a.currentTime + s); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + s + 0.2);
      o.connect(g).connect(a.destination); o.start(a.currentTime + s); o.stop(a.currentTime + s + 0.2);
    });
  } catch { /* audio not available */ }
}
