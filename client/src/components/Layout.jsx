import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { navigate } from '../lib/router';
import Icon from './Icon';

const STUDENT_NAV = [['/', 'Dashboard', 'dashboard'], ['/tasks', 'Tasks', 'tasks'], ['/subjects', 'Subjects', 'book'], ['/focus', 'Focus', 'timer'], ['/progress', 'Progress', 'chart'], ['/feedback', 'Feedback', 'message']];
const ADMIN_NAV = [['/admin', 'Overview', 'dashboard'], ['/admin/users', 'Users', 'users'], ['/admin/feedback', 'Feedback', 'inbox'], ['/admin/model', 'AI model', 'brain']];

export const Logo = ({ inverted }) => (
  <div className="flex items-center gap-2.5">
    <div className={`grid h-9 w-9 place-items-center rounded-[10px] text-lg font-bold ${inverted ? 'bg-on-accent text-accent' : 'bg-accent text-on-accent'}`}>M</div>
    <b className="text-xl tracking-tight">Mentora</b>
  </div>
);

function TimerChip() {
  const timer = useTimer();
  if (timer.state === 'idle') return null;
  const mm = Math.floor(timer.remainingMs / 60000), ss = Math.floor(timer.remainingMs / 1000) % 60;
  return (
    <a href="#/focus" className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-accent px-3 py-2.5 font-semibold text-accent-strong">
      <Icon name="timer" /><span className="font-mono num">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span><span className="text-sm">{timer.state === 'paused' ? 'paused' : 'left'}</span>
    </a>
  );
}

export default function Layout({ admin = false, path, children }) {
  const { user, logout } = useAuth();
  const items = admin ? ADMIN_NAV : STUDENT_NAV;
  const signOut = async () => { await logout(); navigate('/'); };
  const linkCls = (to) => `flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-semibold ${path === to ? 'bg-accent-soft text-accent-strong' : 'text-muted hover:bg-surface2 hover:text-ink'}`;

  return (
    <div className="min-h-full md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-5 border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="px-2"><Logo /></div>
        {admin && <span className="mx-2 -mt-2 w-fit rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-bg">Admin</span>}
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {items.map(([to, label, icon]) => <a key={to} href={`#${to}`} className={linkCls(to)}><Icon name={icon} />{label}</a>)}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          {!admin && <TimerChip />}
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line p-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ink font-bold text-bg">{user.name[0]?.toUpperCase()}</span>
            <span className="min-w-0 flex-1"><b className="block truncate">{user.name}</b><small className="block truncate text-muted">{user.email}</small></span>
            <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={signOut}><Icon name="logout" /></button>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full min-w-0 max-w-[1180px] px-4 pb-28 pt-4 md:px-10 md:pb-12 md:pt-8">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <Logo />
          <button className="icon-btn" aria-label="Sign out" onClick={signOut}><Icon name="logout" /></button>
        </div>
        {user.isDemo && <div className="mb-5 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent-strong"><b>Demo account.</b> This student and their history are sample data.</div>}
        {children}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface px-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 md:hidden">
        {items.map(([to, label, icon]) => (
          <a key={to} href={`#${to}`} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.68rem] font-semibold ${path === to ? 'bg-accent-soft text-accent-strong' : 'text-muted'}`}>
            <Icon name={icon} size={19} />{label}
          </a>
        ))}
      </nav>
    </div>
  );
}
