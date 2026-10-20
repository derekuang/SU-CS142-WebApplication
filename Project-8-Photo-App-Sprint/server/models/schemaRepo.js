/**
 * Data-access layer (Model) for the connectivity/status endpoints.
 *
 * Wraps the SchemaInfo document and the collection counts used by /test, so the
 * test controller stays free of Mongoose queries.
 */

const User = require("../../schema/user.js");
const Photo = require("../../schema/photo.js");
const SchemaInfo = require("../../schema/schemaInfo.js");

/**
 * Fetch the single SchemaInfo document.
 *
 * @returns {Promise<object|null>} The SchemaInfo document, or null if missing.
 */
function getInfo() {
  return SchemaInfo.findOne({}).exec();
}

/**
 * Count the documents in each cs142 collection.
 *
 * @returns {Promise<{user: number, photo: number, schemaInfo: number}>}
 */
function counts() {
  return Promise.all([
    User.countDocuments({}),
    Photo.countDocuments({}),
    SchemaInfo.countDocuments({}),
  ]).then((values) => ({
    user: values[0],
    photo: values[1],
    schemaInfo: values[2],
  }));
}

module.exports = {
  getInfo,
  counts,
};
