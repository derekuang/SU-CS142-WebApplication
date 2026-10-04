/**
 * Application entry point.
 *
 * This file only wires the server together: it connects to MongoDB, mounts the
 * static file server, session and body parsing middleware, and delegates every
 * URL to the route table in server/routes. The request handling itself lives in
 * server/controllers (HTTP), server/services (business rules), and
 * server/models (database access).
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch
 * any file accessible to the current user in the current directory or any of
 * its children.
 */

const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const express = require("express");
const app = express();

const session = require("express-session");
const bodyParser = require("body-parser");

// The URL routing table (maps each URL to its controller).
const routes = require("./server/routes/index.js");

// XXX - Your submission should work without this line. Comment out or delete
// this line for tests and before submission!
const dbUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/cs142project6";
mongoose.set("strictQuery", false);
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));
app.use(session({secret: "secretKey", resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

// All application URLs are handled by the router.
app.use(routes);

const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
      port +
      " exporting the directory " +
      __dirname,
  );
});
