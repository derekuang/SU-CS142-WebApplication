/**
 * Business rules for authentication and user registration.
 *
 * Services orchestrate the data-access layer (repositories) and own the
 * user-facing error messages, but they never touch `req`/`res`. Controllers
 * translate the returned values into HTTP responses.
 */

const userRepo = require("../models/userRepo.js");
const cs142password = require("../../cs142password.js");

/**
 * Required registration fields, in the order the original endpoint checked
 * them, together with the exact message returned when one is missing.
 * `trim` mirrors the original validation: login name and names are rejected
 * when blank after trimming, while the password is rejected only when empty.
 */
const REQUIRED_REGISTRATION_FIELDS = [
  { name: "login_name", trim: true, message: "A user name is required" },
  { name: "password", trim: false, message: "A password is required" },
  { name: "first_name", trim: true, message: "A first name is required" },
  { name: "last_name", trim: true, message: "A last name is required" },
];

const REGISTRATION_FAILED = "Registration failed. Please try again.";
const USERNAME_TAKEN = "That user name is already taken";

/**
 * Strip the credential fields from a User document before it leaves the
 * server. This is the single place that removes `salt` and `hash`; it
 * deliberately leaves every other field (including `__v` and `login_name`)
 * untouched so each endpoint keeps its own existing response shape.
 *
 * @param {object} user A Mongoose User document.
 * @returns {object} A plain object copy without `salt`/`hash`.
 */
function toSafeUser(user) {
  const safeUser = user.toObject();
  delete safeUser.salt;
  delete safeUser.hash;
  return safeUser;
}

/**
 * Verify a login name and password.
 *
 * @param {string} loginName
 * @param {string} password
 * @returns {Promise<object|null>} The User document when the credentials are
 *   valid, or null when the user does not exist or the password is wrong.
 *   Rejects if the database query fails.
 */
function authenticate(loginName, password) {
  return userRepo.findByLoginName(loginName).then((user) => {
    if (!user) {
      return null;
    }
    if (!cs142password.doesPasswordMatch(user.hash, user.salt, password)) {
      return null;
    }
    return user;
  });
}

/**
 * Return the first validation error message for a registration payload, or
 * null when the required fields are present.
 *
 * @param {object} body The request body.
 * @returns {string|null}
 */
function findRegistrationError(body) {
  for (let i = 0; i < REQUIRED_REGISTRATION_FIELDS.length; i += 1) {
    const rule = REQUIRED_REGISTRATION_FIELDS[i];
    const value = body[rule.name];
    const isMissing =
      typeof value !== "string" ||
      (rule.trim ? value.trim() === "" : value === "");
    if (isMissing) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Register a new user.
 *
 * @param {object} fields The request body (login_name, password, first_name,
 *   last_name, and optional location/description/occupation).
 * @returns {Promise<{user: object}|{error: string}>} `{user}` with the created
 *   User document on success, or `{error}` with the user-facing message on any
 *   validation, duplicate-name, or database failure.
 */
function register(fields) {
  const body = fields || {};

  const validationError = findRegistrationError(body);
  if (validationError) {
    return Promise.resolve({ error: validationError });
  }

  return userRepo
    .existsByLoginName(body.login_name)
    .then((alreadyTaken) => {
      if (alreadyTaken) {
        return { error: USERNAME_TAKEN };
      }

      const passwordEntry = cs142password.makePasswordEntry(body.password);
      return userRepo
        .create({
          login_name: body.login_name,
          salt: passwordEntry.salt,
          hash: passwordEntry.hash,
          first_name: body.first_name,
          last_name: body.last_name,
          location: body.location || "",
          description: body.description || "",
          occupation: body.occupation || "",
        })
        .then((user) => ({ user }));
    })
    .catch(() => ({ error: REGISTRATION_FAILED }));
}

module.exports = {
  toSafeUser,
  authenticate,
  register,
};
