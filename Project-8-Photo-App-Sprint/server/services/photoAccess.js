/**
 * Opening a photo for a write path.
 *
 * Every operation that acts on a photo needs the same things first: the id must
 * be syntactically valid, the photo must exist, and - for everything except
 * deletion - the viewer must be allowed to see it. Doing that inline in each
 * service method duplicated the same block seven times and let the refusal
 * status drift between operations; this module is the one place it happens.
 *
 * Deletion operations deliberately use `openPhoto`: a creator may always
 * withdraw what they wrote, even if the photo has since been restricted away
 * from them. Keeping the two entry points separate makes that distinction
 * visible at the call site instead of hiding it behind a flag.
 */

const mongoose = require("mongoose");

const photoRepo = require("../models/photoRepo.js");
const { isVisible } = require("../models/photoVisibility.js");

const PHOTO_NOT_FOUND = "Photo not found";
const PHOTO_LOAD_FAILED = "Unable to load photo";

/**
 * Load a photo by id, without checking whether the viewer may see it.
 *
 * A malformed id is reported as "not found" rather than letting the cast throw,
 * so every operation answers the same way for a bad id and a missing photo.
 *
 * @param {string} photoId
 * @returns {Promise<{photo: object}|{error: string, status: number}>}
 */
function openPhoto(photoId) {
  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return Promise.resolve({ error: PHOTO_NOT_FOUND, status: 404 });
  }

  return photoRepo.findById(photoId).then(
    (photo) => {
      if (!photo) {
        return { error: PHOTO_NOT_FOUND, status: 404 };
      }
      return { photo };
    },
    () => ({ error: PHOTO_LOAD_FAILED, status: 500 }),
  );
}

/**
 * Load a photo the viewer is allowed to see.
 *
 * A photo the viewer may not see is reported exactly like a missing one, so the
 * routes never reveal whether a restricted photo exists.
 *
 * @param {string} photoId
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {Promise<{photo: object}|{error: string, status: number}>}
 */
function openVisiblePhoto(photoId, viewerId) {
  return openPhoto(photoId).then((result) => {
    if (result.error) {
      return result;
    }
    if (!isVisible(result.photo, viewerId)) {
      return { error: PHOTO_NOT_FOUND, status: 404 };
    }
    return result;
  });
}

module.exports = {
  PHOTO_NOT_FOUND,
  openPhoto,
  openVisiblePhoto,
};
