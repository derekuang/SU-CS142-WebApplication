/**
 * Controller for the comment endpoint (add a comment to a photo).
 *
 * Owns HTTP concerns only: reads the request, delegates the validation and
 * persistence to the photo service, and maps the result to a status/body.
 */

const photoService = require("../services/photoService.js");

/**
 * POST /commentsOfPhoto/:photo_id - Add the logged in user's comment (from the
 * request body's `comment` property) to the given photo. Blank comments and
 * missing photos produce a 400 with the service-provided message.
 */
function addComment(request, response) {
  const photoId = request.params.photo_id;
  const commentText = request.body.comment;

  photoService
    .addComment(photoId, request.session.user_id, commentText)
    .then((result) => {
      if (result.error) {
        response.status(400).send(result.error);
        return;
      }
      response.status(200).send(result.photo);
    })
    .catch(() => {
      response.status(400).send("Unable to add comment");
    });
}

module.exports = {
  addComment,
};
