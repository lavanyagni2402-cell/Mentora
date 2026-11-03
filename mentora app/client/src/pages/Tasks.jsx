import { useMemo, useState } from 'react';
import { del, get, patch, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { navigate } from '../lib/router';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import { useToast } from '../context/ToastContext';
import { PageHead, Card, Empty, Spinner, Segmented } from '../components/ui';
import { TaskRow, TaskForm } from '../components/TaskBits';
import Icon from '../components/Icon';
import { todayISO, addDays } from '../lib/format';

export default function Tasks() {
  const { subjects } = useData();
  const timer = useTimer();
  const toast = useToast();
  const [filter, setFilter] = useState('pending');
  const [subjectId, setSubjectId] = useState('all');
  const [modal, setModal] = useState(null);
  const { data: tasks, loading, reload } = useLoad(() => get('/tasks'));

  const list = useMemo(() => (tasks || [])
    .filter((t) => (filter === 'done' ? t.status === 'done' : t.status !== 'done'))
    .filter((t) => subjectId === 'all' || t.subjectId === subjectId)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')), [tasks, filter, subjectId]);

  const toggle = async (t) => { await patch(`/tasks/${t.id}`, { status: t.status === 'done' ? 'pending' : 'done' }); reload(); };
  const remove = async (t) => { await del(`/tasks/${t.id}`); toast('Task deleted'); reload(); };
  const row = (t) => <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setModal} onDelete={remove} onFocus={(x) => { timer.choose(x.subjectId, x.id); navigate('/focus'); }} />;

  let body;
  if (loading) body = <Spinner />;
  else if (!list.length) body = <Empty><p>{filter === 'done' ? 'No completed tasks yet.' : subjects.length ? 'No pending tasks.' : 'Add a subject first, then add tasks to it.'}</p></Empty>;
  else if (filter === 'pending') {
    const t = todayISO(), wk = addDays(t, 7);
    const groups = [['Overdue', (x) => x.dueDate && x.dueDate < t], ['Today', (x) => x.dueDate === t], ['Next 7 days', (x) => x.dueDate > t && x.dueDate <= wk], ['Later', (x) => x.dueDate > wk || !x.dueDate]];
    body = groups.map(([g, f]) => { const items = list.filter(f); return items.length ? <div key={g} className="mb-4 last:mb-0"><h3 className="mb-1">{g} <span className="font-normal text-muted num">{items.length}</span></h3><ul>{items.map(row)}</ul></div> : null; });
  } else body = <ul>{list.map(row)}</ul>;

  return (
    <>
      <PageHead title="Tasks"><button className="btn-primary" disabled={!subjects.length} onClick={() => setModal('new')}><Icon name="plus" size={16} />New task</button></PageHead>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Segmented label="Show" value={filter} onChange={setFilter} options={[['pending', 'Pending'], ['done', 'Done']]} />
        <select id="task-subject" aria-label="Filter by subject" className="input !w-auto !bg-surface !py-2" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="all">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <Card>{body}</Card>
      {modal && <TaskForm task={modal === 'new' ? null : modal} onClose={() => setModal(null)}
        onSave={async (b) => { modal === 'new' ? await post('/tasks', b) : await patch(`/tasks/${modal.id}`, b); toast(modal === 'new' ? 'Task added' : 'Task updated'); reload(); }} />}
    </>
  );
}
