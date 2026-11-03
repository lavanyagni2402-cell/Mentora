import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { navigate } from '../lib/router';
import { useTimer } from '../context/TimerContext';
import { Card, Empty, Spinner, SubjectChip } from './ui';
import Icon from './Icon';

// AI "Study next": pending tasks ranked by the ML deadline-risk model, with reasons
export default function StudyNext({ reloadKey }) {
  const { data, loading, reload } = useLoad(() => get('/recommendations'), [reloadKey]);
  const timer = useTimer();
  const focus = (r) => { timer.choose(r.subjectId, r.taskId); navigate('/focus'); };
  const items = data?.items || [];
  const top = items[0];
  return (
    <Card title="Study next" action={<span className="chip-dot"><Icon name="sparkle" size={15} className="text-accent" />AI pick<button className="icon-btn !h-7 !w-7" aria-label="Refresh" onClick={reload}><Icon name="refresh" size={14} /></button></span>}>
      {loading ? <Spinner label="Thinking" /> : !top ? <Empty><p>Nothing pending. Add a task and Mentora will tell you what to study first.</p></Empty> : (
        <>
          <div className="flex flex-col gap-2.5 rounded-xl bg-accent-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <SubjectChip subject={{ name: top.subjectName, color: top.color }} />
              <span className="font-mono text-xs font-bold text-accent-strong">{Math.round(top.risk * 100)}% miss risk</span>
            </div>
            <div className="text-lg font-bold leading-snug">{top.title}</div>
            <div className="flex flex-wrap gap-1.5">{top.reasons.map((r) => <span key={r} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">{r}</span>)}</div>
            <div><button className="btn-primary" onClick={() => focus(top)}><Icon name="play" size={16} />Start focus session</button></div>
          </div>
          {items.slice(1, 4).map((r, i) => (
            <div key={r.taskId} className="flex items-center gap-3 border-t border-line py-2.5 first-of-type:border-t-0">
              <span className="w-5 font-mono text-sm font-bold text-muted">{i + 2}</span>
              <div className="min-w-0 flex-1"><div className="break-words font-semibold">{r.title}</div>
                <div className="flex flex-wrap gap-x-3"><SubjectChip subject={{ name: r.subjectName, color: r.color }} /><span className="text-[0.8rem] text-muted">{r.reasons.slice(0, 2).join(' · ')}</span></div></div>
              <span className="font-mono text-xs text-muted">{Math.round(r.risk * 100)}%</span>
              <button className="icon-btn hover:!text-accent" aria-label="Start a focus session" onClick={() => focus(r)}><Icon name="play" size={16} /></button>
            </div>
          ))}
          <p className="mt-3 text-[0.8rem] text-muted">Ranked by a machine-learning model that estimates each deadline's risk.{data.fallback ? ' The ML service is offline, so a simpler rule-based score is being used.' : ''}</p>
        </>
      )}
    </Card>
  );
}
