const mongoose = require("mongoose");

const Activity = require("../../schema/activity.js");
const ACTIVITY_TYPES = require("./activityTypes.js");
const { visibilityClause } = require("./photoVisibility.js");

/**
 * Data-access layer (Model) for the Activity collection.
 *
 * Every Mongoose query against activities lives here and is exposed as a
 * Promise. Repositories never touch `req`/`res`; services call these methods so
 * query details stay out of the business-rule code.
 */

/**
 * Create a new activity record.
 *
 * @param {object} activityData Fields for the new activity (user_id, type,
 *   and optionally photo_id/date_time).
 * @returns {Promise<object>} The created Activity document.
 */
function create(activityData) {
  return Activity.create(activityData);
}

/**
 * Delete the activity that belongs to a specific comment.
 *
 * Used when a user deletes one of their comments: matching on `comment_id`
 * (rather than on the photo) leaves the same user's other comments on that
 * photo untouched. A comment whose activity predates the `comment_id` field
 * simply matches nothing.
 *
 * @param {string} commentId The deleted comment's `_id`.
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteByCommentId(commentId) {
  return Activity.deleteMany({ comment_id: commentId }).exec();
}

/**
 * Delete every activity that refers to a photo.
 *
 * Used when a photo is deleted: its upload activity and every add-comment
 * activity recorded against it are removed so the feed never shows an activity
 * for a photo that no longer exists.
 *
 * @param {string} photoId The deleted photo's `_id`.
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteByPhotoId(photoId) {
  return Activity.deleteMany({ photo_id: photoId }).exec();
}

/**
 * Delete the activities that a deleted account is responsible for.
 *
 * Two kinds are removed: the ones the user performed (any type, so their
 * register/login/logout entries do not linger as "Unknown user") and the ones
 * other users performed on the photos the account owned (those photos are being
 * deleted too).
 *
 * @param {string} userId The deleted user's `_id`.
 * @param {Array<string>} photoIds The ids of the user's (about to be deleted)
 *   photos.
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteByUserAndPhotos(userId, photoIds) {
  const conditions = [{ user_id: userId }];
  if (photoIds && photoIds.length > 0) {
    conditions.push({ photo_id: { $in: photoIds } });
  }
  return Activity.deleteMany({ $or: conditions }).exec();
}

/**
 * Build the `$lookup` stage that joins an activity's photo, keeping the photo
 * only when it is visible to the viewer.
 *
 * The rule comes from `photoVisibility`, so the feed and the sidebar summary
 * cannot drift from the queries in `photoRepo` or from the write paths. An
 * activity is visible when it has no photo, or when the clause matches its
 * photo.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {object} A `$lookup` stage aliasing the result to `photo`.
 */
function visiblePhotoLookup(viewerId) {
  return {
    from: "photos",
    let: { activityPhotoId: "$photo_id" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$activityPhotoId"] } } },
      { $match: visibilityClause(viewerId) },
      { $project: { _id: 1, file_name: 1, user_id: 1 } },
    ],
    as: "photo",
  };
}

/**
 * The `$match` that follows `visiblePhotoLookup`.
 *
 * It keeps activities with no photo at all (register/login/logout) and drops
 * activities whose photo exists but is not visible to the viewer.
 *
 * @returns {object} A `$match` stage.
 */
function visibleActivityMatch() {
  return {
    $or: [
      { photo_id: { $exists: false } },
      { photo_id: null },
      { "photo.0": { $exists: true } },
    ],
  };
}

/**
 * Find the most recent activities a viewer is allowed to see.
 *
 * The result is computed with an aggregation rather than "fetch N then filter",
 * so exactly `limit` visible activities are returned even when some of the
 * newest ones belong to photos the viewer may not see. Each activity's photo is
 * joined in with a pipeline that keeps the photo only when the shared
 * visibility clause matches it. An activity with no `photo_id`
 * (register/login/logout) always passes; one whose photo exists but is not
 * visible is dropped.
 *
 * The actor's name is joined in too, but only the name fields are projected so
 * credentials never leave the query.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @param {number} limit Maximum number of activities to return.
 * @returns {Promise<Array<object>>} Activities, newest first, shaped as
 *   `{ _id, type, date_time, user: [actor], photo: [photo] }` where each joined
 *   array holds zero or one element.
 */
function findRecentVisible(viewerId, limit) {
  // A malformed viewer id could never match anything visible; treat it as "no
  // activities" rather than letting the cast throw.
  if (!mongoose.Types.ObjectId.isValid(viewerId)) {
    return Promise.resolve([]);
  }

  return Activity.aggregate()
    .lookup(visiblePhotoLookup(viewerId))
    .match(visibleActivityMatch())
    .sort({ date_time: -1, _id: -1 })
    .limit(limit)
    .lookup({
      from: "users",
      let: { activityUserId: "$user_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$activityUserId"] } } },
        { $project: { first_name: 1, last_name: 1 } },
      ],
      as: "user",
    })
    .project({ type: 1, date_time: 1, user: 1, photo: 1 })
    .exec();
}

/**
 * Find the most recent activity each user performed that the viewer may see.
 *
 * One row per user, newest visible activity first inside the group. The photo
 * visibility filter is the same one `findRecentVisible` uses, applied before the
 * `$group`: a user whose newest activity is on a photo the viewer cannot see
 * falls back to their next visible activity instead of leaking the hidden one.
 *
 * The actor is not joined here because the caller already has the user list; it
 * only needs to know which activity belongs to which `user_id`.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<Array<object>>} `{ user_id, activity: { _id, type,
 *   date_time, photo } }` rows, where `photo` is the joined photo or null.
 */
function findLatestVisiblePerUser(viewerId) {
  // A malformed viewer id could never match anything visible; treat it as "no
  // activities" rather than letting the cast throw.
  if (!mongoose.Types.ObjectId.isValid(viewerId)) {
    return Promise.resolve([]);
  }

  return Activity.aggregate()
    .lookup(visiblePhotoLookup(viewerId))
    .match(visibleActivityMatch())
    .sort({ date_time: -1, _id: -1 })
    .group({
      _id: "$user_id",
      activity: { $first: "$$ROOT" },
    })
    .project({
      _id: 0,
      user_id: "$_id",
      activity: {
        _id: "$activity._id",
        type: "$activity.type",
        date_time: "$activity.date_time",
        photo: {
          $ifNull: [{ $arrayElemAt: ["$activity.photo", 0] }, null],
        },
      },
    })
    .exec();
}

/**
 * Delete the activity recorded when a user liked a photo.
 *
 * A like is identified by the triple (actor, photo, LIKE), so unliking removes
 * exactly its own feed entry and leaves the same user's other likes - on other
 * photos - untouched. Unliking a photo that was never liked matches nothing and
 * is a harmless no-op.
 *
 * @param {string} userId The unliking user's `_id`.
 * @param {string} photoId The photo's `_id`.
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteLike(userId, photoId) {
  return Activity.deleteMany({
    user_id: userId,
    photo_id: photoId,
    type: ACTIVITY_TYPES.LIKE,
  }).exec();
}

module.exports = {
  create,
  deleteByCommentId,
  deleteByPhotoId,
  deleteByUserAndPhotos,
  deleteLike,
  findRecentVisible,
  findLatestVisiblePerUser,
};
