import { useEffect, useState } from 'react';
import { get, patch, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { navigate } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import { useToast } from '../context/ToastContext';
import { PageHead, Stat, Card, Empty, Spinner } from '../components/ui';
import { TaskRow, TaskForm } from '../components/TaskBits';
import Bars from '../components/Bars';
import StudyNext from '../components/StudyNext';
import Icon from '../components/Icon';
import SubjectForm from './SubjectForm';
import { fmtMin, greeting, fmtDate, todayISO } from '../lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const { subjects, loaded, reloadSubjects } = useData();
  const timer = useTimer();
  const toast = useToast();
  const [k, setK] = useState(0);
  const [modal, setModal] = useState(null);
  const { data, loading } = useLoad(() => get('/dashboard'), [k]);
  useEffect(() => timer.onSaved(() => setK((x) => x + 1)), [timer]);
  const refresh = () => setK((x) => x + 1);

  const head = (
    <PageHead eyebrow={`${fmtDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })}${user.semester ? ` · Semester ${user.semester}` : ''}`} title={`${greeting()}, ${user.name.split(' ')[0]}`}>
      <button className="btn" onClick={() => setModal('task')} disabled={!subjects.length}><Icon name="plus" size={16} />New task</button>
      <a className="btn-primary" href="#/focus"><Icon name="timer" size={16} />Focus session</a>
    </PageHead>
  );
  if (!loaded || loading) return <>{head}<Spinner /></>;
  if (!subjects.length) return (
    <>{head}<Card><Empty action={<button className="btn-primary" onClick={() => setModal('subject')}><Icon name="plus" size={16} />Add your first subject</button>}>
      <h2 className="text-xl text-ink">Set up your semester</h2><p className="max-w-[46ch]">Add the subjects you're taking. Tasks, study sessions and progress are all organised by subject.</p></Empty></Card>
      {modal === 'subject' && <SubjectForm onClose={() => setModal(null)} onSaved={() => { reloadSubjects(); refresh(); }} />}</>
  );
  const s = data.stats;
  return (
    <>
      {head}
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Due today" value={s.due_today} note={`${s.pending} pending in total`} />
        <Stat label="Overdue" value={s.overdue} tone={s.overdue ? 'alert' : ''} note={s.overdue ? 'Catch up on these first' : "You're on track"} />
        <Stat label="Done this week" value={s.done_week} note="tasks completed" />
        <Stat label="Studied this week" value={fmtMin(s.minutesThisWeek)} note="in focus sessions" />
      </section>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <StudyNext reloadKey={k} />
        <Card title="This week" action={<a className="btn-ghost btn-sm" href="#/progress">See progress</a>}><Bars data={data.week} /></Card>
      </div>
      <Card title="Coming up · next 7 days" action={<a className="btn-ghost btn-sm" href="#/tasks">All tasks</a>}>
        {data.upcoming.length ? <ul>{data.upcoming.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={async (x) => { await patch(`/tasks/${x.id}`, { status: 'done' }); toast(`Done: ${x.title}`); refresh(); }}
            onFocus={(x) => { timer.choose(x.subjectId, x.id); navigate('/focus'); }} />))}</ul>
          : <Empty><p>No deadlines in the next 7 days.</p></Empty>}
      </Card>
      {modal === 'task' && <TaskForm onClose={() => setModal(null)} onSave={async (b) => { await post('/tasks', b); toast('Task added'); refresh(); }} />}
    </>
  );
}
