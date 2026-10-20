/**
 * Business rules for the activity feed.
 *
 * Owns the "record an activity" action (which is deliberately best-effort: a
 * failed activity write must never break the upload/comment/login that produced
 * it) and the shaping of the feed for the API. It never touches `req`/`res`.
 */

const activityRepo = require("../models/activityRepo.js");
const userRepo = require("../models/userRepo.js");
const ACTIVITY_TYPES = require("../models/activityTypes.js");
const { shapeActivityPhoto } = require("../models/photoShapes.js");

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
 * @param {string} [photoId] The related photo's `_id` (uploads/comments/likes).
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
 * Remove the feed entry for a like that has been taken back.
 *
 * Deliberately best-effort, like `record`: the like has already been removed
 * from the photo, so a failed activity cleanup must not turn into a failed
 * unlike.
 *
 * @param {string} userId The unliking user's `_id`.
 * @param {string} photoId The photo's `_id`.
 * @returns {Promise<void>} Always resolves.
 */
function removeLike(userId, photoId) {
  return activityRepo.deleteLike(userId, photoId).catch((err) => {
    console.log("Error removing like activity:", err);
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
    photo: shapeActivityPhoto(photo),
  };
}

/**
 * Shape one user's latest activity for the sidebar summary. The actor is the
 * enclosing `user`, so it is not repeated here.
 *
 * @param {object} activity An `activity` row from
 *   activityRepo.findLatestVisiblePerUser.
 * @returns {object} `{ _id, type, date_time, photo }`.
 */
function shapeLatestActivity(activity) {
  return {
    _id: activity._id,
    type: activity.type,
    date_time: activity.date_time,
    photo: shapeActivityPhoto(activity.photo),
  };
}

/**
 * Order two user names alphabetically by last name, then first name.
 *
 * @param {object} a A `{ user }` entry.
 * @param {object} b A `{ user }` entry.
 * @returns {number} Negative when a sorts before b.
 */
function compareUserNames(a, b) {
  const lastNameOrder = a.user.last_name.localeCompare(b.user.last_name);
  if (lastNameOrder !== 0) {
    return lastNameOrder;
  }
  return a.user.first_name.localeCompare(b.user.first_name);
}

/**
 * Order sidebar entries: newest activity first, no-activity users last
 * (alphabetically). Identical timestamps fall back to the activity id so the
 * order is stable.
 *
 * @param {object} a A `{ user, activity }` entry.
 * @param {object} b A `{ user, activity }` entry.
 * @returns {number} Negative when a sorts before b.
 */
function compareEntries(a, b) {
  if (a.activity && b.activity) {
    const timeOrder =
      new Date(b.activity.date_time).getTime() -
      new Date(a.activity.date_time).getTime();
    if (timeOrder !== 0) {
      return timeOrder;
    }
    return String(b.activity._id).localeCompare(String(a.activity._id));
  }
  if (a.activity) {
    return -1;
  }
  if (b.activity) {
    return 1;
  }
  return compareUserNames(a, b);
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

/**
 * Build the sidebar summary: every user with their most recent activity that
 * the viewer is allowed to see.
 *
 * The user list and the per-user activity rows are fetched independently and
 * merged here, so users who never did anything (or whose only activities are on
 * hidden photos) still appear with `activity: null`.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<Array<object>>} `{ user, activity }` entries, newest
 *   activity first, users with no visible activity last.
 */
function getLatestActivityByUser(viewerId) {
  return Promise.all([
    userRepo.list(),
    activityRepo.findLatestVisiblePerUser(viewerId),
  ]).then((results) => {
    const users = results[0];
    const latestActivities = results[1];
    const activityByUser = new Map();

    latestActivities.forEach((row) => {
      activityByUser.set(
        String(row.user_id),
        shapeLatestActivity(row.activity),
      );
    });

    const entries = users.map((user) => ({
      user: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      activity: activityByUser.get(String(user._id)) || null,
    }));

    return entries.sort(compareEntries);
  });
}

module.exports = {
  ACTIVITY_TYPES,
  DEFAULT_LIMIT,
  record,
  removeLike,
  removeByCommentId,
  removeByPhotoId,
  removeForUserAndPhotos,
  getRecentActivities,
  getLatestActivityByUser,
};
