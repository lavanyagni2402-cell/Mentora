import { useState } from 'react';
import { get, patch } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { useToast } from '../../context/ToastContext';
import { PageHead, Card, Empty, Spinner } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { CATEGORIES, Stars } from '../Feedback';

function Item({ f, onChange }) {
  const toast = useToast();
  const [reply, setReply] = useState(f.adminReply || '');
  return (
    <article className="border-t border-line py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <b>{CATEGORIES[f.category] || f.category}</b><Stars value={f.rating} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${f.status === 'resolved' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{f.status === 'resolved' ? 'Answered' : 'New'}</span>
        <span className="ml-auto text-xs text-muted">{f.user ? f.user.name : 'Deleted user'} · {fmtDateTime(f.createdAt)}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words">{f.message}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input id={`reply-${f.id}`} aria-label="Reply to student" className="input flex-1" placeholder="Write a reply the student will see" value={reply} onChange={(e) => setReply(e.target.value)} />
        <button className="btn-primary btn-sm" disabled={!reply.trim()} onClick={async () => { await patch(`/admin/feedback/${f.id}`, { adminReply: reply }); toast('Reply sent'); onChange(); }}>Send reply</button>
      </div>
    </article>
  );
}

export default function FeedbackInbox() {
  const { data, loading, reload } = useLoad(() => get('/admin/feedback'));
  return (
    <>
      <PageHead eyebrow="Admin" title="Feedback inbox" sub="Replies appear on the student's Feedback page." />
      <Card>{loading ? <Spinner /> : !data.length ? <Empty><p>No feedback yet.</p></Empty> : data.map((f) => <Item key={f.id} f={f} onChange={reload} />)}</Card>
    </>
  );
}
