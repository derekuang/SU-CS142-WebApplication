/**
 * Business rules for photos and their comments.
 *
 * Owns response shaping and comment validation, orchestrating the photo
 * repository, but never touches `req`/`res`. Controllers map the returned
 * values to HTTP responses.
 */

const photoRepo = require("../models/photoRepo.js");

const COMMENT_REQUIRED = "Comment text is required";
const PHOTO_NOT_FOUND = "Photo not found";
const PHOTO_LOAD_FAILED = "Unable to load photo";
const COMMENT_ADD_FAILED = "Unable to add comment";

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
 *   or blank comment, a missing photo, or a database failure.
 */
function addComment(photoId, userId, rawText) {
  if (!rawText || rawText.trim() === "") {
    return Promise.resolve({ error: COMMENT_REQUIRED });
  }

  return photoRepo.findById(photoId).then(
    (photo) => {
      if (!photo) {
        return { error: PHOTO_NOT_FOUND };
      }

      photo.comments.push({
        comment: rawText.trim(),
        user_id: userId,
      });
      return photoRepo
        .save(photo)
        .then((updatedPhoto) => ({ photo: updatedPhoto }))
        .catch(() => ({ error: COMMENT_ADD_FAILED }));
    },
    () => ({ error: PHOTO_LOAD_FAILED }),
  );
}

module.exports = {
  shapePhotos,
  addComment,
};
