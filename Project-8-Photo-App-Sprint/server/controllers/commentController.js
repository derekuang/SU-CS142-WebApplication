/**
 * Controller for the comment endpoint (add a comment to a photo).
 *
 * Owns HTTP concerns only: reads the request, delegates the validation and
 * persistence to the photo service, and maps the result to a status/body.
 */

const photoService = require("../services/photoService.js");

/**
 * POST /commentsOfPhoto/:photo_id - Add the logged in user's comment (from the
 * request body's `comment` property) to the given photo. A blank comment is a
 * 400; a missing or invisible photo is the 404 the access gate reports, and a
 * load failure is a 500.
 */
function addComment(request, response) {
  const photoId = request.params.photo_id;
  const commentText = request.body.comment;

  photoService
    .addComment(photoId, request.session.user_id, commentText)
    .then((result) => {
      if (result.error) {
        response.status(result.status || 400).send(result.error);
        return;
      }
      response.status(200).send(result.photo);
    })
    .catch(() => {
      response.status(400).send("Unable to add comment");
    });
}

/**
 * DELETE /commentsOfPhoto/:photo_id/:comment_id - Permanently delete one of the
 * logged in user's comments. The service reports a missing photo or comment as
 * 404 and someone else's comment as 403.
 */
function deleteComment(request, response) {
  const photoId = request.params.photo_id;
  const commentId = request.params.comment_id;

  photoService
    .deleteComment(photoId, commentId, request.session.user_id)
    .then((result) => {
      if (result.error) {
        response.status(result.status || 400).send(result.error);
        return;
      }
      response.status(200).send({ status: "ok" });
    })
    .catch((err) => {
      console.log("Error deleting comment:", err);
      response.status(500).send("Unable to delete comment");
    });
}

module.exports = {
  addComment,
  deleteComment,
};
