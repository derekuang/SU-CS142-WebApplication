/**
 * Controllers for the photo endpoints (list a user's photos, upload a photo).
 *
 * Controllers own HTTP concerns only: they read the request, call a service or
 * repository, and translate the result into a status code and body. The multer
 * upload middleware that populates `request.file` is attached in the routes.
 */

const fs = require("fs");

const photoRepo = require("../models/photoRepo.js");
const photoService = require("../services/photoService.js");

/**
 * GET /photosOfUser/:id - Return the photos of User (id) the logged in user is
 * allowed to see, with comments shaped into the API's `user` form. Visibility
 * is filtered here, in the query, rather than in the client.
 */
function photosOfUser(request, response) {
  const id = request.params.id;

  photoRepo
    .findByUser(id, request.session.user_id)
    .then((photos) => {
      response
        .status(200)
        .send(photoService.shapePhotos(photos, request.session.user_id));
    })
    .catch((err) => {
      console.log("Error finding photos:", err);
      response.status(400).send(err);
    });
}

/**
 * POST /photos/new - Create a photo for the logged in user from the uploaded
 * file, applying the optional share list from the `shared_with` form field.
 *
 * If persisting fails (or the share list is malformed), the already-written
 * file is removed so no orphaned image is left behind.
 */
function addPhoto(request, response) {
  if (!request.file) {
    response.status(400).send("No file uploaded");
    return;
  }

  photoService
    .createPhoto({
      file_name: request.file.filename,
      userId: request.session.user_id,
      sharedWithRaw: request.body.shared_with,
    })
    .then((result) => {
      if (result.error) {
        // The file was already written to disk by multer before this handler
        // ran, so remove it to avoid leaving an orphaned image behind.
        fs.unlink(request.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.log("Error removing orphaned photo file:", unlinkErr);
          }
        });
        response.status(400).send(result.error);
        return;
      }
      response.status(200).send(result.photo);
    })
    .catch((err) => {
      console.log("Error saving photo:", err);
      fs.unlink(request.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.log("Error removing orphaned photo file:", unlinkErr);
        }
      });
      response.status(400).send("Unable to add photo");
    });
}

/**
 * GET /usageOfUser/:id - Return the user's usage summary: their most recent
 * photo and their most commented photo, as shaped by the photo service.
 */
function getUsage(request, response) {
  const id = request.params.id;

  photoService
    .getUsage(id, request.session.user_id)
    .then((usage) => {
      response.status(200).send(usage);
    })
    .catch((err) => {
      console.log("Error finding photo usage:", err);
      response.status(400).send(err);
    });
}

/**
 * GET /mentionsOfUser/:id - Return the photos whose comments @mention the
 * given user, as shaped by the photo service.
 */
function getMentions(request, response) {
  const id = request.params.id;

  photoService
    .getMentionsOfUser(id, request.session.user_id)
    .then((mentions) => {
      response.status(200).send(mentions);
    })
    .catch((err) => {
      console.log("Error finding mentioned photos:", err);
      response.status(400).send(err);
    });
}

/**
 * DELETE /photos/:photo_id - Permanently delete one of the logged in user's
 * photos (with its comments, activity records, and image file). The service
 * reports a missing photo as 404 and someone else's photo as 403.
 */
function deletePhoto(request, response) {
  photoService
    .deletePhoto(request.params.photo_id, request.session.user_id)
    .then((result) => {
      if (result.error) {
        response.status(result.status || 400).send(result.error);
        return;
      }
      response.status(200).send({ status: "ok" });
    })
    .catch((err) => {
      console.log("Error deleting photo:", err);
      response.status(500).send("Unable to delete photo");
    });
}

/**
 * Translate a `photoService.setLike` result into an HTTP response.
 *
 * @param {object} response
 * @param {{likeCount: number, likedByViewer: boolean}|{error: string,
 *   status: number}} result
 */
function sendLikeResult(response, result) {
  if (result.error) {
    response.status(result.status || 400).send(result.error);
    return;
  }
  response.status(200).send(result);
}

/**
 * POST /likesOfPhoto/:photo_id - Like a photo the logged in user may see.
 * Idempotent, and reports the photo's new like count plus the viewer's state.
 * A missing/unseen/malformed photo is reported as 404.
 */
function likePhoto(request, response) {
  photoService
    .setLike(request.params.photo_id, request.session.user_id, true)
    .then((result) => sendLikeResult(response, result))
    .catch((err) => {
      console.log("Error liking photo:", err);
      response.status(500).send("Unable to update like");
    });
}

/**
 * DELETE /likesOfPhoto/:photo_id - Take back the logged in user's like on a
 * photo. Idempotent (unliking a photo that was never liked is fine). A
 * missing/unseen/malformed photo is reported as 404.
 */
function unlikePhoto(request, response) {
  photoService
    .setLike(request.params.photo_id, request.session.user_id, false)
    .then((result) => sendLikeResult(response, result))
    .catch((err) => {
      console.log("Error unliking photo:", err);
      response.status(500).send("Unable to update like");
    });
}

/**
 * Translate a `photoService.setFavorite` result into an HTTP response.
 *
 * @param {object} response
 * @param {{favoritedByViewer: boolean}|{error: string, status: number}} result
 */
function sendFavoriteResult(response, result) {
  if (result.error) {
    response.status(result.status || 400).send(result.error);
    return;
  }
  response.status(200).send(result);
}

/**
 * POST /photos/:photo_id/favorite - Add a photo to the logged in user's
 * favorites. Idempotent, and reports the viewer's new favorite state. A
 * missing/unseen/malformed photo is reported as 404.
 */
function favoritePhoto(request, response) {
  photoService
    .setFavorite(request.params.photo_id, request.session.user_id, true)
    .then((result) => sendFavoriteResult(response, result))
    .catch((err) => {
      console.log("Error favoriting photo:", err);
      response.status(500).send("Unable to update favorite");
    });
}

/**
 * DELETE /photos/:photo_id/favorite - Remove a photo from the logged in user's
 * favorites. Idempotent (removing a favorite that was never added is fine). A
 * missing/unseen/malformed photo is reported as 404.
 */
function unfavoritePhoto(request, response) {
  photoService
    .setFavorite(request.params.photo_id, request.session.user_id, false)
    .then((result) => sendFavoriteResult(response, result))
    .catch((err) => {
      console.log("Error unfavoriting photo:", err);
      response.status(500).send("Unable to update favorite");
    });
}

/**
 * GET /favorites - Return the logged in user's favorites list (thumbnail file
 * name, upload time, and owner), newest first.
 */
function getFavorites(request, response) {
  photoService
    .getFavorites(request.session.user_id)
    .then((favorites) => {
      response.status(200).send(favorites);
    })
    .catch((err) => {
      console.log("Error finding favorites:", err);
      response.status(400).send(err);
    });
}

module.exports = {
  photosOfUser,
  addPhoto,
  getUsage,
  getMentions,
  deletePhoto,
  likePhoto,
  unlikePhoto,
  favoritePhoto,
  unfavoritePhoto,
  getFavorites,
};
