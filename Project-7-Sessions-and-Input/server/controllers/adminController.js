/**
 * Controllers for the /admin endpoints (login, logout, session restore).
 *
 * Controllers own HTTP concerns only: they read the request, call a service,
 * and translate the result into a status code and body. They contain no
 * database queries.
 */

const authService = require("../services/authService.js");
const userRepo = require("../models/userRepo.js");

/**
 * POST /admin/login - Authenticate the supplied login_name/password. On success
 * stores the user's _id in the session and returns the user (without
 * credentials).
 */
function login(request, response) {
  const loginName = request.body.login_name;
  const password = request.body.password;

  authService
    .authenticate(loginName, password)
    .then((user) => {
      if (!user) {
        response
          .status(400)
          .send("Invalid user name or password. Please try again.");
        return;
      }

      request.session.user_id = user._id;
      response.status(200).send(authService.toSafeUser(user));
    })
    .catch((err) => {
      console.log("Error finding user:", err);
      response.status(400).send("Login failed. Please try again.");
    });
}

/**
 * POST /admin/logout - Destroy the current session. A request with no logged
 * in user is rejected with a 400.
 */
function logout(request, response) {
  if (!request.session.user_id) {
    response.status(400).send("Not logged in");
    return;
  }

  request.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session:", err);
      response.status(400).send("Logout failed. Please try again.");
      return;
    }
    response.status(200).send("Logged out");
  });
}

/**
 * GET /admin/currentUser - Return the user identified by the session, so the
 * client can restore its login state after a page reload. Assumes
 * `requireLogin` already ensured a session user exists.
 */
function currentUser(request, response) {
  userRepo
    .findById(request.session.user_id)
    .then((user) => {
      if (!user) {
        response.status(401).send("Not logged in");
        return;
      }
      response.status(200).send(authService.toSafeUser(user));
    })
    .catch((err) => {
      console.log("Error finding user:", err);
      response.status(400).send("Unable to load user");
    });
}

module.exports = {
  login,
  logout,
  currentUser,
};
