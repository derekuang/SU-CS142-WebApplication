import getActivities from "../model/api/activityApi.js";
import usePolling from "./usePolling.js";

/**
 * Controller for the activity feed view.
 *
 * The polling behaviour - interval, in-flight guard, unmount guard - lives in
 * `usePolling`; this wrapper names the feed's data and keeps the view's
 * interface. `refresh` restarts the countdown and fetches immediately, but a
 * click while a poll is already in flight does not start a second request.
 *
 * Returns `{ activities, error, refresh }`, where `activities` is undefined
 * until the first load settles. A failed poll keeps the last good data and only
 * exposes `error`.
 */
function useActivities() {
  const { data, error, refresh } = usePolling(
    getActivities,
    "Unable to load activities.",
  );

  return { activities: data, error, refresh };
}

export default useActivities;
