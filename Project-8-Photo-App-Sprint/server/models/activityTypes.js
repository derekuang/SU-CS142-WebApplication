/**
 * The set of activity types an Activity record can carry.
 *
 * Kept as a single shared module so the schema (validation), the services that
 * record activities, and the seed script all agree on the same strings. The
 * client mirrors these keys in client/utils/activityLabels.js.
 */
const ACTIVITY_TYPES = {
  PHOTO_UPLOAD: "PHOTO_UPLOAD",
  ADD_COMMENT: "ADD_COMMENT",
  LIKE: "LIKE",
  USER_REGISTER: "USER_REGISTER",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
};

module.exports = ACTIVITY_TYPES;
