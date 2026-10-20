/**
 * Multer configuration for photo uploads.
 *
 * Uploaded files are written into the project's images directory under a
 * freshly generated unique name so that an upload never overwrites the seeded
 * photos or a previous upload.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const { IMAGES_DIR } = require("../config/paths.js");

const photoStorage = multer.diskStorage({
  destination: IMAGES_DIR,
  filename: function (request, file, callback) {
    // Keep the client-supplied name in the stored file name so the uploader can
    // recognize the photo it just sent, but sanitize it and prefix a unique
    // token so two uploads with the same name never collide and no path
    // separators can escape the images directory.
    const originalName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName =
      Date.now() +
      "-" +
      crypto.randomBytes(8).toString("hex") +
      "-" +
      originalName;
    callback(null, uniqueName);
  },
});

const uploadPhoto = multer({ storage: photoStorage });

module.exports = uploadPhoto;
