/**
 * Shared error helper for the client-side API layer.
 *
 * The server returns user-facing error text in the response body. Every axios
 * rejection is turned into a displayable string here so components don't each
 * repeat the `err.response && err.response.data` dance.
 */

/**
 * Extract a displayable message from an axios error.
 *
 * @param {object} error The rejection from an axios call.
 * @param {string} fallback Message to use when the server sent no body.
 * @returns {string} The server-provided message, or the fallback.
 */
export default function getErrorMessage(error, fallback) {
  return (error.response && error.response.data) || fallback;
}
