/**
 * Data-access layer (Model) for the Photo collection.
 *
 * Every Mongoose query against photos lives here and is exposed as a Promise.
 * Repositories never touch `req`/`res`; controllers and services call these
 * methods so query details stay out of the request-handling code.
 */

const mongoose = require("mongoose");

const Photo = require("../../schema/photo.js");

/**
 * Build the extra query clause that limits photos to those a viewer may see.
 *
 * The owner sees every one of their own photos, so no clause is needed (null is
 * returned). Everyone else may only see photos that are public (the
 * `shared_with` field is absent) or that list them in `shared_with`. A present
 * but empty `shared_with` matches neither branch, which is exactly the
 * "owner only" case.
 *
 * @param {string} ownerId The photo owner's `_id`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {object|null} A `{ $or }` clause, or null when unrestricted.
 */
function visibilityFilter(ownerId, viewerId) {
  if (String(ownerId) === String(viewerId)) {
    return null;
  }
  return {
    $or: [
      { shared_with: { $exists: false } },
      { shared_with: viewerId },
    ],
  };
}

/**
 * Find all photos for a user that the viewer may see, with their comments'
 * author and mentioned users populated.
 *
 * The `comments.user_id` and `comments.mentions` references are populated with
 * just the names so a caller can build the `user`/`mentions` objects the API
 * contract expects; `__v` is excluded to match the existing response shape.
 *
 * Only photos the viewer is allowed to see are returned; `shared_with` is
 * stripped from the response so the share list never leaks.
 *
 * @param {string} userId
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<Array<object>>} The visible Photo documents.
 */
function findByUser(userId, viewerId) {
  const query = { user_id: userId };
  const filter = visibilityFilter(userId, viewerId);
  if (filter) {
    query.$or = filter.$or;
  }
  return Photo.find(query)
    .select("-__v -shared_with")
    .populate({
      path: "comments.user_id",
      select: "first_name last_name",
    })
    .populate({
      path: "comments.mentions",
      select: "first_name last_name",
    })
    .exec();
}

/**
 * Find a single photo by its Mongo `_id`.
 *
 * @param {string} photoId
 * @returns {Promise<object|null>} The matching Photo document, or null.
 */
function findById(photoId) {
  return Photo.findById(photoId).exec();
}

/**
 * Find the user's most recently uploaded photo.
 *
 * @param {string} userId
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<object|null>} The newest visible Photo document (file_name,
 *   date_time only), or null when the viewer cannot see any of the user's
 *   photos.
 */
function findMostRecentByUser(userId, viewerId) {
  const query = { user_id: userId };
  const filter = visibilityFilter(userId, viewerId);
  if (filter) {
    query.$or = filter.$or;
  }
  return Photo.findOne(query)
    .sort({ date_time: -1 })
    .select("file_name date_time")
    .exec();
}

/**
 * Find the user's photo with the most comments.
 *
 * The aggregation counts each photo's comments and sorts by that count, newest
 * first as a deterministic tie-breaker so an equal-count draw always resolves
 * to the same photo.
 *
 * @param {string} userId
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<object|null>} The most commented visible Photo document
 *   (file_name, date_time, commentCount only), or null when the viewer cannot
 *   see any of the user's photos.
 */
function findMostCommentedByUser(userId, viewerId) {
  // Guard against a malformed id: casting it would throw before we can return
  // a promise, so treat it as "no photos".
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve([]);
  }

  const match = { user_id: mongoose.Types.ObjectId(userId) };
  // The aggregation pipeline does not cast for us, so the viewer branch is
  // built with a real ObjectId (the viewer id always comes from the session).
  if (String(viewerId) !== String(userId)) {
    match.$or = [
      { shared_with: { $exists: false } },
      { shared_with: mongoose.Types.ObjectId(viewerId) },
    ];
  }

  return Photo.aggregate()
    .match(match)
    .addFields({ commentCount: { $size: { $ifNull: ["$comments", []] } } })
    .sort({ commentCount: -1, date_time: -1 })
    .limit(1)
    .project({ _id: 1, file_name: 1, date_time: 1, commentCount: 1 })
    .exec();
}

/**
 * Find every photo that has a comment @mentioning the given user.
 *
 * Only the fields the mentions list needs are returned (thumbnail file name,
 * upload time, owner name), so the comments themselves are excluded. Matching
 * on `comments.mentions` also de-duplicates a photo that mentions the user more
 * than once. A malformed id is treated as "no photos" rather than throwing.
 *
 * Only photos the viewer is allowed to see are returned, so a mention on a
 * private photo the viewer cannot see never leaks its thumbnail.
 *
 * @param {string} userId The mentioned user's `_id`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<Array<object>>} Visible photos whose comments mention the
 *   user, newest first, with `user_id` populated with the owner's name.
 */
function findPhotosMentioningUser(userId, viewerId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve([]);
  }
  return Photo.find({
    "comments.mentions": userId,
    $or: [
      { user_id: viewerId },
      { shared_with: { $exists: false } },
      { shared_with: viewerId },
    ],
  })
    .select("-__v -comments -shared_with")
    .populate({ path: "user_id", select: "first_name last_name" })
    .sort({ date_time: -1 })
    .exec();
}

/**
 * Create a new photo.
 *
 * @param {object} photoData Fields for the new photo (file_name, user_id, ...).
 * @returns {Promise<object>} The created Photo document.
 */
function create(photoData) {
  return Photo.create(photoData);
}

/**
 * Persist changes to an existing Photo document.
 *
 * Kept as a primitive so a service can compose "find, mutate, save" and still
 * tell apart a load failure from a save failure.
 *
 * @param {object} photo A Mongoose Photo document that has been modified.
 * @returns {Promise<object>} The saved Photo document.
 */
function save(photo) {
  return photo.save();
}

module.exports = {
  findByUser,
  findById,
  findPhotosMentioningUser,
  findMostRecentByUser,
  findMostCommentedByUser,
  create,
  save,
};
