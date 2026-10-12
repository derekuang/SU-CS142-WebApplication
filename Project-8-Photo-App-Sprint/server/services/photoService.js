/**
 * Business rules for photos and their comments.
 *
 * Owns response shaping and comment validation, orchestrating the photo
 * repository, but never touches `req`/`res`. Controllers map the returned
 * values to HTTP responses.
 */

const mongoose = require("mongoose");

const photoRepo = require("../models/photoRepo.js");
const userRepo = require("../models/userRepo.js");

const COMMENT_REQUIRED = "Comment text is required";
const PHOTO_NOT_FOUND = "Photo not found";
const PHOTO_LOAD_FAILED = "Unable to load photo";
const COMMENT_ADD_FAILED = "Unable to add comment";

/**
 * Matches a react-mentions mention token in a comment's text. react-mentions'
 * default markup encodes a chosen suggestion as `@[display](id)`, where `id` is
 * the mentioned user's `_id`.
 */
const MENTION_PATTERN = /@\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Extract the (possibly duplicated) user ids encoded in a comment's mention
 * markup.
 *
 * Each captured id is kept only when it is a syntactically valid ObjectId; a
 * malformed token is skipped instead of being cast later, so a bad mention can
 * never make a query throw. The result is de-duplicated. Existence is checked
 * separately against the User collection.
 *
 * @param {string} text The raw comment text (with mention markup).
 * @returns {Array<string>} Distinct, syntactically valid mentioned user ids.
 */
function extractMentionIds(text) {
  if (!text) {
    return [];
  }
  const ids = new Set();
  // matchAll needs the global flag and returns a fresh iterator, so concurrent
  // calls never share regex state.
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const id = match[2];
    if (mongoose.Types.ObjectId.isValid(id)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * Convert Photo documents into the JSON shape the API returns: each comment's
 * populated `user_id` reference becomes a `user` property. This mirrors the
 * transformation the original `/photosOfUser/:id` handler performed.
 *
 * @param {Array<object>} photos Mongoose Photo documents (comments populated).
 * @returns {Array<object>} Plain photo objects with `comments[].user`.
 */
function shapePhotos(photos) {
  return photos.map((photo) => {
    const photoObj = photo.toObject();
    if (photoObj.comments) {
      photoObj.comments = photoObj.comments.map((comment) => {
        const { user_id, ...rest } = comment;
        return {
          ...rest,
          user: user_id,
        };
      });
    }
    return photoObj;
  });
}

/**
 * Add a comment to a photo.
 *
 * @param {string} photoId
 * @param {string} userId The commenting user's `_id`.
 * @param {string} rawText The comment text from the request body.
 * @returns {Promise<{photo: object}|{error: string}>} `{photo}` with the saved
 *   photo on success, or `{error}` with the user-facing message on a missing
 *   or blank comment, a missing photo, or a database failure. Any valid
 *   mentions encoded in `rawText` are stored on the new comment; mentions of
 *   nonexistent users are silently dropped.
 */
function addComment(photoId, userId, rawText) {
  if (!rawText || rawText.trim() === "") {
    return Promise.resolve({ error: COMMENT_REQUIRED });
  }

  const mentionedIds = extractMentionIds(rawText);

  return photoRepo.findById(photoId).then(
    (photo) => {
      if (!photo) {
        return { error: PHOTO_NOT_FOUND };
      }

      // Store only mentions that resolve to real users; a mention of a
      // nonexistent user is dropped (and never crashes the request).
      return userRepo.findExistingIds(mentionedIds).then((validMentionIds) => {
        photo.comments.push({
          comment: rawText.trim(),
          user_id: userId,
          mentions: validMentionIds,
        });
        return photoRepo
          .save(photo)
          .then((updatedPhoto) => ({ photo: updatedPhoto }))
          .catch(() => ({ error: COMMENT_ADD_FAILED }));
      });
    },
    () => ({ error: PHOTO_LOAD_FAILED }),
  );
}

/**
 * Build the "usage" summary shown on a user's detail page: their most recent
 * photo and their most commented photo.
 *
 * The selection (sorting/counting) is deliberately performed by the repository
 * queries, so this service only orchestrates them and normalizes a missing
 * photo to null.
 *
 * @param {string} userId
 * @returns {Promise<{recentPhoto: object|null, mostCommentedPhoto: object|null}>}
 */
function getUsage(userId) {
  return Promise.all([
    photoRepo.findMostRecentByUser(userId),
    photoRepo.findMostCommentedByUser(userId),
  ]).then(([recentPhoto, mostCommented]) => ({
    recentPhoto: recentPhoto || null,
    mostCommentedPhoto: mostCommented[0] || null,
  }));
}

/**
 * Build the list of photos that mention the given user, as shown on their
 * detail page. Each entry carries everything the view needs: the photo's id,
 * file name, and upload time, plus the owning user's name (to link back to the
 * owner's profile).
 *
 * @param {string} userId The mentioned user's `_id`.
 * @returns {Promise<Array<{_id: string, file_name: string, date_time: Date,
 *   owner: object}>>} The mentioning photos, newest first.
 */
function getMentionsOfUser(userId) {
  return photoRepo.findPhotosMentioningUser(userId).then((photos) => {
    return photos.map((photo) => {
      const obj = photo.toObject();
      return {
        _id: obj._id,
        file_name: obj.file_name,
        date_time: obj.date_time,
        owner: obj.user_id,
      };
    });
  });
}

module.exports = {
  shapePhotos,
  addComment,
  getUsage,
  getMentionsOfUser,
};
