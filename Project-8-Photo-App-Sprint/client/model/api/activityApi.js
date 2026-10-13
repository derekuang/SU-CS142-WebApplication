import axios from "axios";

/**
 * Activity API (client-side Model).
 *
 * The single place the UI calls the /activities endpoint. Resolves with the
 * response body and rejects with the original axios error so callers can
 * surface a message via getErrorMessage.
 */

/**
 * Fetch the most recent activities, newest first.
 *
 * @param {number} [limit] Optional maximum number of activities to return
 *   (the server defaults to 5).
 * @returns {Promise<Array<object>>} Each item has `_id`, `type`, `date_time`,
 *   `user` ({ _id, first_name, last_name } | null), and `photo`
 *   ({ _id, file_name, user_id } | null).
 */
export default function getActivities(limit) {
  return axios
    .get("/activities", { params: limit ? { limit } : undefined })
    .then((response) => response.data);
}
