import { useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { TimerProvider } from './context/TimerContext';
import { usePath, navigate } from './lib/router';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Subjects from './pages/Subjects';
import Focus from './pages/Focus';
import Progress from './pages/Progress';
import Feedback from './pages/Feedback';
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminFeedback from './pages/admin/FeedbackInbox';
import AdminModel from './pages/admin/Model';

const STUDENT = { '/': Dashboard, '/tasks': Tasks, '/subjects': Subjects, '/focus': Focus, '/progress': Progress, '/feedback': Feedback };
const ADMIN = { '/admin': AdminOverview, '/admin/users': AdminUsers, '/admin/feedback': AdminFeedback, '/admin/model': AdminModel };

export default function App() {
  const { user, loading } = useAuth();
  const path = usePath();
  if (loading) return <Spinner />;
  if (!user) return path === '/register' ? <Register /> : <Login />;

  if (user.role === 'admin') {
    const Page = ADMIN[path];
    if (!Page) { navigate('/admin'); return null; }
    return <Layout admin path={path}><Page /></Layout>;
  }
  const Page = STUDENT[path];
  if (!Page) { navigate('/'); return null; }
  return (
    <DataProvider>
      <TimerProvider>
        <Layout path={path}><Page /></Layout>
      </TimerProvider>
    </DataProvider>
  );
}
