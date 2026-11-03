import { useState } from 'react';
import { post } from '../../lib/api';
import { navigate } from '../../lib/router';
import { useAuth } from '../../context/AuthContext';
import { ErrorNote } from '../../components/ui';
import AuthShell from './AuthShell';

export default function Login() {
  const { setUser } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await post('/auth/login', f); navigate(r.user.role === 'admin' ? '/admin' : '/'); setUser(r.user); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Welcome back" sub="Sign in to your Mentora workspace.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="label">Email</span>
          <input id="email" className="input" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@muj.manipal.edu" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">Password</span>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <ErrorNote>{err}</ErrorNote>
        <button className="btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="text-center text-muted">New to Mentora? <a href="#/register" className="font-semibold text-accent-strong">Create an account</a></p>
    </AuthShell>
  );
}
