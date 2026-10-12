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
 * Fetch a user's usage summary: their most recent photo and their most
 * commented photo (each with `_id`, `file_name`, and `date_time`; the most
 * commented one also carries `commentCount`).
 *
 * @param {string} id The user's _id.
 * @returns {Promise<{recentPhoto: object|null, mostCommentedPhoto: object|null}>}
 */
export function getUserUsage(id) {
  return axios.get(`/usageOfUser/${id}`).then((response) => response.data);
}

/**
 * Fetch the photos whose comments @mention a user. Each entry has `_id`,
 * `file_name`, `date_time`, and an `owner` ({ _id, first_name, last_name })
 * object for the photo's owner.
 *
 * @param {string} id The mentioned user's _id.
 * @returns {Promise<Array<object>>}
 */
export function getMentionsOfUser(id) {
  return axios.get(`/mentionsOfUser/${id}`).then((response) => response.data);
}

/**
 * Upload a photo for the logged in user. The file is sent as multipart form
 * data under the field name the server expects.
 *
 * The optional `sharedWith` encodes the visibility choice: `undefined` sends no
 * share-list field at all, which the server stores as "visible to everyone",
 * while an array (including an empty one, meaning "only me") is sent as JSON and
 * stored as the photo's share list.
 *
 * @param {File} file The selected image file.
 * @param {Array<string>} [sharedWith] User ids allowed to see the photo, or
 *   undefined for a public photo.
 * @returns {Promise<object>} The created photo.
 */
export function uploadPhoto(file, sharedWith) {
  const formData = new FormData();
  formData.append("uploadedphoto", file);
  if (sharedWith !== undefined) {
    formData.append("shared_with", JSON.stringify(sharedWith));
  }
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
