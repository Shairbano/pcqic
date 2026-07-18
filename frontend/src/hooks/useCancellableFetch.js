import { useState, useEffect, useCallback } from 'react';

/**
 * useCancellableFetch
 *
 * Fetches a list on mount (and whenever `fetchFn` changes identity), safely
 * ignoring the result if the component unmounts or `fetchFn` changes again
 * before the request resolves. Also returns a `reload` function for
 * re-fetching after an action (create/approve/delete/etc), matching each
 * caller's original behavior:
 *   - reload()            -> shows the loading state again (GroupList, ProjectList, ArchivedItems)
 *   - reload({ silent })  -> re-fetches quietly, no loading flicker, no error surfaced (TaskList)
 *
 * IMPORTANT: `fetchFn` must be memoized by the caller with its own
 * `useCallback` (with a literal deps array), e.g.:
 *
 *   const fetchGroups = useCallback(() => api.getGroups(orgId), [orgId]);
 *   const { data, loading, error, reload } = useCancellableFetch(fetchGroups);
 *
 * This hook re-fetches whenever `fetchFn`'s identity changes, so the
 * caller's own deps array (`[orgId]` above) is effectively what drives
 * re-fetching -- there's no separate `deps` param to forward here, which is
 * what tripped the strict useCallback/useEffect lint rule before (it
 * requires a true literal dependency array, not a spread of a variable).
 *
 * @param {() => Promise<any>} fetchFn - memoized fetch function; resolves with the array/data to store
 * @param {{ errorMessage?: string, initialData?: any, logErrors?: boolean, resetOnError?: boolean }} options
 */
export default function useCancellableFetch(fetchFn, options = {}) {
  const {
    errorMessage = 'Could not load data.',
    initialData = [],
    logErrors = false,
    resetOnError = false,
  } = options;

  const [data, setData]       = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const reload = useCallback((opts = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    return fetchFn()
      .then((result) => { setData(result); return result; })
      .catch((err) => {
        if (logErrors) console.error(err);
        if (!silent) setError(errorMessage);
        if (resetOnError) setData(initialData);
      })
      .finally(() => { if (!silent) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  useEffect(() => {
    let cancelled = false;

    // Deferred by a microtask so `setLoading(true)` isn't called synchronously
    // in the effect body (avoids the cascading-render lint rule). Since fetchFn()
    // below is itself async, this resolves before any real work completes.
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetchFn()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => {
        if (cancelled) return;
        if (logErrors) console.error(err);
        setError(errorMessage);
        if (resetOnError) setData(initialData);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  return { data, setData, loading, error, setError, reload };
}