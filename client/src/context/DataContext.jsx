import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get } from '../lib/api';

// Subjects are used on most student pages, so they're loaded once and shared
const DataCtx = createContext(null);
export function DataProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const reloadSubjects = useCallback(async () => { setSubjects(await get('/subjects')); setLoaded(true); }, []);
  useEffect(() => { reloadSubjects().catch(() => setLoaded(true)); }, [reloadSubjects]);
  const subject = (id) => subjects.find((s) => s.id === id);
  return <DataCtx.Provider value={{ subjects, subject, reloadSubjects, loaded }}>{children}</DataCtx.Provider>;
}
export const useData = () => useContext(DataCtx);
