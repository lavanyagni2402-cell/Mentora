// Minimal hash router: pages live at #/tasks, #/admin/users, ...
import { useEffect, useState } from 'react';

export const currentPath = () => window.location.hash.slice(1) || '/';
export const navigate = (path) => { window.location.hash = path; };

export function usePath() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
