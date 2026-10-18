/**
 * How often the app's polling views re-fetch so they stay current without the
 * user doing anything.
 *
 * Shared by the activity feed and the sidebar summary so the two views never
 * drift apart on their refresh rate.
 */
const POLL_INTERVAL_MS = 10000;

export default POLL_INTERVAL_MS;
