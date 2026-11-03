import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { PageHead, Stat, Card, Spinner, Empty } from '../components/ui';
import Bars from '../components/Bars';
import { fmtMin, subColor } from '../lib/format';

export default function Progress() {
  const { data, loading } = useLoad(() => get('/progress'));
  if (loading || !data) return <><PageHead title="Progress" /><Spinner /></>;
  const t = data.totals;
  return (
    <>
      <PageHead title="Progress" sub="Calculated from the tasks you complete and the sessions you log." />
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tasks completed" value={`${t.tasksTotal ? Math.round((t.tasksDone / t.tasksTotal) * 100) : 0}%`} note={`${t.tasksDone} of ${t.tasksTotal} tasks`} />
        <Stat label="On-time rate" value={t.onTimeRate == null ? '—' : `${Math.round(t.onTimeRate * 100)}%`} note="finished by the due date" />
        <Stat label="Study streak" value={`${t.streak} ${t.streak === 1 ? 'day' : 'days'}`} note="in a row with a session" />
        <Stat label="Total study time" value={fmtMin(t.minutes)} note={`${t.sessions} sessions`} />
      </section>
      <Card title="Study time · last 30 days" className="mb-4"><Bars data={data.daily} labels="date" /></Card>
      <Card title="By subject">
        {!data.subjects.length ? <Empty><p>Add subjects to see a breakdown.</p></Empty> : (
          <div className="flex flex-col gap-3">
            {data.subjects.map((s) => { const pct = s.tasksTotal ? (s.tasksCompleted / s.tasksTotal) * 100 : 0; return (
              <div key={s.subjectId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 text-sm">
                <span className="truncate font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: subColor(s.color) }} />{s.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-surface2"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: subColor(s.color) }} /></div>
                <span className="text-muted num">{s.tasksCompleted}/{s.tasksTotal} · {fmtMin(s.studyHours * 60)}</span>
              </div>); })}
          </div>
        )}
      </Card>
    </>
  );
}
