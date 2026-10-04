/**
 * Data-access layer (Model) for the User collection.
 *
 * Every Mongoose query against users lives here and is exposed as a Promise.
 * Repositories never touch `req`/`res`; controllers and services call these
 * methods so query details stay out of the request-handling code.
 */

const User = require("../../schema/user.js");

/**
 * Find a single user by their login name.
 *
 * @param {string} loginName
 * @returns {Promise<object|null>} The matching User document, or null.
 */
function findByLoginName(loginName) {
  return User.findOne({ login_name: loginName }).exec();
}

/**
 * Find a single user by their Mongo `_id`.
 *
 * @param {string} id
 * @param {string} [projection] Optional Mongoose field selection string, e.g.
 *   "-__v -login_name -salt -hash" for the public profile view. Omitted, the
 *   full document is returned.
 * @returns {Promise<object|null>} The matching User document, or null.
 */
function findById(id, projection) {
  const query = User.findById(id);
  if (projection) {
    query.select(projection);
  }
  return query.exec();
}

/**
 * List every user, exposing only the fields the user list needs.
 *
 * @returns {Promise<Array<object>>} Users with `first_name`, `last_name`, `_id`.
 */
function list() {
  return User.find({}).select("first_name last_name").exec();
}

/**
 * Create a new user.
 *
 * @param {object} userData Fields for the new user (including salt/hash).
 * @returns {Promise<object>} The created User document.
 */
function create(userData) {
  return User.create(userData);
}

/**
 * Check whether a login name is already registered.
 *
 * @param {string} loginName
 * @returns {Promise<boolean>} True if a user already uses the login name.
 */
function existsByLoginName(loginName) {
  return User.exists({ login_name: loginName }).then((doc) => Boolean(doc));
}

module.exports = {
  findByLoginName,
  findById,
  list,
  create,
  existsByLoginName,
};
