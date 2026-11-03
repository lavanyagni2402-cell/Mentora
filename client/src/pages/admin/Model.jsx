import { useState } from 'react';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { useToast } from '../../context/ToastContext';
import { PageHead, Card, Stat, Spinner, Empty } from '../../components/ui';
import Icon from '../../components/Icon';
import { fmtMin } from '../../lib/format';

const FEATURE = {
  days_left: 'Days until deadline', hours_per_day_needed: 'Hours/day needed', log_est_minutes: 'Estimated effort', priority_level: 'Priority',
  difficulty: 'Subject difficulty', log_subject_minutes: 'Study time on subject (7 days)', user_ontime_rate: 'On-time history', pending_count: 'Pending tasks',
};
const ALG = { logistic_regression: 'Logistic regression', random_forest: 'Random forest', gradient_boosting: 'Gradient boosting' };
const pct = (v) => `${(v * 100).toFixed(1)}%`;

export default function Model() {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => get('/admin/ml'));
  const seg = useLoad(() => get('/admin/ml/segments'));
  const [busy, setBusy] = useState(false);
  const retrain = async () => {
    setBusy(true);
    try { const r = await post('/admin/ml/retrain'); toast(`Retrained on ${r.n_samples} examples. ROC-AUC ${r.metrics.roc_auc}`); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  if (loading || !data) return <><PageHead title="AI model" /><Spinner /></>;
  if (!data.online) return <><PageHead eyebrow="Admin" title="AI model" /><Card><Empty><p>The ML service is offline. Students still get rule-based suggestions.</p></Empty></Card></>;
  const m = data.model;
  const coefs = Object.entries(m.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxC = Math.max(...coefs.map(([, v]) => Math.abs(v)));
  return (
    <>
      <PageHead eyebrow="Admin" title="AI model" sub="The deadline-risk model behind Study next.">
        <button className="btn-primary" disabled={busy} onClick={retrain}><Icon name="refresh" size={16} />{busy ? 'Retraining…' : 'Retrain on latest data'}</button>
      </PageHead>
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="ROC-AUC" value={m.metrics.roc_auc.toFixed(3)} note="5-fold cross-validation" />
        <Stat label="Accuracy" value={pct(m.metrics.accuracy)} note={`F1 ${m.metrics.f1.toFixed(3)}`} />
        <Stat label="Training examples" value={m.n_samples.toLocaleString('en-IN')} note={`${m.n_real} real outcomes from the database`} />
      </section>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="What drives deadline risk">
          <p className="mb-3 text-sm text-muted">Logistic-regression weights. Orange raises the risk of missing a deadline; teal lowers it.</p>
          <ul className="flex flex-col gap-2.5">{coefs.map(([k, v]) => (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_48px] items-center gap-3 text-sm">
              <span className="truncate">{FEATURE[k] || k}</span>
              <div className="relative h-2.5 rounded-full bg-surface2"><span className="absolute top-0 h-full rounded-full" style={{ width: `${(Math.abs(v) / maxC) * 50}%`, left: v >= 0 ? '50%' : `${50 - (Math.abs(v) / maxC) * 50}%`, background: v >= 0 ? 'rgb(var(--accent))' : 'var(--sub-2)' }} /></div>
              <span className="text-right font-mono text-xs num">{v > 0 ? '+' : ''}{v.toFixed(2)}</span>
            </li>))}</ul>
        </Card>
        <Card title="Algorithm comparison">
          <div className="overflow-x-auto"><table className="w-full min-w-[380px] text-sm">
            <thead><tr className="text-left">{['Algorithm', 'ROC-AUC', 'Accuracy', 'F1'].map((h) => <th key={h} className="eyebrow border-b border-line px-2 py-2">{h}</th>)}</tr></thead>
            <tbody>{Object.entries(m.comparison).map(([k, v]) => (
              <tr key={k} className={`border-b border-line last:border-0 ${k === 'logistic_regression' ? 'font-semibold' : ''}`}><td className="px-2 py-2.5">{ALG[k]}{k === 'logistic_regression' && ' (in use)'}</td>
                <td className="px-2 py-2.5 num">{v.roc_auc.toFixed(3)}</td><td className="px-2 py-2.5 num">{pct(v.accuracy)}</td><td className="px-2 py-2.5 num">{v.f1.toFixed(3)}</td></tr>))}</tbody>
          </table></div>
          <p className="mt-3 text-sm text-muted">Logistic regression is used because each prediction can be explained to the student.</p>
        </Card>
      </div>
      <Card title="Learner segments (K-Means)">
        {seg.loading ? <Spinner /> : !seg.data?.clusters?.length ? <Empty><p>{seg.data?.message || seg.error || 'Not enough data yet.'}</p></Empty> : (
          <div className="grid gap-3 md:grid-cols-3">{seg.data.clusters.map((c) => (
            <div key={c.id} className="rounded-xl border border-line p-4">
              <div className="flex items-baseline justify-between"><h3>{c.name}</h3><span className="text-2xl font-bold num">{c.size}</span></div>
              <p className="mt-2 text-sm text-muted">{fmtMin(c.centroid.weekly_minutes)} a week · {c.centroid.sessions_per_week.toFixed(1)} sessions · {Math.round(c.centroid.ontime_rate * 100)}% on time</p>
              <p className="mt-2 text-sm">{c.advice}</p>
            </div>))}</div>
        )}
      </Card>
    </>
  );
}
