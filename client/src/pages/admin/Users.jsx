import { useEffect, useState } from 'react';
import { del, get, patch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Card, Spinner, ConfirmButton } from '../../components/ui';
import { fmtDateTime, fmtMin } from '../../lib/format';

const Badge = ({ cls, children }) => <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${cls}`}>{children}</span>;

export default function Users() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const load = async () => setUsers(await get(`/admin/users?q=${encodeURIComponent(q)}`));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);
  return (
    <>
      <PageHead eyebrow="Admin" title="Users" sub={users ? `${users.length} accounts shown` : ' '} />
      <input id="user-q" type="search" aria-label="Search users" className="input mb-4 max-w-sm !bg-surface" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="!p-0">
        {!users ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead><tr className="text-left">{['User', 'Status', 'Activity', 'Last sign-in', ''].map((h) => <th key={h} className="eyebrow border-b border-line px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-b border-line align-middle last:border-0">
                  <td className="px-4 py-3"><b className="block">{u.name}</b><span className="break-all text-muted">{u.email}</span></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                    {u.role === 'admin' && <Badge cls="bg-ink text-bg">Admin</Badge>}
                    {u.isActive ? <Badge cls="bg-ok-soft text-ok">Active</Badge> : <Badge cls="bg-danger-soft text-danger">Disabled</Badge>}
                    {u.isDemo && <Badge cls="bg-surface2 text-muted">Demo</Badge>}</div></td>
                  <td className="px-4 py-3 text-muted num">{u.tasks} tasks · {fmtMin(u.minutes)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3">{u.role !== 'admin' && (
                    <div className="flex justify-end gap-1.5">
                      <button className="btn btn-sm" onClick={async () => { await patch(`/admin/users/${u.id}`, { isActive: !u.isActive }); toast(u.isActive ? 'Account disabled' : 'Account enabled'); load(); }}>{u.isActive ? 'Disable' : 'Enable'}</button>
                      <ConfirmButton confirmText="Delete forever?" onConfirm={async () => { await del(`/admin/users/${u.id}`); toast('User deleted'); load(); }}>Delete</ConfirmButton>
                    </div>)}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
