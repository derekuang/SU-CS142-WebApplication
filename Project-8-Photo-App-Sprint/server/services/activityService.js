/**
 * Business rules for the activity feed.
 *
 * Owns the "record an activity" action (which is deliberately best-effort: a
 * failed activity write must never break the upload/comment/login that produced
 * it) and the shaping of the feed for the API. It never touches `req`/`res`.
 */

const activityRepo = require("../models/activityRepo.js");
const ACTIVITY_TYPES = require("../models/activityTypes.js");

// The story asks for the 5 most recent activities.
const DEFAULT_LIMIT = 5;

/**
 * Record that a user did something.
 *
 * Intended to be called fire-and-forget: it always resolves, logging (and
 * swallowing) any database error so an activity problem cannot turn into a
 * failed upload, comment, login, or logout.
 *
 * @param {string} type One of ACTIVITY_TYPES.
 * @param {string} userId The acting user's `_id`.
 * @param {string} [photoId] The related photo's `_id` (uploads/comments only).
 * @param {string} [commentId] The related comment's `_id` (comments only).
 * @returns {Promise<void>} Always resolves.
 */
function record(type, userId, photoId, commentId) {
  const activityData = { user_id: userId, type };
  if (photoId !== undefined && photoId !== null) {
    activityData.photo_id = photoId;
  }
  if (commentId !== undefined && commentId !== null) {
    activityData.comment_id = commentId;
  }

  return activityRepo.create(activityData).catch((err) => {
    console.log("Error recording activity:", err);
  });
}

/**
 * Remove the activity that belongs to a single comment.
 *
 * @param {string} commentId The deleted comment's `_id`.
 * @returns {Promise<object>} The delete result.
 */
function removeByCommentId(commentId) {
  return activityRepo.deleteByCommentId(commentId);
}

/**
 * Remove every activity that refers to a photo (its upload and its comments').
 *
 * @param {string} photoId The deleted photo's `_id`.
 * @returns {Promise<object>} The delete result.
 */
function removeByPhotoId(photoId) {
  return activityRepo.deleteByPhotoId(photoId);
}

/**
 * Remove the activities a deleted account is responsible for: the ones it
 * performed and the ones recorded against the photos it owned.
 *
 * @param {string} userId The deleted user's `_id`.
 * @param {Array<string>} photoIds The ids of the user's deleted photos.
 * @returns {Promise<object>} The delete result.
 */
function removeForUserAndPhotos(userId, photoIds) {
  return activityRepo.deleteByUserAndPhotos(userId, photoIds);
}

/**
 * Resolve a caller-supplied limit into a usable value.
 *
 * @param {string|number} [rawLimit] The request's optional `limit` query value.
 * @returns {number} The parsed positive integer, or DEFAULT_LIMIT.
 */
function resolveLimit(rawLimit) {
  const parsed = parseInt(rawLimit, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_LIMIT;
}

/**
 * Turn an aggregation row into the activity shape the API returns.
 *
 * @param {object} activity A row from activityRepo.findRecentVisible.
 * @returns {object} `{ _id, type, date_time, user, photo }`, where `user` and
 *   `photo` are null when absent.
 */
function shapeActivity(activity) {
  const actor = activity.user && activity.user[0];
  const photo = activity.photo && activity.photo[0];

  return {
    _id: activity._id,
    type: activity.type,
    date_time: activity.date_time,
    user: actor
      ? {
          _id: actor._id,
          first_name: actor.first_name,
          last_name: actor.last_name,
        }
      : null,
    photo: photo
      ? {
          _id: photo._id,
          file_name: photo.file_name,
          user_id: photo.user_id,
        }
      : null,
  };
}

/**
 * Build the activity feed for a viewer: the most recent activities that are
 * visible to them, newest first.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @param {string|number} [rawLimit] Optional requested number of activities.
 * @returns {Promise<Array<object>>} The shaped activities.
 */
function getRecentActivities(viewerId, rawLimit) {
  const limit = resolveLimit(rawLimit);
  return activityRepo
    .findRecentVisible(viewerId, limit)
    .then((activities) => activities.map(shapeActivity));
}

module.exports = {
  ACTIVITY_TYPES,
  DEFAULT_LIMIT,
  record,
  removeByCommentId,
  removeByPhotoId,
  removeForUserAndPhotos,
  getRecentActivities,
};
