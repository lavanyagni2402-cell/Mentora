import { useState } from 'react';
import { dueInfo, addDays, todayISO, fmtMin } from '../lib/format';
import { useData } from '../context/DataContext';
import { Priority, SubjectChip, Field, ErrorNote, Modal } from './ui';
import Icon from './Icon';

export function TaskRow({ task, onToggle, onEdit, onDelete, onFocus }) {
  const { subject } = useData();
  const d = dueInfo(task);
  const done = task.status === 'done';
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2.5 first:border-t-0 sm:flex-nowrap">
      <button onClick={() => onToggle(task)} aria-label={done ? 'Mark as not done' : 'Mark as done'}
        className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] border-2 ${done ? 'border-ok bg-ok text-surface' : 'border-line text-transparent hover:border-accent'}`}>
        <Icon name="check" size={14} />
      </button>
      <div className="min-w-0 flex-1 basis-[calc(100%-40px)] sm:basis-auto">
        <div className={`break-words font-semibold ${done ? 'text-muted line-through' : ''}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0.5">
          <SubjectChip subject={subject(task.subjectId)} />
          <span className={`text-[0.8rem] text-muted ${d.tone}`}>{d.text}</span>
          {task.estimatedMinutes ? <span className="text-[0.8rem] text-muted">~{fmtMin(task.estimatedMinutes)}</span> : null}
        </div>
      </div>
      <span className="ml-[34px] sm:ml-0"><Priority value={task.priority} /></span>
      <div className="ml-auto flex gap-0.5">
        {!done && onFocus && <button className="icon-btn hover:!text-accent" aria-label="Start a focus session" onClick={() => onFocus(task)}><Icon name="play" size={16} /></button>}
        {onEdit && <button className="icon-btn" aria-label="Edit task" onClick={() => onEdit(task)}><Icon name="edit" size={16} /></button>}
        {onDelete && <button className="icon-btn hover:!text-danger" aria-label="Delete task" onClick={() => onDelete(task)}><Icon name="trash" size={16} /></button>}
      </div>
    </li>
  );
}

export function TaskForm({ task, onSave, onClose }) {
  const { subjects } = useData();
  const [f, setF] = useState(task ? { ...task, dueDate: task.dueDate || '' } : { title: '', subjectId: subjects[0]?.id, dueDate: addDays(todayISO(), 3), priority: 'medium', estimatedMinutes: 60 });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form className="flex flex-col gap-3.5" onSubmit={async (e) => {
        e.preventDefault(); setErr('');
        try { await onSave({ title: f.title, subjectId: f.subjectId, dueDate: f.dueDate || null, priority: f.priority, estimatedMinutes: Number(f.estimatedMinutes) }); onClose(); }
        catch (x) { setErr(x.message); }
      }}>
        <Field label="Title"><input id="t-title" className="input" required maxLength={140} value={f.title} onChange={set('title')} placeholder="e.g. Lab 4: SLR parser" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject"><select id="t-subject" className="input" value={f.subjectId} onChange={set('subjectId')}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Due date"><input id="t-due" className="input" type="date" value={f.dueDate} onChange={set('dueDate')} /></Field>
          <Field label="Priority"><select id="t-prio" className="input" value={f.priority} onChange={set('priority')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
          <Field label="Estimated effort (minutes)"><input id="t-est" className="input" type="number" min={5} max={1440} step={5} value={f.estimatedMinutes} onChange={set('estimatedMinutes')} /></Field>
        </div>
        <ErrorNote>{err}</ErrorNote>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">{task ? 'Save changes' : 'Add task'}</button></div>
      </form>
    </Modal>
  );
}
