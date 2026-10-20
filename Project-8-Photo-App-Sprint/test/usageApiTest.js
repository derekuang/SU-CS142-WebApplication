"use strict";

/**
 * Mocha test of the CS142 Project 8 usage API, which powers the two "usage"
 * blocks on the user detail page (most recent photo and most commented photo).
 * Run using this command:
 *   node_modules/.bin/mocha usageApiTest.js
 *
 * The expected summary is derived from /photosOfUser/:id instead of being
 * hard-coded from the seed data. That keeps the tests passing when the other
 * API suites have already added comments or uploaded photos, while still
 * checking the documented tie-breaks (newest upload, then newest photo for an
 * equal comment count).
 */

const assert = require("assert");
const _ = require("lodash");

const cs142models = require("../modelData/photoApp.js").cs142models;

const {
  assertEqualDates,
  assertAllowedProperties,
  login,
  getJson,
  getResponse,
  postJson,
  uploadPhoto,
  deletePhoto,
} = require("./apiTestHelpers.js");

// Exact response shapes. The recent-photo query only selects file_name and
// date_time (MongoDB still returns _id); the most-commented aggregation adds
// the commentCount it computed.
const usageProperties = ["recentPhoto", "mostCommentedPhoto"];
const recentPhotoProperties = ["_id", "file_name", "date_time"];
const mostCommentedPhotoProperties = [
  "_id",
  "file_name",
  "date_time",
  "commentCount",
];

/**
 * Compute what the usage summary should be for a list of photos, matching the
 * server's selection rules: the newest photo by date_time, and the photo with
 * the most comments with the newest photo winning an equal-count draw.
 */
function expectedUsage(photos) {
  if (!photos || photos.length === 0) {
    return { recentPhoto: null, mostCommentedPhoto: null };
  }

  const byNewest = photos
    .slice()
    .sort(function (a, b) {
      return new Date(b.date_time) - new Date(a.date_time);
    });

  const mostCommented = photos
    .map(function (photo) {
      return {
        photo: photo,
        commentCount: (photo.comments || []).length,
      };
    })
    .sort(function (a, b) {
      return (
        b.commentCount - a.commentCount ||
        new Date(b.photo.date_time) - new Date(a.photo.date_time)
      );
    })[0];

  return {
    recentPhoto: byNewest[0],
    mostCommentedPhoto: mostCommented,
  };
}

/**
 * Check one photo entry of the summary against the expected photo and make sure
 * the endpoint exposes only the fields the view needs.
 */
function assertPhotoSummary(summary, expected, allowedProperties, label) {
  assert.ok(summary, label + " is present");
  assert.strictEqual(summary._id, expected._id, label + " returned the wrong id");
  assert.strictEqual(
    summary.file_name,
    expected.file_name,
    label + " returned the wrong file_name"
  );
  assertEqualDates(summary.date_time, expected.date_time, label + " date_time");
  assertAllowedProperties(summary, allowedProperties, label);
}

