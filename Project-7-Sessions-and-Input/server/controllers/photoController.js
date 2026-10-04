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
 * GET /photosOfUser/:id - Return every photo of User (id), with comments
 * shaped into the API's `user` form.
 */
function photosOfUser(request, response) {
  const id = request.params.id;

  photoRepo
    .findByUser(id)
    .then((photos) => {
      response.status(200).send(photoService.shapePhotos(photos));
    })
    .catch((err) => {
      console.log("Error finding photos:", err);
      response.status(400).send(err);
    });
}

/**
 * POST /photos/new - Create a photo for the logged in user from the uploaded
 * file. If persisting fails, the already-written file is removed so no
 * orphaned image is left behind.
 */
function addPhoto(request, response) {
  if (!request.file) {
    response.status(400).send("No file uploaded");
    return;
  }

  photoRepo
    .create({
      file_name: request.file.filename,
      date_time: new Date(),
      user_id: request.session.user_id,
      comments: [],
    })
    .then((savedPhoto) => {
      response.status(200).send(savedPhoto);
    })
    .catch((err) => {
      console.log("Error saving photo:", err);
      // The file was already written to disk by multer before this handler
      // ran, so remove it to avoid leaving an orphaned image behind.
      fs.unlink(request.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.log("Error removing orphaned photo file:", unlinkErr);
        }
      });
      response.status(400).send("Unable to add photo");
    });
}

module.exports = {
  photosOfUser,
  addPhoto,
};
