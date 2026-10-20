import { getActivitiesByUser } from "../model/api/activityApi.js";
import usePolling from "./usePolling.js";

/**
 * Controller for the sidebar's per-user activity summary.
 *
 * The polling behaviour lives in `usePolling`; this wrapper names the sidebar's
 * data and drops `refresh` because the sidebar has no refresh control.
 *
 * Returns `{ entries, error }`, where `entries` is undefined until the first
 * load settles. A failed poll keeps the last good entries and only exposes
 * `error`.
 */
function useUserActivity() {
  const { data, error } = usePolling(
    getActivitiesByUser,
    "Unable to load activities.",
  );

  return { entries: data, error };
}

export default useUserActivity;
