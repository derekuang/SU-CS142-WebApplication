"use strict";

/**
 * The activity types the API is expected to expose.
 *
 * Deliberately kept in the test package instead of importing
 * `server/models/activityTypes.js`: the tests are an independent oracle, so an
 * accidental rename or removal in the implementation must fail the suite rather
 * than silently changing the test's expectation.
 *
 * Shared by every activity test suite so the expected set is defined once.
 */
const ACTIVITY_TYPES = [
  "PHOTO_UPLOAD",
  "ADD_COMMENT",
  "LIKE",
  "USER_REGISTER",
  "USER_LOGIN",
  "USER_LOGOUT",
];
const PHOTO_ACTIVITY_TYPES = ["PHOTO_UPLOAD", "ADD_COMMENT", "LIKE"];

module.exports = {
  ACTIVITY_TYPES,
  PHOTO_ACTIVITY_TYPES,
};
