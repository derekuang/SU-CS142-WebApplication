import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Enable the plugin once at module load. `dayjs.extend` is idempotent, so this
// is safe to import from multiple views.
dayjs.extend(relativeTime);

/**
 * Format a timestamp as human-friendly relative time, e.g. "2 days ago" or
 * "in 3 hours".
 *
 * @param {string|number|Date} dateTime
 * @returns {string}
 */
function humanize(dateTime) {
  return dayjs().to(dayjs(dateTime));
}

export default humanize;
