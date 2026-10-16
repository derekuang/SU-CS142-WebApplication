/**
 * Business rules for a user account's lifecycle beyond registration/login.
 *
 * Right now that means deleting an account: the cascade that removes every
 * trace of the user, as the story requires ("as if the user never existed").
 * It orchestrates the repositories and the filesystem helper, but never touches
 * `req`/`res`; the controller maps the outcome to HTTP.
 *
 * The cascade cannot use a transaction (the app runs against a standalone
 * MongoDB), so it runs the steps in a fixed order and is deliberately
 * idempotent: every step is a `delete`/`$pull` that is safe to repeat, so a
 * failed request that is retried converges. A mid-cascade failure surfaces as a
 * rejected promise (the controller answers 500) rather than being hidden.
 */

const userRepo = require("../models/userRepo.js");
const photoRepo = require("../models/photoRepo.js");
const activityService = require("./activityService.js");
const { removeImage } = require("./photoFiles.js");

/**
 * Permanently delete a user and everything that refers to them.
 *
 * Order matters:
 *   1. read the user's photos (ids for activity cleanup, names for the files);
 *   2. delete those photos (their embedded comments go with them);
 *   3. pull the user's comments from the photos that survive (other people's);
 *   4. drop the user from every `shared_with` visibility list;
 *   5. drop the user from every surviving comment's `mentions`;
 *   6. drop the user's likes from every surviving photo's `likes`;
 *   7. delete the activities the user performed and those on their photos;
 *   8. delete the User document itself (last, so a partial failure is retryable
 *      while the account still exists);
 *   9. remove the image files (best-effort, after the records are gone so a
 *      failed unlink can never leave a document pointing at a missing image).
 *
 * @param {string} userId The account to delete.
 * @returns {Promise<{ok: true}>} Resolves once the cascade completes; rejects
 *   on a database failure so the caller can report it.
 */
function deleteAccount(userId) {
  return photoRepo.findAllByUser(userId).then((photos) => {
    const photoIds = photos.map((photo) => photo._id);
    const fileNames = photos.map((photo) => photo.file_name);

    return photoRepo
      .deleteByUser(userId)
      .then(() => photoRepo.pullCommentsByAuthor(userId))
      .then(() => photoRepo.pullFromSharedWith(userId))
      .then(() => photoRepo.pullMentionsOfUser(userId))
      .then(() => photoRepo.pullLikeByUser(userId))
      .then(() => activityService.removeForUserAndPhotos(userId, photoIds))
      .then(() => userRepo.deleteById(userId))
      .then(() => {
        fileNames.forEach((fileName) => removeImage(fileName));
        return { ok: true };
      });
  });
}

module.exports = {
  deleteAccount,
};
