import { useCallback, useEffect, useState } from 'react';
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try { const data = await fn(); setState({ data, loading: false, error: null }); }
    catch (e) { setState((s) => ({ ...s, loading: false, error: e.message })); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
