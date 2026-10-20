/**
 * Business rules for photos and their comments.
 *
 * Orchestrates the photo repository and the access gate, and owns comment and
 * tag validation, but never touches `req`/`res`. The public wire shapes live in
 * `photoShapes`; controllers map the returned values to HTTP responses.
 */

const mongoose = require("mongoose");

const { parseMentions } = require("../../shared/mentionToken.js");

const photoRepo = require("../models/photoRepo.js");
const userRepo = require("../models/userRepo.js");
const {
  shapePhotoList,
  shapePhotoSummary,
  shapeTag,
  shapeUsagePhoto,
} = require("../models/photoShapes.js");
const activityService = require("./activityService.js");
const {
  PHOTO_NOT_FOUND,
  openPhoto,
  openVisiblePhoto,
} = require("./photoAccess.js");
const { removeImage } = require("./photoFiles.js");
const ACTIVITY_TYPES = require("../models/activityTypes.js");

const COMMENT_REQUIRED = "Comment text is required";
const COMMENT_NOT_FOUND = "Comment not found";
const NOT_PHOTO_OWNER = "Not your photo";
const NOT_COMMENT_OWNER = "Not your comment";
const COMMENT_ADD_FAILED = "Unable to add comment";
const PHOTO_ADD_FAILED = "Unable to add photo";
const INVALID_SHARED_LIST = "Invalid shared list";
const LIKE_FAILED = "Unable to update like";
const FAVORITE_FAILED = "Unable to update favorite";
const TAG_INVALID_COORDINATES = "Invalid tag coordinates";
const TAG_TOO_SMALL = "Tag area is too small";
const TAG_USER_NOT_FOUND = "Tagged user not found";
const TAG_NOT_FOUND = "Tag not found";
const NOT_TAG_OWNER = "Not your tag";
const TAG_ADD_FAILED = "Unable to add tag";
const TAG_DELETE_FAILED = "Unable to delete tag";

/**
 * Smallest allowed tag rectangle, as a fraction of the photo's width/height.
 * The client discards a drag smaller than this and the server rejects one, so
 * a tiny accidental drag can never become a tag.
 */
const MIN_TAG_SIZE = 0.02;

/**
 * Extract the (possibly duplicated) user ids encoded in a comment's mention
 * markup.
 *
 * The token grammar is shared with the client (`shared/mentionToken.js`); this
 * function owns the data rule: an id is kept only when it is a syntactically
 * valid ObjectId, so a malformed token is skipped instead of being cast later
 * and a bad mention can never make a query throw. The result is de-duplicated.
 * Existence is checked separately against the User collection.
 *
 * @param {string} text The raw comment text (with mention markup).
 * @returns {Array<string>} Distinct, syntactically valid mentioned user ids.
 */
function extractMentionIds(text) {
  const ids = new Set();
  parseMentions(text)
    .filter((segment) => segment.type === "mention")
    .forEach((segment) => {
      if (mongoose.Types.ObjectId.isValid(segment.id)) {
        ids.add(segment.id);
      }
    });
  return Array.from(ids);
}

/**
 * Clamp a number into an inclusive range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Round a coordinate to the four decimals stored in the database. Fractions of
 * a photo do not need more precision, and rounding keeps the JSON compact.
 *
 * @param {number} value
 * @returns {number}
 */
function roundCoordinate(value) {
  return Math.round(value * 10000) / 10000;
}

/**
 * Parse one rectangle coordinate. Missing/blank values become NaN so the
 * caller's `Number.isFinite` check rejects them; numeric strings are accepted
 * because form encodings may turn numbers into strings.
 *
 * @param {*} value
 * @returns {number}
 */
function parseCoordinate(value) {
  if (value === undefined || value === null) {
    return NaN;
  }
  if (typeof value === "string" && value.trim() === "") {
    return NaN;
  }
  return Number(value);
}

