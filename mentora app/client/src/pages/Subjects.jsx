import { useState } from 'react';
import { del, get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { navigate } from '../lib/router';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import { useToast } from '../context/ToastContext';
import { PageHead, Card, Empty, Spinner, ConfirmButton } from '../components/ui';
import Icon from '../components/Icon';
import { fmtMin, subColor } from '../lib/format';
import SubjectForm from './SubjectForm';

export default function Subjects() {
  const { subjects, reloadSubjects } = useData();
  const { data: progress, loading, reload } = useLoad(() => get('/progress'));
  const timer = useTimer();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const p = (id) => progress?.subjects.find((x) => x.subjectId === id) || { tasksCompleted: 0, tasksTotal: 0, studyHours: 0 };
  const refresh = () => { reloadSubjects(); reload(); };
  return (
    <>
      <PageHead title="Subjects" sub={`${subjects.length} subjects · ${subjects.reduce((a, s) => a + s.credits, 0)} credits`}>
        <button className="btn-primary" onClick={() => setModal('new')}><Icon name="plus" size={16} />Add subject</button>
      </PageHead>
      {loading ? <Spinner /> : !subjects.length ? <Card><Empty action={<button className="btn-primary" onClick={() => setModal('new')}>Add your first subject</button>}><p>No subjects yet.</p></Empty></Card> : (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
          {subjects.map((s) => { const x = p(s.id); const pct = x.tasksTotal ? Math.round((x.tasksCompleted / x.tasksTotal) * 100) : 0; return (
            <article key={s.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-none place-items-center rounded-[10px] font-bold text-white" style={{ background: subColor(s.color) }}>{s.name[0]}</div>
                <div className="min-w-0 flex-1"><h3 className="break-words">{s.name}</h3><p className="text-sm text-muted">{s.credits} credits · difficulty {s.difficulty}/5</p></div>
                <button className="icon-btn" aria-label="Edit subject" onClick={() => setModal(s)}><Icon name="edit" size={16} /></button>
              </div>
              <div><div className="mb-1.5 flex justify-between text-sm text-muted"><span>{x.tasksCompleted}/{x.tasksTotal} tasks done</span><span className="num">{pct}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface2"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: subColor(s.color) }} /></div></div>
              <p className="text-sm text-muted">{fmtMin(x.studyHours * 60)} studied in total</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => { timer.choose(s.id); navigate('/focus'); }}><Icon name="play" size={14} />Study</button>
                <ConfirmButton className="btn-ghost btn-sm ml-auto text-danger" confirmText="Delete with all its tasks?" onConfirm={async () => { await del(`/subjects/${s.id}`); toast(`Deleted ${s.name}`); refresh(); }}>Delete</ConfirmButton>
              </div>
            </article>); })}
        </div>
      )}
      {modal && <SubjectForm subject={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { refresh(); toast(modal === 'new' ? 'Subject added' : 'Subject updated'); }} />}
    </>
  );
}
