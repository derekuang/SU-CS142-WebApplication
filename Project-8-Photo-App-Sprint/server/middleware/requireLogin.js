/**
 * Route guard that rejects the request unless a logged in user is behind it.
 *
 * The session is the only source of identity, so every route that exposes user
 * information is mounted behind this middleware. Besides checking that the
 * session names a user, it verifies that the account still exists: a session can
 * outlive its account (for example another browser's cookie after that account
 * was deleted), and without the check such a stale session would still pass and
 * could create rows referring to a nonexistent user. A stale session is
 * destroyed so the client is forced back to the login screen.
 *
 * Public routes (/, /test/:p1) are deliberately left open: the TopBar fetches
 * /test/info before anyone logs in, and the connectivity checks use it too.
 */

const userRepo = require("../models/userRepo.js");

function requireLogin(request, response, next) {
  const userId = request.session.user_id;
  if (!userId) {
    response.status(401).send("Not logged in");
    return;
  }

  userRepo
    .existsById(userId)
    .then((exists) => {
      if (!exists) {
        // Drop the stale session before answering, so the dead cookie is not
        // reused for a fresh login attempt.
        request.session.destroy(() => {
          response.status(401).send("Not logged in");
        });
        return;
      }
      next();
    })
    .catch((err) => {
      console.log("Error verifying session user:", err);
      response.status(500).send("Unable to verify session");
    });
}

module.exports = requireLogin;