/**
 * Validate and normalize a tag rectangle.
 *
 * Coordinates are fractions of the photo's own dimensions. A rectangle that
 * extends past an edge is clipped to the image, as the story requires; a
 * rectangle that is too small after clipping is rejected. Values are accepted
 * as numbers or numeric strings (a JSON body normally provides numbers).
 *
 * @param {object} rect `{ x, y, width, height }` from the request body.
 * @returns {{rect: object}|{error: string}} The clipped rectangle on success,
 *   or the user-facing validation message.
 */
function normalizeRect(rect) {
  const source = rect || {};
  const x = parseCoordinate(source.x);
  const y = parseCoordinate(source.y);
  const width = parseCoordinate(source.width);
  const height = parseCoordinate(source.height);

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { error: TAG_INVALID_COORDINATES };
  }

  const x1 = roundCoordinate(clamp(x, 0, 1));
  const y1 = roundCoordinate(clamp(y, 0, 1));
  const x2 = clamp(x + width, 0, 1);
  const y2 = clamp(y + height, 0, 1);
  const clippedWidth = roundCoordinate(Math.min(x2 - x1, 1 - x1));
  const clippedHeight = roundCoordinate(Math.min(y2 - y1, 1 - y1));

  if (clippedWidth < MIN_TAG_SIZE || clippedHeight < MIN_TAG_SIZE) {
    return { error: TAG_TOO_SMALL };
  }

  return {
    rect: {
      x: x1,
      y: y1,
      width: clippedWidth,
      height: clippedHeight,
    },
  };
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
 * @returns {Promise<{photo: object}|{error: string, status?: number}>} `{photo}`
 *   with the saved photo on success, or `{error}` with the user-facing message
 *   on a blank comment, a missing photo, or a database failure. Any valid
 *   mentions encoded in `rawText` are stored on the new comment; mentions of
 *   nonexistent users are silently dropped.
 */
function addComment(photoId, userId, rawText) {
  if (!rawText || rawText.trim() === "") {
    return Promise.resolve({ error: COMMENT_REQUIRED });
  }

  const mentionedIds = extractMentionIds(rawText);

  return openVisiblePhoto(photoId, userId).then((result) => {
    if (result.error) {
      return result;
    }
    const photo = result.photo;

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
  });
}

/**
 * Like or unlike a photo on behalf of a user.
 *
 * Only users who may see the photo can like it; an unseen, nonexistent, or
 * malformed photo is reported as "not found" so the photo's existence is not
 * revealed. Both directions are idempotent at the repository level, so a double
 * click can neither double count nor error. A like records a LIKE activity for
 * the feed; an unlike removes that same activity again (best-effort, like every
 * activity write) so the feed never claims a photo is liked after it is not.
 *
 * @param {string} photoId
 * @param {string} userId The logged in user's `_id`.
 * @param {boolean} liked True to like, false to unlike.
 * @returns {Promise<{likeCount: number, likedByViewer: boolean}|{error: string,
 *   status: number}>} `{likeCount, likedByViewer}` on success.
 */
function setLike(photoId, userId, liked) {
  return openVisiblePhoto(photoId, userId).then((result) => {
    if (result.error) {
      return result;
    }

    const update = liked
      ? photoRepo.likePhoto(photoId, userId)
      : photoRepo.unlikePhoto(photoId, userId);

    return update
      .then((updated) => {
        if (liked) {
          activityService.record(ACTIVITY_TYPES.LIKE, userId, photoId);
        } else {
          activityService.removeLike(userId, photoId);
        }
        const likes = (updated && updated.likes) || [];
        return {
          likeCount: likes.length,
          likedByViewer: likes.some((id) => String(id) === String(userId)),
        };
      })
      .catch(() => ({ error: LIKE_FAILED, status: 500 }));
  });
}

