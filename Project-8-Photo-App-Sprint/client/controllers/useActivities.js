import { useCallback, useEffect, useRef, useState } from "react";

import getActivities from "../model/api/activityApi.js";
import getErrorMessage from "../model/api/errors.js";

// How often the feed re-fetches while it is mounted, so it stays current
// without the user doing anything.
const POLL_INTERVAL_MS = 10000;

/**
 * Controller for the activity feed view.
 *
 * Owns fetching and loading/error state. Fetches immediately on mount, then
 * polls every POLL_INTERVAL_MS while the view is open; the interval is cleared
 * on unmount. `refresh` lets the view's Refresh button trigger an immediate
 * fetch; because it restarts the interval, the next automatic poll is a full
 * POLL_INTERVAL_MS after the manual refresh instead of firing right behind it.
 * A failed poll keeps the last good data and only exposes `error`.
 *
 * Returns `{ activities, error, refresh }`, where `activities` is undefined
 * until the first load settles.
 */
function useActivities() {
  const [activities, setActivities] = useState();
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const load = useCallback(() => {
    return getActivities()
      .then((data) => {
        setActivities(data);
        setError("");
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Unable to load activities."));
      });
  }, []);

  // Restart the polling countdown. Called on mount and on every manual refresh
  // so a manual refresh never leaves the next automatic poll a few milliseconds
  // away; it waits a full interval instead.
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);
  }, [load]);

  const refresh = useCallback(() => {
    startTimer();
    return load();
  }, [startTimer, load]);

  useEffect(() => {
    refresh();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refresh]);

  return { activities, error, refresh };
}

export default useActivities;
