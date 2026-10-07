/**
 * Data-access layer (Model) for the Photo collection.
 *
 * Every Mongoose query against photos lives here and is exposed as a Promise.
 * Repositories never touch `req`/`res`; controllers and services call these
 * methods so query details stay out of the request-handling code.
 */

const Photo = require("../../schema/photo.js");

/**
 * Find all photos for a user, with their comments' author info populated.
 *
 * The `comments.user_id` reference is populated with just the author's name so
 * a caller can build the `user` object the API contract expects; `__v` is
 * excluded to match the existing response shape.
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
  create,
  save,
};
