import { useState } from 'react';
import { post, patch } from '../lib/api';
import { Modal, Field, ErrorNote } from '../components/ui';
import { useData } from '../context/DataContext';

export default function SubjectForm({ subject, onClose, onSaved }) {
  const { subjects } = useData();
  const [f, setF] = useState(subject || { name: '', credits: 3, difficulty: 3, color: subjects.length % 7 });
  const [err, setErr] = useState('');
  return (
    <Modal title={subject ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <form className="flex flex-col gap-3.5" onSubmit={async (e) => {
        e.preventDefault(); setErr('');
        try {
          const body = { name: f.name, credits: Number(f.credits), difficulty: Number(f.difficulty), color: Number(f.color) };
          subject ? await patch(`/subjects/${subject.id}`, body) : await post('/subjects', body);
          onSaved(); onClose();
        } catch (x) { setErr(x.message); }
      }}>
        <Field label="Subject name"><input id="s-name" className="input" required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Operating Systems" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Credits"><input id="s-credits" className="input" type="number" min={0} max={10} value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></Field>
          <Field label="How hard is it for you? (1–5)"><select id="s-diff" className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
            {[[1, '1 · Easy'], [2, '2'], [3, '3 · Medium'], [4, '4'], [5, '5 · Very hard']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <fieldset><legend className="label mb-1.5">Colour</legend>
          <div className="flex flex-wrap gap-2">{Array.from({ length: 7 }, (_, i) => (
            <button type="button" key={i} aria-label={`Colour ${i + 1}`} aria-pressed={Number(f.color) === i} onClick={() => setF({ ...f, color: i })}
              className={`h-8 w-8 rounded-full border-[3px] border-surface ${Number(f.color) === i ? 'ring-2 ring-ink' : 'ring-1 ring-line'}`} style={{ background: `var(--sub-${i})` }} />))}</div>
        </fieldset>
        <ErrorNote>{err}</ErrorNote>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">{subject ? 'Save changes' : 'Add subject'}</button></div>
      </form>
    </Modal>
  );
}
