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
const activityService = require("./activityService.js");
const { removeImage } = require("./photoFiles.js");
const ACTIVITY_TYPES = require("../models/activityTypes.js");

const COMMENT_REQUIRED = "Comment text is required";
const PHOTO_NOT_FOUND = "Photo not found";
const PHOTO_LOAD_FAILED = "Unable to load photo";
const COMMENT_NOT_FOUND = "Comment not found";
const NOT_PHOTO_OWNER = "Not your photo";
const NOT_COMMENT_OWNER = "Not your comment";
const COMMENT_ADD_FAILED = "Unable to add comment";
const PHOTO_ADD_FAILED = "Unable to add photo";
const INVALID_SHARED_LIST = "Invalid shared list";

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
 * Decide whether a viewer may see a photo.
 *
 * Mirrors the storage three-state: the owner always may; an absent
 * `shared_with` (public) lets anyone; a present list (including an empty one)
 * only lets the owner and the listed users.
 *
 * @param {object} photo A Mongoose Photo document (with `shared_with`).
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {boolean}
 */
function canView(photo, viewerId) {
  if (!photo) {
    return false;
  }
  if (String(photo.user_id) === String(viewerId)) {
    return true;
  }
  if (photo.shared_with === undefined || photo.shared_with === null) {
    return true;
  }
  return photo.shared_with.some((id) => String(id) === String(viewerId));
}

/**
 * Create a photo for a user, applying the upload's visibility choice.
 *
 * `sharedWithRaw` is the raw `shared_with` multipart field. When it is
 * `undefined` the uploader declined to restrict the photo, so it is stored
 * without the field (public). Otherwise it must be a JSON array of user ids;
 * the ids are validated against the User collection (nonexistent ones are
 * dropped, mirroring how @mentions are validated) and stored on the photo, so
 * an empty array means "owner only".
 *
 * @param {object} fields `{ file_name, userId, sharedWithRaw }`.
 * @returns {Promise<{photo: object}|{error: string}>} `{photo}` with the saved
 *   photo on success, or `{error}` with the user-facing message when the shared
 *   list is malformed or the database write fails.
 */
function createPhoto({ file_name, userId, sharedWithRaw }) {
  const base = {
    file_name,
    date_time: new Date(),
    user_id: userId,
    comments: [],
  };

  if (sharedWithRaw === undefined) {
    return photoRepo
      .create(base)
      .then((photo) => {
        activityService.record(ACTIVITY_TYPES.PHOTO_UPLOAD, userId, photo._id);
        return { photo };
      })
      .catch(() => ({ error: PHOTO_ADD_FAILED }));
  }

  let ids;
  try {
    ids = JSON.parse(sharedWithRaw);
  } catch (err) {
    return Promise.resolve({ error: INVALID_SHARED_LIST });
  }
  if (!Array.isArray(ids)) {
    return Promise.resolve({ error: INVALID_SHARED_LIST });
  }

  return userRepo
    .findExistingIds(ids)
    .then((validIds) => photoRepo.create({ ...base, shared_with: validIds }))
    .then((photo) => {
      activityService.record(ACTIVITY_TYPES.PHOTO_UPLOAD, userId, photo._id);
      return { photo };
    })
    .catch(() => ({ error: PHOTO_ADD_FAILED }));
}

/**
 * Add a comment to a photo.
 *
 * Only users who may see the photo are allowed to comment on it; a comment on
 * an unseen photo is reported as "not found" so the photo's existence is not
 * revealed.
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
      if (!canView(photo, userId)) {
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
        // The new subdocument's id lets its ADD_COMMENT activity be deleted
        // precisely if the comment is later removed.
        const commentId = photo.comments[photo.comments.length - 1]._id;
        return photoRepo
          .save(photo)
          .then((updatedPhoto) => {
            activityService.record(
              ACTIVITY_TYPES.ADD_COMMENT,
              userId,
              photoId,
              commentId,
            );
            return { photo: updatedPhoto };
          })
          .catch(() => ({ error: COMMENT_ADD_FAILED }));
      });
    },
    () => ({ error: PHOTO_LOAD_FAILED }),
  );
}

/**
 * Delete a photo the acting user owns.
 *
 * Only the owner may delete a photo. The photo's activity records are removed
 * first, then the document, then the image file (best-effort, so a failed unlink
 * never fails the request). Because the image is removed last, a failure midway
 * leaves at worst an orphaned file - never a database record pointing at a
 * missing image.
 *
 * @param {string} photoId
 * @param {string} userId The acting user's `_id` (must be the owner).
 * @returns {Promise<{ok: true}|{error: string, status: number}>}
 */
