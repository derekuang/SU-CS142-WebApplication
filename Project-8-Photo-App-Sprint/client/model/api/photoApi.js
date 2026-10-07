import axios from "axios";

/**
 * Photo API (client-side Model).
 *
 * The single place the UI calls the /photosOfUser, /photos/new, and
 * /commentsOfPhoto endpoints. Each function resolves with the response body
 * and rejects with the original axios error.
 */

/**
 * Fetch every photo of a user, with comments already shaped for display.
 *
 * @param {string} id The user's _id.
 * @returns {Promise<Array>}
 */
export function getPhotosOfUser(id) {
  return axios.get(`/photosOfUser/${id}`).then((response) => response.data);
}

/**
 * Upload a photo for the logged in user. The file is sent as multipart form
 * data under the field name the server expects.
 *
 * @param {File} file The selected image file.
 * @returns {Promise<object>} The created photo.
 */
export function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("uploadedphoto", file);
  return axios.post("/photos/new", formData).then((response) => response.data);
}

/**
 * Add a comment to a photo.
 *
 * @param {string} photoId The photo's _id.
 * @param {string} text The comment text.
 * @returns {Promise<object>} The updated photo.
 */
export function addComment(photoId, text) {
  return axios
    .post(`/commentsOfPhoto/${photoId}`, { comment: text })
    .then((response) => response.data);
}
