import axios from "axios";

/**
 * Session API (client-side Model).
 *
 * The single place the UI calls the /admin authentication endpoints. Each
 * function resolves with the response body and rejects with the original axios
 * error.
 */

/**
 * Log in with a login name and password.
 *
 * @param {string} loginName
 * @param {string} password
 * @returns {Promise<object>} The logged in user (without credentials).
 */
export function login(loginName, password) {
  return axios
    .post("/admin/login", { login_name: loginName, password })
    .then((response) => response.data);
}

/**
 * Log out the current user by destroying the server session.
 *
 * @returns {Promise<string>} The server's confirmation message.
 */
export function logout() {
  return axios.post("/admin/logout").then((response) => response.data);
}

/**
 * Fetch the currently logged in user from the session, e.g. to restore login
 * state after a page reload.
 *
 * @returns {Promise<object>} The logged in user.
 */
export function currentUser() {
  return axios.get("/admin/currentUser").then((response) => response.data);
}
