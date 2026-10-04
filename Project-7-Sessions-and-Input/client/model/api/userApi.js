import axios from "axios";

/**
 * User API (client-side Model).
 *
 * The single place the UI calls the /user endpoints. Each function resolves
 * with the response body and rejects with the original axios error, so callers
 * can surface a message via getErrorMessage.
 */

/**
 * Fetch the list of all users (each with first_name, last_name, _id).
 *
 * @returns {Promise<Array>}
 */
export function listUsers() {
  return axios.get("/user/list").then((response) => response.data);
}

/**
 * Fetch the public profile of a single user.
 *
 * @param {string} id The user's _id.
 * @returns {Promise<object>}
 */
export function getUser(id) {
  return axios.get(`/user/${id}`).then((response) => response.data);
}

/**
 * Register a new user.
 *
 * @param {object} payload Fields for the new user.
 * @returns {Promise<object>} The created user (without credentials).
 */
export function createUser(payload) {
  return axios.post("/user", payload).then((response) => response.data);
}
