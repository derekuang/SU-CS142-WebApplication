/**
 * Route guard that rejects the request unless a user is logged in.
 *
 * The session is the only source of identity, so every route that exposes user
 * information is mounted behind this middleware. Public routes (/, /test/:p1)
 * are deliberately left open: the TopBar fetches /test/info before anyone logs
 * in, and the connectivity checks use it too.
 */
function requireLogin(request, response, next) {
  if (!request.session.user_id) {
    response.status(401).send("Not logged in");
    return;
  }
  next();
}

module.exports = requireLogin;
