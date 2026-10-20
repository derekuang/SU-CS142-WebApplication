/**
 * Controllers for the /user endpoints (register, list, detail).
 *
 * Controllers own HTTP concerns only: they read the request, call a service or
 * repository, and translate the result into a status code and body. They
 * contain no database queries of their own.
 */

const authService = require("../services/authService.js");
const userRepo = require("../models/userRepo.js");

/**
 * Field selection for the public user profile returned by GET /user/:id. It
 * hides Mongo internals, the login name, and the credential fields.
 */
const PROFILE_PROJECTION = "-__v -login_name -salt -hash";

/**
 * POST /user - Register a new user. Missing fields, a duplicate login name, or
 * a database error each produce a 400 carrying the user-facing message.
 */
function register(request, response) {
  authService
    .register(request.body)
    .then((result) => {
      if (result.error) {
        response.status(400).send(result.error);
        return;
      }
      response.status(200).send(authService.toSafeUser(result.user));
    })
    .catch(() => {
      response.status(400).send("Registration failed. Please try again.");
    });
}

/**
 * GET /user/list - Return every user with just their name fields.
 */
function list(request, response) {
  userRepo
    .list()
    .then((users) => {
      response.status(200).send(users);
    })
    .catch((err) => {
      console.log("Error finding users:", err);
      response.status(500).send(err);
    });
}

/**
 * GET /user/:id - Return the public profile for User (id). A query error is
 * reported as a 400; a missing user is returned as a null 200 body, matching
 * the original endpoint.
 */
function detail(request, response) {
  const id = request.params.id;

  userRepo
    .findById(id, PROFILE_PROJECTION)
    .then((user) => {
      response.status(200).send(user);
    })
    .catch((err) => {
      console.log("Error finding user:", err);
      response.status(400).send(err);
    });
}

module.exports = {
  register,
  list,
  detail,
};
