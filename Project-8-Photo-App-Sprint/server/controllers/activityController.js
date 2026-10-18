/**
 * Controller for the activity endpoint (list the recent activity feed).
 *
 * Owns HTTP concerns only: reads the request, delegates to the activity
 * service, and maps the result to a status and body.
 */

const activityService = require("../services/activityService.js");

/**
 * GET /activities - Return the most recent activities visible to the logged in
 * user, newest first. The optional `limit` query value overrides the default of
 * 5. A query error is reported as a 400.
 */
function list(request, response) {
  activityService
    .getRecentActivities(request.session.user_id, request.query.limit)
    .then((activities) => {
      response.status(200).send(activities);
    })
    .catch((err) => {
      console.log("Error finding activities:", err);
      response.status(400).send("Unable to load activities");
    });
}

/**
 * GET /activities/byUser - Return every user with their most recent activity
 * visible to the logged in user, newest activity first. Users without a visible
 * activity carry `activity: null`. A query error is reported as a 400.
 */
function listByUser(request, response) {
  activityService
    .getLatestActivityByUser(request.session.user_id)
    .then((entries) => {
      response.status(200).send(entries);
    })
    .catch((err) => {
      console.log("Error finding activities by user:", err);
      response.status(400).send("Unable to load activities");
    });
}

module.exports = {
  list,
  listByUser,
};
