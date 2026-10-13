const mongoose = require("mongoose");

const Activity = require("../../schema/activity.js");

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
 * Find the most recent activities a viewer is allowed to see.
 *
 * The result is computed with an aggregation rather than "fetch N then filter",
 * so exactly `limit` visible activities are returned even when some of the
 * newest ones belong to photos the viewer may not see. Each activity's photo is
 * joined in with a pipeline that keeps the photo only when it is visible to the
 * viewer (owner, public, or listed in `shared_with`), mirroring
 * `photoRepo.visibilityFilter`. An activity with no `photo_id`
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

  const viewer = mongoose.Types.ObjectId(viewerId);

  return Activity.aggregate()
    .lookup({
      from: "photos",
      let: { activityPhotoId: "$photo_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$activityPhotoId"] } } },
        {
          $match: {
            $or: [
              { user_id: viewer },
              { shared_with: { $exists: false } },
              { shared_with: viewer },
            ],
          },
        },
        { $project: { _id: 1, file_name: 1, user_id: 1 } },
      ],
      as: "photo",
    })
    .match({
      $or: [
        { photo_id: { $exists: false } },
        { photo_id: null },
        { "photo.0": { $exists: true } },
      ],
    })
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

module.exports = {
  create,
  findRecentVisible,
};