/**
 * Add or remove a photo from a user's favorites.
 *
 * The favorite gate mirrors likes: only users who may see the photo can
 * favorite it, and an unseen, nonexistent, or malformed photo is reported as
 * "not found" so its existence is not revealed. Both directions are idempotent
 * at the repository level, so a double click can neither duplicate nor error.
 * Unlike a like, favoriting is deliberately silent - it does not touch the
 * activity feed, which is defined by its own story.
 *
 * @param {string} photoId
 * @param {string} userId The logged in user's `_id`.
 * @param {boolean} favorited True to favorite, false to unfavorite.
 * @returns {Promise<{favoritedByViewer: boolean}|{error: string, status:
 *   number}>} `{favoritedByViewer}` on success.
 */
function setFavorite(photoId, userId, favorited) {
  return openVisiblePhoto(photoId, userId).then((result) => {
    if (result.error) {
      return result;
    }

    const update = favorited
      ? photoRepo.favoritePhoto(photoId, userId)
      : photoRepo.unfavoritePhoto(photoId, userId);

    return update
      .then((updated) => {
        const favorites = (updated && updated.favorites) || [];
        return {
          favoritedByViewer: favorites.some(
            (id) => String(id) === String(userId),
          ),
        };
      })
      .catch(() => ({ error: FAVORITE_FAILED, status: 500 }));
  });
}

/**
 * Add a tag to a photo on behalf of a viewer.
 *
 * Any logged in user who may see the photo can tag a registered user in it.
 * The rectangle is clipped to the image and must be at least `MIN_TAG_SIZE` of
 * the photo in both dimensions. An unseen or nonexistent photo is reported as
 * "not found" so its existence is not revealed. Tagging is deliberately silent
 * in the activity feed, which is defined by its own story.
 *
 * @param {string} photoId
 * @param {string} userId The logged in user's `_id` (the tag creator).
 * @param {object} tagData `{ user_id, x, y, width, height }` from the body.
 * @returns {Promise<{tag: object}|{error: string, status: number}>} The shaped
 *   created tag, or a user-facing error with its HTTP status.
 */
function addTag(photoId, userId, tagData) {
  return openVisiblePhoto(photoId, userId).then((result) => {
    if (result.error) {
      return result;
    }
    const photoOwnerId = result.photo.user_id;

    const normalized = normalizeRect(tagData);
    if (normalized.error) {
      return { error: normalized.error, status: 400 };
    }

    const taggedUserId = tagData && tagData.user_id;
    if (!mongoose.Types.ObjectId.isValid(taggedUserId)) {
      return { error: TAG_USER_NOT_FOUND, status: 400 };
    }

    return userRepo.findById(taggedUserId, "first_name last_name").then(
      (taggedUser) => {
        if (!taggedUser) {
          return { error: TAG_USER_NOT_FOUND, status: 400 };
        }

        const tagId = new mongoose.Types.ObjectId();
        const dateTime = new Date();
        const tag = {
          _id: tagId,
          user_id: mongoose.Types.ObjectId(taggedUserId),
          tagged_by: mongoose.Types.ObjectId(userId),
          x: normalized.rect.x,
          y: normalized.rect.y,
          width: normalized.rect.width,
          height: normalized.rect.height,
          date_time: dateTime,
        };

        return photoRepo.addTag(photoId, tag).then(
          (updateResult) => {
            if (!updateResult || updateResult.matchedCount === 0) {
              return { error: PHOTO_NOT_FOUND, status: 404 };
            }
            return {
              tag: shapeTag({ ...tag, user_id: taggedUser }, photoOwnerId, userId),
            };
          },
          () => ({ error: TAG_ADD_FAILED, status: 500 }),
        );
      },
      () => ({ error: TAG_USER_NOT_FOUND, status: 400 }),
    );
  });
}

/**
 * Remove a tag from a photo.
 *
 * The photo's owner may remove any tag on their photo; a tag's creator may
 * remove their own tag. The tagged user is deliberately not granted this
 * ability. Visibility is not re-checked, mirroring comment deletion: a creator
 * can always withdraw a tag they added, even if the photo was later restricted
 * away from them.
 *
 * @param {string} photoId
 * @param {string} tagId The tag subdocument's `_id`.
 * @param {string} userId The acting user's `_id`.
 * @returns {Promise<{ok: true}|{error: string, status: number}>}
 */
