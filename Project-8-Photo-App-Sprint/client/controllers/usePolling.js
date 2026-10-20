import { useCallback, useEffect, useRef, useState } from "react";

import getErrorMessage from "../model/api/errors.js";
import POLL_INTERVAL_MS from "../utils/polling.js";

/**
 * Poll a fetch function and expose its latest result.
 *
 * One implementation owns everything the two polling views used to duplicate:
 * the interval, the in-flight guard (a tick that fires while a request is open
 * is skipped, so an older response can never overwrite a newer one), and the
 * unmount guard (a response that arrives after the view is gone is ignored).
 *
 * `fetcher` must be a stable reference - a module function, not an inline
 * arrow - because a new identity restarts the poller.
 *
 * @param {function(): Promise<*>} fetcher Resolves with the next value.
 * @param {string} fallbackMessage Displayed when the request fails and the
 *   server gave no usable message.
 * @returns {{data: *, error: string, refresh: function(): Promise<void>}}
 *   `data` is undefined until the first load settles; a failed poll keeps the
 *   last good data and only exposes `error`.
 */
function usePolling(fetcher, fallbackMessage) {
  const [data, setData] = useState();
  const [error, setError] = useState("");
  const pollerRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let timer = null;

    const tick = () => {
      if (inFlight) {
        return Promise.resolve();
      }
      inFlight = true;
      return fetcher()
        .then((next) => {
          if (!stopped) {
            setData(next);
            setError("");
          }
        })
        .catch((err) => {
          if (!stopped) {
            setError(getErrorMessage(err, fallbackMessage));
          }
        })
        .finally(() => {
          inFlight = false;
        });
    };

    // Restart the countdown. Called on mount and on every manual refresh so a
    // manual refresh never leaves the next automatic poll a few milliseconds
    // away; it waits a full interval instead.
    const startTimer = () => {
      if (timer) {
        clearInterval(timer);
      }
      timer = setInterval(tick, POLL_INTERVAL_MS);
    };

    const reload = () => {
      startTimer();
      return tick();
    };

    pollerRef.current = { refresh: reload };

    reload();

    return () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      pollerRef.current = null;
    };
  }, [fetcher, fallbackMessage]);

  const refresh = useCallback(() => {
    if (!pollerRef.current) {
      return Promise.resolve();
    }
    return pollerRef.current.refresh();
  }, []);

  return { data, error, refresh };
}

export default usePolling;
