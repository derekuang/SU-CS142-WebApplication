/**
 * The public JSON shapes of a photo.
 *
 * The wire contract used to be assembled in four different places: the list
 * detail shape, the favorites/mentions summary, the activity thumbnail, and the
 * tag returned by `addTag`. Field lists therefore had no owner, and a rename
 * was a hunt across files. Every shape a client can receive now lives here, so
 * the contract is one file to read and one file to change.
 *
 * The shapes are deliberately different: each carries exactly what its consumer
 * renders. The activity thumbnail, for instance, needs the owner's id for a link
 * but never the owner's name, so it does not pay for a populate.
 */

/**
 * Order photos the way the like-vote story requires: most liked first, and
 * newest first when two photos have the same number of likes. Sorting travels
 * with the shape so the ordering stays part of the API's contract rather than
 * something a client controller has to reimplement.
 *
 * @param {object} a A shaped photo (with `likeCount`/`date_time`).
 * @param {object} b A shaped photo (with `likeCount`/`date_time`).
 * @returns {number}
 */
function byLikesThenNewest(a, b) {
  if (b.likeCount !== a.likeCount) {
    return b.likeCount - a.likeCount;
  }
  return new Date(b.date_time) - new Date(a.date_time);
}

/**
 * Convert one stored tag into the JSON shape the API returns.
 *
 * The raw `user_id` becomes `user` (populated by the repository), the creator
 * id stays private, and `canDelete` tells the client whether to offer the
 * remove control: the photo's owner may remove any tag, and its creator may
 * remove their own.
 *
 * @param {object} tag A stored tag (with `user_id` populated).
 * @param {string} photoOwnerId The photo owner's `_id`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {object} The shaped tag.
 */
function shapeTag(tag, photoOwnerId, viewerId) {
  const { user_id, tagged_by, __v, ...rest } = tag;
  return {
    ...rest,
    user: user_id || null,
    canDelete:
      String(photoOwnerId) === String(viewerId) ||
      (tagged_by !== undefined && String(tagged_by) === String(viewerId)),
  };
}

/**
 * Shape every tag on a photo for the API.
 *
 * @param {Array<object>} tags Stored tags.
 * @param {string} photoOwnerId The photo owner's `_id`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Array<object>} The shaped tags.
 */
function shapeTags(tags, photoOwnerId, viewerId) {
  return (tags || []).map((tag) => shapeTag(tag, photoOwnerId, viewerId));
}

/**
 * Convert Photo documents into the detail shape returned by `/photosOfUser`.
 * Each comment's populated `user_id` reference becomes a `user` property.
 *
 * The stored `likes` array is replaced by the two things the view needs - the
 * count and whether the viewer is one of the likers - and the raw list is
 * dropped, so who-liked-what never leaves the server (the same reason the query
 * strips `shared_with`). The same is done for `favorites`: the raw list is
 * dropped and only the viewer's own membership survives, as
 * `favoritedByViewer` (the favorite button's disabled/indicator state). Each
 * tag is shaped into its public form. The result is ordered by likes then
 * recency.
 *
 * @param {Array<object>} photos Mongoose Photo documents (comments and tags
 *   populated).
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Array<object>} Plain photo objects with `comments[].user`,
 *   `tags[]`, `likeCount`, `likedByViewer`, and `favoritedByViewer`, most liked
 *   first.
 */
function shapePhotoList(photos, viewerId) {
  return photos
    .map((photo) => {
      const photoObj = photo.toObject();
      const likes = photoObj.likes || [];
      delete photoObj.likes;
      photoObj.likeCount = likes.length;
      photoObj.likedByViewer = likes.some(
        (id) => String(id) === String(viewerId),
      );
      const favorites = photoObj.favorites || [];
      delete photoObj.favorites;
      photoObj.favoritedByViewer = favorites.some(
        (id) => String(id) === String(viewerId),
      );
      photoObj.tags = shapeTags(photoObj.tags, photoObj.user_id, viewerId);
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
    })
    .sort(byLikesThenNewest);
}

/**
 * Convert a photo (with its owner populated) into the summary used by the
 * favorites and mentions lists.
 *
 * Each entry carries what those lists render: a link to the photo, its upload
 * time, and the owner's name. The raw favorites/likes arrays and the comments
 * never reach the client because the repository never selects them.
 *
 * @param {object} photo A Photo document with `user_id` populated.
 * @returns {{_id: object, file_name: string, date_time: Date, owner: object}}
 */
function shapePhotoSummary(photo) {
  return {
    _id: photo._id,
    file_name: photo.file_name,
    date_time: photo.date_time,
    owner: photo.user_id,
  };
}

/**
 * Convert a joined photo into the thumbnail used by the activity feed and the
 * sidebar summary.
 *
 * The owner is kept as an id: the client builds the photo link from it and
 * never renders the owner's name here, so the query does not populate it.
 *
 * @param {object|null|undefined} photo A photo row, or a missing one.
 * @returns {{_id: object, file_name: string, user_id: object}|null}
 */
function shapeActivityPhoto(photo) {
  if (!photo) {
    return null;
  }
  return {
    _id: photo._id,
    file_name: photo.file_name,
    user_id: photo.user_id,
  };
}

/**
 * Convert the photo a usage summary points at.
 *
 * Both usage entries carry the same three fields. The most-commented entry also
 * carries `commentCount`; on the recent entry the value is `undefined`, which
 * JSON omits, so one shape serves both without a second function.
 *
 * @param {object} photo A projected Photo document or aggregation row.
 * @returns {{_id: object, file_name: string, date_time: Date,
 *   commentCount: (number|undefined)}}
 */
function shapeUsagePhoto(photo) {
  return {
    _id: photo._id,
    file_name: photo.file_name,
    date_time: photo.date_time,
    commentCount: photo.commentCount,
  };
}

module.exports = {
  shapeActivityPhoto,
  shapePhotoList,
  shapePhotoSummary,
  shapeTag,
  shapeUsagePhoto,
};