function deleteTag(photoId, tagId, userId) {
  return openPhoto(photoId).then((result) => {
    if (result.error) {
      return result;
    }
    const photo = result.photo;

    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      return { error: TAG_NOT_FOUND, status: 404 };
    }

    const tag = photo.tags ? photo.tags.id(tagId) : null;
    if (!tag) {
      return { error: TAG_NOT_FOUND, status: 404 };
    }

    const isOwner = String(photo.user_id) === String(userId);
    const isCreator =
      tag.tagged_by !== undefined &&
      tag.tagged_by !== null &&
      String(tag.tagged_by) === String(userId);
    if (!isOwner && !isCreator) {
      return { error: NOT_TAG_OWNER, status: 403 };
    }

    return photoRepo.deleteTag(photoId, tagId).then(
      () => ({ ok: true }),
      () => ({ error: TAG_DELETE_FAILED, status: 500 }),
    );
  });
}

/**
 * Fetch a user's photos the viewer may see, in the detail shape the photos view
 * renders.
 *
 * The repository selects and visibility-filters; the shape module owns the wire
 * contract, so this method is only the join between them.
 *
 * @param {string} userId The photo owner's `_id`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<Array<object>>} The shaped photos, most liked first.
 */
function getPhotosOfUser(userId, viewerId) {
  return photoRepo
    .findByUser(userId, viewerId)
    .then((photos) => shapePhotoList(photos, viewerId));
}

/**
 * Build the logged in user's favorites list for the favorites page.
 *
 * Each entry is the shared photo summary: id, file name, upload time, and the
 * owner's name. The photo rows are selected and visibility-filtered by the
 * repository, so a favorited photo the viewer may no longer see is omitted.
 *
 * @param {string} userId The logged in user's `_id`.
 * @returns {Promise<Array<{_id: string, file_name: string, date_time: Date,
 *   owner: object}>>} The favorited photos, newest first.
 */
function getFavorites(userId) {
  return photoRepo.findFavoritesByUser(userId).then((photos) => {
    return photos.map(shapePhotoSummary);
  });
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
  return openPhoto(photoId).then((result) => {
    if (result.error) {
      return result;
    }
    const photo = result.photo;

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
  });
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
  return openPhoto(photoId).then((result) => {
    if (result.error) {
      return result;
    }
    const photo = result.photo;

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
  });
}

/**
 * Build the "usage" summary shown on a user's detail page: their most recent
 * photo and their most commented photo.
 *
 * The selection (sorting/counting) is deliberately performed by the repository
 * queries, so this service only orchestrates them, shapes each entry, and
 * normalizes a missing photo to null.
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
    recentPhoto: recentPhoto ? shapeUsagePhoto(recentPhoto) : null,
    mostCommentedPhoto: mostCommented[0]
      ? shapeUsagePhoto(mostCommented[0])
      : null,
  }));
}

/**
 * Build the list of photos that mention the given user, as shown on their
 * detail page. Each entry is the shared photo summary: id, file name, upload
 * time, and the owner's name.
 *
 * @param {string} userId The mentioned user's `_id`.
 * @param {string} viewerId The logged in user's `_id`; mentions on photos the
 *   viewer may not see are omitted.
 * @returns {Promise<Array<{_id: string, file_name: string, date_time: Date,
 *   owner: object}>>} The mentioning photos, newest first.
 */
function getMentionsOfUser(userId, viewerId) {
  return photoRepo.findPhotosMentioningUser(userId, viewerId).then((photos) => {
    return photos.map(shapePhotoSummary);
  });
}

module.exports = {
  getPhotosOfUser,
  createPhoto,
  addComment,
  setLike,
  setFavorite,
  addTag,
  deleteTag,
  deletePhoto,
  deleteComment,
  getUsage,
  getMentionsOfUser,
  getFavorites,
};
