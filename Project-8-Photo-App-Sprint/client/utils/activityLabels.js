/**
 * Human-readable phrases for the activity `type` values.
 *
 * The server returns the raw type key (see server/models/activityTypes.js); the
 * UI combines it with the actor's name, e.g. "Ian Malcolm uploaded a photo".
 * An unknown type falls back to a generic phrase so a new server-side type can
 * never crash the feed.
 */

const ACTIVITY_LABELS = {
  PHOTO_UPLOAD: "uploaded a photo",
  ADD_COMMENT: "added a comment",
  LIKE: "liked a photo",
  USER_REGISTER: "registered",
  USER_LOGIN: "logged in",
  USER_LOGOUT: "logged out",
};

/**
 * @param {string} type One of the server's activity type keys.
 * @returns {string} The action phrase to show next to the actor's name.
 */
function activityLabel(type) {
  return ACTIVITY_LABELS[type] || "did something";
}

export default activityLabel;