describe("CS142 Photo App: Usage API Tests", function () {
  // The seeded-user test walks every user and the visibility tests upload a
  // photo, so give the suite more headroom than Mocha's 2s default.
  this.timeout(10000);

  let sessionCookie;
  let viewer;
  let userList;

  before(function () {
    return login("took").then(function (session) {
      sessionCookie = session.cookie;
      viewer = session.user;
      return getJson("/user/list", sessionCookie).then(function (list) {
        userList = list;
      });
    });
  });

  describe("test /usageOfUser/:id authentication", function () {
    it("errors getting a usage summary if not logged in", function (done) {
      getResponse("/usageOfUser/" + viewer._id)
        .then(function () {
          assert.fail("Expected error not received");
        })
        .catch(function (error) {
          assert.strictEqual(
            error.response.status,
            401,
            "HTTP response status code 401"
          );
          done();
        });
    });
  });

  describe("test /usageOfUser/:id", function () {
    it("returns the most recent and most commented photo for each seeded user",
      function () {
        const seededUsers = cs142models.userListModel();

        // Run the requests for one user at a time so a failure names the user.
        return seededUsers.reduce(function (promise, seededUser) {
          return promise.then(function () {
            const user = _.find(userList, {
              first_name: seededUser.first_name,
              last_name: seededUser.last_name,
            });
            assert(
              user,
              "could not find user " +
                seededUser.first_name +
                " " +
                seededUser.last_name
            );

            return Promise.all([
              getJson("/photosOfUser/" + user._id, sessionCookie),
              getJson("/usageOfUser/" + user._id, sessionCookie),
            ]).then(function (results) {
              const photos = results[0];
              const usage = results[1];
              const expected = expectedUsage(photos);
              const label =
                seededUser.first_name + " " + seededUser.last_name + "'s";

              const extraUsageProperties = _.difference(
                Object.keys(usage),
                usageProperties
              );
              assert.strictEqual(
                extraUsageProperties.length,
                0,
                "usage object has extra properties: " + extraUsageProperties
              );

              assertPhotoSummary(
                usage.recentPhoto,
                expected.recentPhoto,
                recentPhotoProperties,
                label + " recentPhoto"
              );

              assertPhotoSummary(
                usage.mostCommentedPhoto,
                expected.mostCommentedPhoto.photo,
                mostCommentedPhotoProperties,
                label + " mostCommentedPhoto"
              );
              assert.strictEqual(
                usage.mostCommentedPhoto.commentCount,
                expected.mostCommentedPhoto.commentCount,
                label + " mostCommentedPhoto commentCount"
              );
            });
          });
        }, Promise.resolve());
      }
    );

    it("returns a null summary for a user with no photos", function () {
      const uniqueName = "usage" + String(new Date().valueOf());

      return postJson("/user", {
        login_name: uniqueName,
        password: "weak",
        first_name: "Usage",
        last_name: "Tester" + uniqueName,
        location: "Nowhere",
        description: "A user without photos",
        occupation: "Tester",
      })
        .then(function (newUser) {
          assert.ok(newUser._id, "registration returned the user's _id");
          return getJson("/usageOfUser/" + newUser._id, sessionCookie);
        })
        .then(function (usage) {
          assert.deepStrictEqual(usage, {
            recentPhoto: null,
            mostCommentedPhoto: null,
          });
        });
    });

    it("returns a null summary for a nonexistent user id", function () {
      return getJson(
        "/usageOfUser/000000000000000000000000",
        sessionCookie
      ).then(function (usage) {
        assert.deepStrictEqual(usage, {
          recentPhoto: null,
          mostCommentedPhoto: null,
        });
      });
    });

    it("returns a 400 status on a malformed user id", function (done) {
      getResponse("/usageOfUser/1", sessionCookie)
        .then(function () {
          assert.fail("Expected error not received");
        })
        .catch(function (error) {
          assert.strictEqual(
            error.response.status,
            400,
            "HTTP response status code 400"
          );
          done();
        });
    });
  });

  describe("test /usageOfUser/:id photo visibility", function () {
    let restrictedPhotoId;

    afterEach(function () {
      if (!restrictedPhotoId) {
        return Promise.resolve();
      }
      const photoId = restrictedPhotoId;
      restrictedPhotoId = undefined;
      return deletePhoto(sessionCookie, photoId);
    });

    it("only reports photos the requesting user may see", function () {
      const malcolm = _.find(userList, { last_name: "Malcolm" });
      assert(malcolm, "could not find user Malcolm");

      let malcolmCookie;

      return login("malcolm")
        .then(function (session) {
          malcolmCookie = session.cookie;

          // Share the new photo with Malcolm only; Ripley must still not see it.
          return uploadPhoto(sessionCookie, {
            sharedWith: [malcolm._id],
          });
        })
        .then(function (photo) {
          restrictedPhotoId = photo._id;

          // Give the photo more comments than any public photo owned by took,
          // so the "most commented" query would pick it if visibility were
          // ignored.
          return getJson("/photosOfUser/" + viewer._id, sessionCookie);
        })
        .then(function (publicPhotos) {
          const maxPublicComments = publicPhotos.reduce(function (max, photo) {
            return Math.max(max, (photo.comments || []).length);
          }, 0);

          // Post the comments one at a time: each request loads the photo,
          // pushes its comment, and saves the whole document, so concurrent
          // posts to the same photo could overwrite one another.
          let chain = Promise.resolve();
          for (let i = 0; i <= maxPublicComments; i += 1) {
            const commentNumber = i;
            chain = chain.then(function () {
              return postJson(
                "/commentsOfPhoto/" + restrictedPhotoId,
                { comment: "restricted comment " + commentNumber },
                sessionCookie
              );
            });
          }
          return chain;
        })
        .then(function () {
          return Promise.all([
            getJson("/usageOfUser/" + viewer._id, sessionCookie),
            getJson("/usageOfUser/" + viewer._id, malcolmCookie),
          ]);
        })
        .then(function (results) {
          const ownerUsage = results[0];
          const sharedUsage = results[1];

          // The owner sees the new photo in both blocks.
          assert.strictEqual(
            ownerUsage.recentPhoto._id,
            restrictedPhotoId,
            "owner should see the restricted photo as most recent"
          );
          assert.strictEqual(
            ownerUsage.mostCommentedPhoto._id,
            restrictedPhotoId,
            "owner should see the restricted photo as most commented"
          );

          // A user on the share list sees it too.
          assert.strictEqual(
            sharedUsage.recentPhoto._id,
            restrictedPhotoId,
            "a shared-with user should see the restricted photo as most recent"
          );
          assert.strictEqual(
            sharedUsage.mostCommentedPhoto._id,
            restrictedPhotoId,
            "a shared-with user should see the restricted photo as most commented"
          );

          // But a user who is not on the list never sees it.
          return login("ripley").then(function (session) {
            return getJson("/usageOfUser/" + viewer._id, session.cookie);
          });
        })
        .then(function (otherUsage) {
          assert.notStrictEqual(
            otherUsage.recentPhoto && otherUsage.recentPhoto._id,
            restrictedPhotoId,
            "an unrelated user must not see the restricted photo as most recent"
          );
          assert.notStrictEqual(
            otherUsage.mostCommentedPhoto && otherUsage.mostCommentedPhoto._id,
            restrictedPhotoId,
            "an unrelated user must not see the restricted photo as most commented"
          );
        });
    });
  });

  describe("test /usageOfUser/:id with an uncommented photo", function () {
    it("returns that photo with a commentCount of 0", async function () {
      const uniqueName = "usagecomments" + String(new Date().valueOf());
      let newUser;
      let newUserCookie;
      let photoId;

      try {
        newUser = await postJson("/user", {
          login_name: uniqueName,
          password: "weak",
          first_name: "Uncommented",
          last_name: "Tester" + uniqueName,
        });

        const session = await login(uniqueName);
        newUserCookie = session.cookie;

        const photo = await uploadPhoto(newUserCookie);
        photoId = photo._id;

        const usage = await getJson(
          "/usageOfUser/" + newUser._id,
          newUserCookie
        );
        assert.strictEqual(
          usage.recentPhoto._id,
          photoId,
          "the only photo should be the most recent one"
        );
        assert.strictEqual(
          usage.mostCommentedPhoto._id,
          photoId,
          "the only photo should still be the most commented one"
        );
        assert.strictEqual(
          usage.mostCommentedPhoto.commentCount,
          0,
          "a photo without comments has a commentCount of 0"
        );
      } finally {
        if (photoId) {
          await deletePhoto(newUserCookie, photoId);
        }
      }
    });
  });
});
