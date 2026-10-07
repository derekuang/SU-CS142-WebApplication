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

const photoStorage = multer.diskStorage({
  // This file lives in server/middleware, so walk back to the project root.
  destination: path.join(__dirname, "..", "..", "images"),
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
