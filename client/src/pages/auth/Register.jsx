import { useState } from 'react';
import { post } from '../../lib/api';
import { navigate } from '../../lib/router';
import { useAuth } from '../../context/AuthContext';
import { ErrorNote } from '../../components/ui';
import AuthShell from './AuthShell';

export default function Register() {
  const { setUser } = useAuth();
  const [f, setF] = useState({ name: '', email: '', password: '', semester: '5' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await post('/auth/register', { ...f, semester: Number(f.semester) }); navigate('/'); setUser(r.user); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Create your account" sub="Free for students. Takes under a minute.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="label">Full name</span><input id="name" className="input" required minLength={2} value={f.name} onChange={set('name')} /></label>
        <label className="flex flex-col gap-1.5"><span className="label">Email</span><input id="reg-email" className="input" type="email" required value={f.email} onChange={set('email')} /></label>
        <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
          <label className="flex flex-col gap-1.5"><span className="label">Password</span><input id="reg-password" className="input" type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} /></label>
          <label className="flex flex-col gap-1.5"><span className="label">Semester</span><select id="reg-sem" className="input" value={f.semester} onChange={set('semester')}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></label>
        </div>
        <p className="-mt-2 text-sm text-muted">At least 8 characters, with a letter and a number.</p>
        <ErrorNote>{err}</ErrorNote>
        <button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-center text-muted">Already have an account? <a href="#/" className="font-semibold text-accent-strong">Sign in</a></p>
    </AuthShell>
  );
}
