/**
 * Shared filesystem paths.
 *
 * Both the upload middleware (which writes new photo files) and the photo
 * service (which removes them on deletion) must agree on where images live, so
 * the directory is defined once here instead of as two copies that could drift
 * apart.
 */

const path = require("path");

// This file lives in server/config, so walk back to the project root.
const IMAGES_DIR = path.join(__dirname, "..", "..", "images");

module.exports = { IMAGES_DIR };
