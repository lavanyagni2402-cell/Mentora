import { useState } from 'react';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useToast } from '../context/ToastContext';
import { PageHead, Card, Empty, Field, ErrorNote } from '../components/ui';
import Icon from '../components/Icon';
import { fmtDateTime } from '../lib/format';

export const CATEGORIES = { feature: 'Feature request', bug: 'Something is broken', design: 'Design', ai: 'AI suggestions', other: 'Other' };
export const Stars = ({ value, size = 14 }) => <span className="inline-flex text-accent" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} fill={i <= value ? 'currentColor' : 'none'} className={i <= value ? '' : 'text-line'} />)}</span>;

export default function Feedback() {
  const toast = useToast();
  const { data: mine, reload } = useLoad(() => get('/feedback'));
  const [f, setF] = useState({ category: 'feature', rating: 0, message: '' });
  const [err, setErr] = useState('');
  return (
    <>
      <PageHead title="Feedback" sub="Tell us what's working and what isn't. Replies from the team appear here." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Send feedback">
          <form className="flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault(); setErr('');
            if (!f.rating) return setErr('Choose a rating from 1 to 5 stars.');
            try { await post('/feedback', f); setF({ category: 'feature', rating: 0, message: '' }); toast('Thanks! Your feedback was sent.'); reload(); } catch (x) { setErr(x.message); }
          }}>
            <Field label="What's it about?"><select id="fb-cat" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <fieldset><legend className="label mb-1.5">Rating</legend>
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map((i) => (
                <button type="button" key={i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => setF({ ...f, rating: i })} className="rounded-md p-1 text-accent hover:bg-surface2">
                  <Icon name="star" size={26} fill={i <= f.rating ? 'currentColor' : 'none'} className={i <= f.rating ? '' : 'text-line'} /></button>))}</div></fieldset>
            <Field label="Your message"><textarea id="fb-msg" className="input" rows={5} required minLength={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
            <ErrorNote>{err}</ErrorNote>
            <div><button className="btn-primary">Send feedback</button></div>
          </form>
        </Card>
        <Card title="Your feedback">
          {!mine?.length ? <Empty><p>Nothing sent yet.</p></Empty> : mine.map((x) => (
            <div key={x.id} className="border-t border-line py-3 first:border-t-0">
              <div className="flex flex-wrap items-center gap-2"><b>{CATEGORIES[x.category]}</b><Stars value={x.rating} />
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${x.status === 'resolved' ? 'bg-ok-soft text-ok' : 'bg-surface2 text-muted'}`}>{x.status === 'resolved' ? 'Answered' : 'Received'}</span></div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{x.message}</p>
              <p className="mt-1 text-xs text-muted">{fmtDateTime(x.createdAt)}</p>
              {x.adminReply && <div className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-sm"><b className="text-accent-strong">Mentora team:</b> {x.adminReply}</div>}
            </div>))}
        </Card>
      </div>
    </>
  );
}
