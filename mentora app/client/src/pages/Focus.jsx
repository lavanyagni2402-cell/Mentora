import { useEffect } from 'react';
import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import { PageHead, Card, Empty, Segmented, SubjectChip } from '../components/ui';
import Icon from '../components/Icon';
import { fmtMin, fmtDateTime } from '../lib/format';

const RING = 2 * Math.PI * 88;

export default function Focus() {
  const { subjects, subject } = useData();
  const timer = useTimer();
  const { data: tasks } = useLoad(() => get('/tasks'));
  const { data: today, reload } = useLoad(() => get('/sessions/today'));
  useEffect(() => timer.onSaved(reload), [timer, reload]);
  useEffect(() => { if (!timer.subjectId && subjects[0]) timer.choose(subjects[0].id); }, [subjects, timer]);

  const locked = timer.state !== 'idle';
  const total = timer.durationMin * 60000;
  const left = timer.remainingMs;
  const pending = (tasks || []).filter((t) => t.status !== 'done' && t.subjectId === timer.subjectId);

  return (
    <>
      <PageHead title="Focus session" sub="Pick what you're studying and start the timer. The time is saved to your progress." />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card className="flex flex-col items-center gap-5 !py-7">
          <Segmented label="Session length" value={timer.preset} onChange={(v) => !locked && timer.setPreset(v)} options={[[25, '25 min'], [50, '50 min'], [5, 'Break 5']]} />
          <div className="relative aspect-square w-[min(280px,72vw)]">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="100" cy="100" r="88" fill="none" strokeWidth="12" stroke="rgb(var(--surface2))" />
              <circle cx="100" cy="100" r="88" fill="none" strokeWidth="12" strokeLinecap="round" stroke={timer.preset === 5 ? 'rgb(var(--ok))' : 'rgb(var(--accent))'}
                strokeDasharray={RING} strokeDashoffset={RING * Math.min(1, (total - left) / total)} style={{ transition: 'stroke-dashoffset .4s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <div className="font-mono text-[clamp(2.6rem,9vw,3.6rem)] font-bold leading-none num" role="timer">{String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')}</div>
              <div className="eyebrow">{{ idle: 'Ready', running: 'Focusing', paused: 'Paused' }[timer.state]}</div>
            </div>
          </div>
          {subjects.length ? (
            <div className="grid w-full max-w-[440px] gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5"><span className="label">Subject</span>
                <select id="f-subject" className="input" disabled={locked} value={timer.subjectId} onChange={(e) => timer.choose(e.target.value, '')}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="flex flex-col gap-1.5"><span className="label">Task (optional)</span>
                <select id="f-task" className="input" disabled={locked} value={timer.taskId} onChange={(e) => timer.choose(timer.subjectId, e.target.value)}>
                  <option value="">General study</option>{pending.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            </div>
          ) : <p className="text-muted">Add a subject first.</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {timer.state === 'running'
              ? <button className="btn min-w-[120px]" onClick={timer.pause}><Icon name="pause" size={16} />Pause</button>
              : <button className="btn-primary min-w-[120px]" disabled={!timer.subjectId} onClick={timer.start}><Icon name="play" size={16} />{timer.state === 'paused' ? 'Resume' : 'Start'}</button>}
            <button className="btn min-w-[120px]" disabled={!locked} onClick={timer.finish}><Icon name="check" size={16} />End &amp; save</button>
            <button className="btn-ghost" disabled={!locked} onClick={timer.discard}>Discard</button>
          </div>
        </Card>
        <Card title="Today's sessions" action={<span className="font-bold num">{fmtMin((today || []).reduce((a, s) => a + s.durationMinutes, 0))}</span>}>
          {today?.length ? today.map((s) => { const tk = (tasks || []).find((t) => t.id === s.taskId); return (
            <div key={s.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <div className="min-w-0 flex-1"><SubjectChip subject={subject(s.subjectId)} /><div className="break-words text-sm text-muted">{tk ? tk.title : 'General study'} · {fmtDateTime(s.startedAt)}</div></div>
              <span className="font-mono text-sm font-bold">{fmtMin(s.durationMinutes)}</span>
            </div>); }) : <Empty><p>No sessions yet today.</p></Empty>}
        </Card>
      </div>
    </>
  );
}
