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

/**
 * Find every photo a user owns, without any visibility filtering.
 *
 * Deletion is performed by the owner, so this deliberately ignores `shared_with`
 * (unlike `findByUser`) and returns just the `_id` and `file_name`: the id is
 * needed to clean up activity records, the file name to remove the image from
 * disk.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>} The user's photos (`_id`, `file_name`).
 */
function findAllByUser(userId) {
  return Photo.find({ user_id: userId }).select("_id file_name").exec();
}

/**
 * Delete a photo by its Mongo `_id`.
 *
 * @param {string} photoId
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteById(photoId) {
  return Photo.deleteOne({ _id: photoId }).exec();
}

/**
 * Delete every photo owned by a user, used by the account-deletion cascade.
 *
 * @param {string} userId
 * @returns {Promise<object>} The delete result ({ deletedCount }).
 */
function deleteByUser(userId) {
  return Photo.deleteMany({ user_id: userId }).exec();
}

/**
 * Remove a single embedded comment from a photo.
 *
 * `$pull` targets the subdocument by its own `_id`, so it is atomic and leaves
 * the photo's other comments (and every other field) untouched. The caller must
 * have already verified the comment exists and belongs to the acting user.
 *
 * @param {string} photoId The photo's `_id`.
 * @param {string} commentId The comment subdocument's `_id`.
 * @returns {Promise<object>} The update result ({ matchedCount, modifiedCount }).
 */
function deleteComment(photoId, commentId) {
  return Photo.updateOne(
    { _id: photoId },
    { $pull: { comments: { _id: commentId } } },
  ).exec();
}

/**
 * Remove every comment authored by a user from all photos.
 *
 * Used by the account-deletion cascade: the deleted user's comments on *other*
 * people's photos are pulled, while the comments on their own photos disappear
 * with those photos.
 *
 * @param {string} authorId The deleted user's `_id`.
 * @returns {Promise<object>} The update result ({ matchedCount, modifiedCount }).
 */
function pullCommentsByAuthor(authorId) {
  return Photo.updateMany(
    { "comments.user_id": authorId },
    { $pull: { comments: { user_id: authorId } } },
  ).exec();
}

/**
 * Remove a user from every photo's `shared_with` list.
 *
 * A deleted account must not linger in other users' visibility lists; the ids
 * are dropped from the array while an absent `shared_with` (public) stays
 * absent, so the three-state visibility model is preserved.
 *
 * @param {string} userId The deleted user's `_id`.
 * @returns {Promise<object>} The update result ({ matchedCount, modifiedCount }).
 */
function pullFromSharedWith(userId) {
  return Photo.updateMany(
    { shared_with: userId },
    { $pull: { shared_with: userId } },
  ).exec();
}

/**
 * Remove a user's id from every comment's `mentions` array.
 *
 * Mentions live inside comments, so a `$pull` aimed at `comments` (matching
 * `mentions` as a condition) would delete the whole comment. Pointing `$pull`
 * at the inner `mentions` array through the all-positional `$[]` operator
 * removes only the id from every comment and leaves the comments themselves
 * untouched, keeping the invariant that a mention never points at a nonexistent
 * user. The author's own comments have already been removed by
 * `pullCommentsByAuthor`, so this runs on the survivors.
 *
 * @param {string} userId The deleted user's `_id`.
 * @returns {Promise<object>} The update result (matched/modified counts).
 */
function pullMentionsOfUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
  }
  // Cast explicitly: `$pull` compares against the stored mention ids, and the
  // all-positional path is not one Mongoose casts for us.
  const id = mongoose.Types.ObjectId(userId);
  return Photo.updateMany(
    { "comments.mentions": id },
    { $pull: { "comments.$[].mentions": id } },
  ).exec();
}

module.exports = {
  findByUser,
  findById,
  findPhotosMentioningUser,
  findMostRecentByUser,
  findMostCommentedByUser,
  findAllByUser,
  create,
  save,
  deleteById,
  deleteByUser,
  deleteComment,
  pullCommentsByAuthor,
  pullFromSharedWith,
  pullMentionsOfUser,
};
