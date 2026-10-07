import axios from "axios";

/**
 * System API (client-side Model).
 *
 * Wraps the connectivity/info endpoint the TopBar uses to show the schema
 * version. Kept separate from the domain APIs since it is not user or photo
 * data.
 */

/**
 * Fetch the SchemaInfo document (used for its version number).
 *
 * @returns {Promise<object>}
 */
export default function getSchemaInfo() {
  return axios.get("/test/info").then((response) => response.data);
}
