"use strict";

/**
 * Restore the workspace after a Mocha run.
 *
 * The API suites upload photos and mutate MongoDB, so once every suite has
 * finished this root hook re-seeds the database from modelData and removes
 * every image that is not part of the seed set. It is a root-level hook, so it
 * runs even when a test fails, leaving the next run with a clean baseline.
 *
 * `.mocharc.json` loads this file automatically for every Mocha invocation in
 * this directory.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { IMAGES_DIR } = require("../server/config/paths.js");
const { cs142models } = require("../modelData/photoApp.js");

const PROJECT_ROOT = path.join(__dirname, "..");

// The seeded photos (from modelData) plus the favicon are the only files that
// belong in images/. Everything else was uploaded by a test run.
const seedImageNames = (function () {
  const names = new Set(["favicon.ico"]);
  cs142models.userListModel().forEach(function (user) {
    cs142models.photoOfUserModel(user._id).forEach(function (photo) {
      names.add(photo.file_name);
    });
  });
  return names;
})();

/**
 * Delete uploaded images, leaving only the seed images and the favicon. The
 * database is re-seeded as well, so uploads left behind would otherwise be
 * orphaned files with no photo document.
 *
 * @returns {string[]} The names of the removed files.
 */
function resetImages() {
  const removed = [];
  fs.readdirSync(IMAGES_DIR, { withFileTypes: true }).forEach(function (entry) {
    if (seedImageNames.has(entry.name)) {
      return;
    }
    fs.rmSync(path.join(IMAGES_DIR, entry.name), {
      recursive: true,
      force: true,
    });
    removed.push(entry.name);
  });
  return removed;
}

/**
 * Run loadDatabase.js in a child process so this script uses the same seeding
 * path as `npm run pretest` and never holds a Mongoose connection itself.
 */
function seedDatabase() {
  const result = spawnSync(
    process.execPath,
    [path.join(PROJECT_ROOT, "loadDatabase.js")],
    {
      cwd: PROJECT_ROOT,
      env: process.env,
      // Keep the test output readable: loadDatabase's progress log is noisy,
      // but its errors still go to stderr.
      stdio: ["ignore", "ignore", "inherit"],
    }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error("loadDatabase.js exited with status " + result.status);
  }
}

function cleanup() {
  let seedError = null;
  try {
    seedDatabase();
  } catch (error) {
    seedError = error;
  }

  // Reset the images even when seeding failed, so both halves of the cleanup
  // are attempted and the original error can still be reported below.
  const removed = resetImages();

  if (seedError) {
    console.log(
      "Test cleanup: removed " +
        removed.length +
        " uploaded image(s), but re-seeding the database failed."
    );
    throw seedError;
  }

  console.log(
    "Test cleanup: database re-seeded; removed " +
      removed.length +
      " uploaded image(s)."
  );
}

exports.mochaHooks = {
  afterAll: function () {
    // Seeding connects to MongoDB and loads all demo photos.
    this.timeout(120000);
    cleanup();
  },
};

// Allow `node cleanupTestEnvironment.js` to restore the workspace by hand.
if (require.main === module) {
  cleanup();
}
