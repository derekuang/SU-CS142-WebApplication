/**
 * Controllers for the system/connectivity endpoints: the root status message
 * and /test/:p1 (schema info and collection counts).
 *
 * Controllers own HTTP concerns only; the database work lives in schemaRepo.
 */

const path = require("path");

const schemaRepo = require("../models/schemaRepo.js");

// The root status message names the directory the web server exports, which is
// the project root (this file lives two levels down, in server/controllers).
const projectRoot = path.join(__dirname, "..", "..");

/**
 * GET / - Return a text status message. Good for testing that the web server
 * is running.
 */
function root(request, response) {
  response.send("Simple web server of files from " + projectRoot);
}

/**
 * GET /test/:p1 - Return SchemaInfo for `info` and collection counts for
 * `counts`; any other parameter is a 400.
 */
function test(request, response) {
  const param = request.params.p1 || "info";
  console.log("/test called with param1 = ", request.params.p1);

  if (param === "info") {
    schemaRepo
      .getInfo()
      .then((info) => {
        if (!info) {
          // Query didn't return an error but didn't find the SchemaInfo object -
          // This is also an internal error return.
          response.status(500).send("Missing SchemaInfo");
          return;
        }
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(info));
      })
      .catch((err) => {
        console.error("Error in /user/info:", err);
        response.status(500).send(JSON.stringify(err));
      });
  } else if (param === "counts") {
    schemaRepo
      .counts()
      .then((counts) => {
        response.end(JSON.stringify(counts));
      })
      .catch((err) => {
        response.status(500).send(JSON.stringify(err));
      });
  } else {
    // If we don't understand the parameter we return a (Bad Parameter) (400).
    response.status(400).send("Bad param " + param);
  }
}

module.exports = {
  root,
  test,
};
