import { useCallback, useEffect, useRef, useState } from "react";

import { getActivitiesByUser } from "../model/api/activityApi.js";
import getErrorMessage from "../model/api/errors.js";
import POLL_INTERVAL_MS from "../utils/polling.js";

/**
 * Controller for the sidebar's per-user activity summary.
 *
 * Fetches every user with their latest visible activity on mount, then polls
 * while the sidebar is mounted. Two guards keep the polling safe:
 *   - an in-flight flag skips a tick while the previous request is still open,
 *     so an older response can never overwrite a newer one;
 *   - a mounted flag ignores a response that arrives after unmount.
 *
 * A failed poll keeps the last good entries and only exposes `error`; the next
 * successful poll clears it.
 *
 * Returns `{ entries, error }`, where `entries` is undefined until the first
 * load settles.
 */
function useUserActivity() {
  const [entries, setEntries] = useState();
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const data = await getActivitiesByUser();
      if (mountedRef.current) {
        setEntries(data);
        setError("");
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(getErrorMessage(err, "Unable to load activities."));
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [load]);

  return { entries, error };
}

export default useUserActivity;
