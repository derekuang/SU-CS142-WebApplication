/**
 * Filesystem helper for stored photo images.
 *
 * Photos live in the project's images directory - the same one multer writes
 * uploads to. Removing a file is deliberately best-effort: once the database
 * record is gone a leftover image is harmless, so a failed unlink is logged
 * rather than thrown (and it must never make a deletion request fail).
 */

const fs = require("fs");
const path = require("path");

// This file lives in server/services, so walk back to the project root.
const IMAGES_DIR = path.join(__dirname, "..", "..", "images");

/**
 * Remove a stored photo file.
 *
 * @param {string} fileName The photo's `file_name`, relative to images/.
 * @returns {void}
 */
function removeImage(fileName) {
  if (!fileName) {
    return;
  }
  fs.unlink(path.join(IMAGES_DIR, fileName), (err) => {
    if (err) {
      console.log("Error removing photo file:", err);
    }
  });
}

module.exports = {
  IMAGES_DIR,
  removeImage,
};
