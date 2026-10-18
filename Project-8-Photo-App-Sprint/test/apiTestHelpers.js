"use strict";

/**
 * Shared helpers for the CS142 Project 8 server API test suites.
 *
 * Keeping the HTTP plumbing (URLs, sessions, multipart uploads, cleanup calls)
 * and the common assertions here means each suite only contains the behaviour
 * it is actually testing.
 */

const assert = require("assert");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const _ = require("lodash");

const port = 3000;
const host = "127.0.0.1";

function makeFullUrl(url) {
  return "http://" + host + ":" + port + url;
}

function authHeaders(cookie) {
  return cookie ? { Cookie: cookie } : {};
}

function assertEqualDates(d1, d2, message) {
  const label = message || "date_time";
  assert.strictEqual(
    new Date(d1).valueOf(),
    new Date(d2).valueOf(),
    label + ": expected " + d1 + " to equal " + d2
  );
}

/**
 * Fail when an API object carries fields beyond the documented shape, so a
 * response can never silently start leaking internal document fields.
 */
function assertAllowedProperties(object, allowedProperties, label) {
  const extraProperties = _.difference(
    Object.keys(object),
    allowedProperties
  );
  assert.strictEqual(
    extraProperties.length,
    0,
    label + " has extra properties: " + extraProperties
  );
}

/**
 * Log in and return the session cookie plus the user the server returned.
 * Seeded users all use the password "weak"; pass a password for registered
 * throwaway users.
 */
async function login(loginName, password) {
  const response = await axios.post(makeFullUrl("/admin/login"), {
    login_name: loginName,
    password: password === undefined ? "weak" : password,
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");

  const cookie =
    response.headers["set-cookie"] && response.headers["set-cookie"][0];
  assert.ok(cookie, "Session cookie found for " + loginName);
  return { cookie: cookie, user: response.data };
}

async function getJson(path, cookie) {
  const response = await axios.get(makeFullUrl(path), {
    headers: authHeaders(cookie),
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");
  return response.data;
}

/**
 * Issue a GET without asserting the status. Used by tests that expect an error
 * response (for example a 401 or 400).
 */
function getResponse(path, cookie) {
  return axios.get(makeFullUrl(path), { headers: authHeaders(cookie) });
}

/**
 * Issue a POST without asserting the status, for tests that expect an error.
 */
function postResponse(path, body, cookie) {
  return axios.post(makeFullUrl(path), body, {
    headers: authHeaders(cookie),
  });
}

/**
 * Issue a DELETE without asserting the status, for expected-error tests and for
 * undoing likes/favorites during cleanup.
 */
function deleteResponse(path, cookie) {
  return axios.delete(makeFullUrl(path), { headers: authHeaders(cookie) });
}

async function postJson(path, body, cookie) {
  const response = await axios.post(makeFullUrl(path), body, {
    headers: authHeaders(cookie),
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");
  return response.data;
}

/**
 * Upload testPhoto.jpg. `options.sharedWith` is the optional visibility list
 * (omitted means public); `options.sharedWithRaw` sends an unparsed value for
 * invalid-list tests; `options.filename` is the client-supplied name.
 */
async function uploadPhoto(cookie, options) {
  const settings = options || {};
  const filename =
    settings.filename || "p" + String(new Date().valueOf()) + ".jpg";

  const form = new FormData();
  form.append(
    "uploadedphoto",
    fs.createReadStream(__dirname + "/testPhoto.jpg"),
    {
      filename: filename,
      contentType: "image/jpg",
    }
  );
  if (settings.sharedWithRaw !== undefined) {
    form.append("shared_with", settings.sharedWithRaw);
  } else if (settings.sharedWith !== undefined) {
    form.append("shared_with", JSON.stringify(settings.sharedWith));
  }

  const response = await axios.post(makeFullUrl("/photos/new"), form, {
    headers: {
      "Content-Type": "multipart/form-data; boundary=" + form._boundary,
      ...authHeaders(cookie),
    },
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");
  assert.ok(response.data._id, "upload returned the photo's _id");
  return response.data;
}

function deletePhoto(cookie, photoId) {
  return axios.delete(makeFullUrl("/photos/" + photoId), {
    headers: authHeaders(cookie),
  });
}

function deleteComment(cookie, photoId, commentId) {
  return axios.delete(
    makeFullUrl("/commentsOfPhoto/" + photoId + "/" + commentId),
    { headers: authHeaders(cookie) }
  );
}

module.exports = {
  port,
  host,
  makeFullUrl,
  authHeaders,
  assertEqualDates,
  assertAllowedProperties,
  login,
  getJson,
  getResponse,
  postJson,
  postResponse,
  deleteResponse,
  uploadPhoto,
  deletePhoto,
  deleteComment,
};
