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
 * Find all photos for a user, with their comments' author and mentioned users
 * populated.
 *
 * The `comments.user_id` and `comments.mentions` references are populated with
 * just the names so a caller can build the `user`/`mentions` objects the API
 * contract expects; `__v` is excluded to match the existing response shape.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>} The user's Photo documents.
 */
function findByUser(userId) {
  return Photo.find({ user_id: userId })
    .select("-__v")
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
 * @returns {Promise<object|null>} The newest Photo document (file_name,
 *   date_time only), or null when the user has no photos.
 */
function findMostRecentByUser(userId) {
  return Photo.findOne({ user_id: userId })
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
 * @returns {Promise<object|null>} The most commented Photo document
 *   (file_name, date_time, commentCount only), or null when the user has no
 *   photos.
 */
function findMostCommentedByUser(userId) {
  // Guard against a malformed id: casting it would throw before we can return
  // a promise, so treat it as "no photos".
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve([]);
  }

  return Photo.aggregate()
    .match({ user_id: mongoose.Types.ObjectId(userId) })
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
 * @param {string} userId The mentioned user's `_id`.
 * @returns {Promise<Array<object>>} Photos whose comments mention the user,
 *   newest first, with `user_id` populated with the owner's name.
 */
function findPhotosMentioningUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve([]);
  }
  return Photo.find({ "comments.mentions": userId })
    .select("-__v -comments")
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