function deletePhoto(photoId, userId) {
  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return Promise.resolve({ error: PHOTO_NOT_FOUND, status: 404 });
  }

  return photoRepo.findById(photoId).then(
    (photo) => {
      if (!photo) {
        return { error: PHOTO_NOT_FOUND, status: 404 };
      }
      if (String(photo.user_id) !== String(userId)) {
        return { error: NOT_PHOTO_OWNER, status: 403 };
      }

      const fileName = photo.file_name;
      return activityService
        .removeByPhotoId(photoId)
        .then(() => photoRepo.deleteById(photoId))
        .then(() => {
          removeImage(fileName);
          return { ok: true };
        });
    },
    () => ({ error: PHOTO_LOAD_FAILED, status: 500 }),
  );
}

/**
 * Delete one of the acting user's comments from a photo.
 *
 * Comments are embedded in the photo, so the photo is loaded first: a missing
 * photo (or a malformed id) is reported as "not found" and a missing comment as
 * "comment not found". Only the comment's author may delete it - the photo's
 * owner has no say over other people's comments. Visibility is deliberately not
 * re-checked: a user may always delete a comment they wrote, even if the photo
 * has since been restricted away from them.
 *
 * The comment's activity is removed by its `comment_id`, so the author's other
 * comments on the same photo keep their feed entries.
 *
 * @param {string} photoId
 * @param {string} commentId The comment subdocument's `_id`.
 * @param {string} userId The acting user's `_id` (must be the comment author).
 * @returns {Promise<{ok: true}|{error: string, status: number}>}
 */
function deleteComment(photoId, commentId, userId) {
  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return Promise.resolve({ error: PHOTO_NOT_FOUND, status: 404 });
  }

  return photoRepo.findById(photoId).then(
    (photo) => {
      if (!photo) {
        return { error: PHOTO_NOT_FOUND, status: 404 };
      }
      if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return { error: COMMENT_NOT_FOUND, status: 404 };
      }
      const comment = photo.comments.id(commentId);
      if (!comment) {
        return { error: COMMENT_NOT_FOUND, status: 404 };
      }
      if (String(comment.user_id) !== String(userId)) {
        return { error: NOT_COMMENT_OWNER, status: 403 };
      }

      return activityService
        .removeByCommentId(commentId)
        .then(() => photoRepo.deleteComment(photoId, commentId))
        .then(() => ({ ok: true }));
    },
    () => ({ error: PHOTO_LOAD_FAILED, status: 500 }),
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
 * @param {string} viewerId The logged in user's `_id`; only photos this user may
 *   see are considered, so restricted photos they cannot see never appear in
 *   the summary.
 * @returns {Promise<{recentPhoto: object|null, mostCommentedPhoto: object|null}>}
 */
function getUsage(userId, viewerId) {
  return Promise.all([
    photoRepo.findMostRecentByUser(userId, viewerId),
    photoRepo.findMostCommentedByUser(userId, viewerId),
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
 * @param {string} viewerId The logged in user's `_id`; mentions on photos the
 *   viewer may not see are omitted.
 * @returns {Promise<Array<{_id: string, file_name: string, date_time: Date,
 *   owner: object}>>} The mentioning photos, newest first.
 */
function getMentionsOfUser(userId, viewerId) {
  return photoRepo.findPhotosMentioningUser(userId, viewerId).then((photos) => {
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
  createPhoto,
  addComment,
  deletePhoto,
  deleteComment,
  getUsage,
  getMentionsOfUser,
};
