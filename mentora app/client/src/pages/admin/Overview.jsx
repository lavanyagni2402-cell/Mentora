import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { PageHead, Stat, Spinner } from '../../components/ui';
import { fmtMin } from '../../lib/format';

export default function Overview() {
  const { data: s, loading } = useLoad(() => get('/admin/stats'));
  if (loading || !s) return <><PageHead title="Overview" /><Spinner /></>;
  return (
    <>
      <PageHead eyebrow="Admin" title="Platform overview" sub="Live numbers from the central database." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Students" value={s.students} note="registered accounts" />
        <Stat label="Active this week" value={s.active_week} note="logged a study session" />
        <Stat label="Study time logged" value={fmtMin(s.minutes)} note={`${s.sessions} sessions`} />
        <Stat label="Tasks" value={s.tasks} note={`${s.tasks ? Math.round((s.tasks_done / s.tasks) * 100) : 0}% completed`} />
        <Stat label="Feedback" value={s.feedback} note={`${s.feedback_open} waiting for a reply`} />
        <Stat label="Average rating" value={s.rating ? s.rating.toFixed(1) : '—'} note="out of 5 stars" />
      </section>
    </>
  );
}
