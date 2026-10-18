"use strict";

/**
 * Mocha test of the CS142 Project 8 activity feed. Run using:
 *   node_modules/.bin/mocha activityApiTest.js
 *
 * Activity writes are fire-and-forget on the server, so the tests poll the feed
 * until the expected entry appears (or disappears) instead of assuming the
 * write completed before the triggering response arrived.
 */

const assert = require("assert");
const _ = require("lodash");

const {
  login,
  getJson,
  getResponse,
  postJson,
  deleteResponse,
  deleteComment,
  uploadPhoto,
  deletePhoto,
  assertAllowedProperties,
} = require("./apiTestHelpers.js");
const {
  ACTIVITY_TYPES,
  PHOTO_ACTIVITY_TYPES,
} = require("./activityTestConstants.js");

const activityProperties = ["_id", "type", "date_time", "user", "photo"];
const activityUserProperties = ["_id", "first_name", "last_name"];
const activityPhotoProperties = ["_id", "file_name", "user_id"];

const DEFAULT_LIMIT = 5;
const POLL_INTERVAL_MS = 25;
const POLL_TIMEOUT_MS = 3000;

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function assertActivityShape(activity, label) {
  assertAllowedProperties(activity, activityProperties, label);
  assert(
    _.includes(ACTIVITY_TYPES, activity.type),
    label + " has a known activity type"
  );
  assert(
    !Number.isNaN(new Date(activity.date_time).valueOf()),
    label + " has a valid date_time"
  );

  assert(activity.user, label + " has an actor");
  assertAllowedProperties(activity.user, activityUserProperties, label + " actor");
  assert.strictEqual(typeof activity.user.first_name, "string");
  assert.strictEqual(typeof activity.user.last_name, "string");

  if (_.includes(PHOTO_ACTIVITY_TYPES, activity.type)) {
    assert(activity.photo, label + " has a photo");
    assertAllowedProperties(
      activity.photo,
      activityPhotoProperties,
      label + " photo"
    );
    assert.strictEqual(typeof activity.photo.file_name, "string");
    assert(activity.photo.user_id, label + " photo has an owner");
  } else {
    assert.strictEqual(activity.photo, null, label + " has no photo");
  }
}

describe("CS142 Photo App: Activity API Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let ripleyCookie;
  let malcolm;
  let ripley;
  let photo;

  async function fetchActivities(cookie) {
    return getJson("/activities?limit=1000", cookie);
  }

  async function waitForActivity(cookie, predicate, message) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const feed = await fetchActivities(cookie);
      const found = _.find(feed, predicate);
      if (found) {
        return found;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    assert.fail(message || "activity was not recorded");
  }

  async function waitForNoActivity(cookie, predicate, message) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const feed = await fetchActivities(cookie);
      if (!_.some(feed, predicate)) {
        return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    assert.fail(message || "activity was not removed");
  }

  function forPhoto(photoId) {
    return function (activity) {
      return (
        activity.photo && String(activity.photo._id) === String(photoId)
      );
    };
  }

  before(async function () {
    const tookSession = await login("took");
    tookCookie = tookSession.cookie;
    took = tookSession.user;

    const userList = await getJson("/user/list", tookCookie);
    malcolm = _.find(userList, { last_name: "Malcolm" });
    ripley = _.find(userList, { last_name: "Ripley" });
    assert(malcolm && ripley, "could not find the seeded users");

    const malcolmSession = await login("malcolm");
    malcolmCookie = malcolmSession.cookie;
    const ripleySession = await login("ripley");
    ripleyCookie = ripleySession.cookie;

    photo = await uploadPhoto(tookCookie);
  });

  after(async function () {
    if (!photo) {
      return;
    }
    try {
      await deletePhoto(tookCookie, photo._id);
    } catch (error) {
      // Best-effort cleanup.
    }
  });

  describe("test /activities authentication", function () {
    it("errors getting the activity feed if not logged in", async function () {
      await assert.rejects(
        getResponse("/activities"),
        function (error) {
          return error.response && error.response.status === 401;
        }
      );
    });
  });

  describe("test /activities feed", function () {
    it("returns the five most recent activities newest first", async function () {
      const feed = await getJson("/activities", tookCookie);

      assert.strictEqual(feed.length, DEFAULT_LIMIT);
      feed.forEach(function (activity, index) {
        assertActivityShape(activity, "activity " + index);

        if (index > 0) {
          const previous = feed[index - 1];
          const previousTime = new Date(previous.date_time).valueOf();
          const currentTime = new Date(activity.date_time).valueOf();
          assert(
            previousTime >= currentTime,
            "activities are sorted newest first"
          );
          if (previousTime === currentTime) {
            assert(
              String(previous._id) >= String(activity._id),
              "ties are broken by the newest id"
            );
          }
        }
      });
    });

    it("honors the optional limit query parameter", async function () {
      for (const limit of [1, 2, 10]) {
        const feed = await getJson(
          "/activities?limit=" + limit,
          tookCookie
        );
        assert.strictEqual(feed.length, limit);
      }
    });

    it("falls back to five for invalid limit values", async function () {
      for (const rawLimit of ["0", "-2", "abc"]) {
        const feed = await getJson(
          "/activities?limit=" + rawLimit,
          tookCookie
        );
        assert.strictEqual(
          feed.length,
          DEFAULT_LIMIT,
          "limit=" + rawLimit + " falls back to the default"
        );
      }
    });
  });

  describe("test recorded activities", function () {
    it("records a photo upload with its thumbnail", async function () {
      const uploadActivity = await waitForActivity(
        tookCookie,
        function (activity) {
          return (
            activity.type === "PHOTO_UPLOAD" &&
            activity.photo &&
            String(activity.photo._id) === String(photo._id)
          );
        },
        "the photo upload activity was not recorded"
      );

      assertActivityShape(uploadActivity, "upload activity");
      assert.strictEqual(String(uploadActivity.user._id), String(took._id));
      assert.strictEqual(uploadActivity.photo.file_name, photo.file_name);
      assert.strictEqual(
        String(uploadActivity.photo.user_id),
        String(took._id)
      );

      const feed = await getJson("/activities", tookCookie);
      assert.strictEqual(
        String(feed[0]._id),
        String(uploadActivity._id),
        "the upload is the newest activity"
      );
    });

    it("records a comment and removes its activity when deleted",
      async function () {
        const updatedPhoto = await postJson(
          "/commentsOfPhoto/" + photo._id,
          { comment: "An activity feed comment" },
          tookCookie
        );
        const comment = _.last(updatedPhoto.comments);
        assert(comment, "the comment was added");

        const commentActivity = await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "ADD_COMMENT" &&
              activity.photo &&
              String(activity.photo._id) === String(photo._id) &&
              activity.user &&
              String(activity.user._id) === String(took._id)
            );
          },
          "the comment activity was not recorded"
        );

        assertActivityShape(commentActivity, "comment activity");
        assert.strictEqual(commentActivity.photo.file_name, photo.file_name);

        const feed = await getJson("/activities", tookCookie);
        assert.strictEqual(
          String(feed[0]._id),
          String(commentActivity._id),
          "the comment is the newest activity"
        );

        await deleteComment(tookCookie, photo._id, comment._id);
        await waitForNoActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "ADD_COMMENT" &&
              activity.photo &&
              String(activity.photo._id) === String(photo._id) &&
              activity.user &&
              String(activity.user._id) === String(took._id)
            );
          },
          "the deleted comment's activity was not removed"
        );
      }
    );

    it("records a like and removes it when unliked", async function () {
      const like = await postJson(
        "/likesOfPhoto/" + photo._id,
        {},
        tookCookie
      );
      assert.strictEqual(like.likeCount, 1);

      const likeActivity = await waitForActivity(
        tookCookie,
        function (activity) {
          return (
            activity.type === "LIKE" &&
            activity.photo &&
            String(activity.photo._id) === String(photo._id) &&
            activity.user &&
            String(activity.user._id) === String(took._id)
          );
        },
        "the like activity was not recorded"
      );
      assertActivityShape(likeActivity, "like activity");

      const feed = await getJson("/activities", tookCookie);
      assert.strictEqual(
        String(feed[0]._id),
        String(likeActivity._id),
        "the like is the newest activity"
      );

      await deleteResponse("/likesOfPhoto/" + photo._id, tookCookie);
      await waitForNoActivity(
        tookCookie,
        function (activity) {
          return (
            activity.type === "LIKE" &&
            activity.photo &&
            String(activity.photo._id) === String(photo._id) &&
            activity.user &&
            String(activity.user._id) === String(took._id)
          );
        },
        "the unlike did not remove the like activity"
      );
    });

    it("removes a photo's activities when the photo is deleted",
      async function () {
        await postJson(
          "/commentsOfPhoto/" + photo._id,
          { comment: "Removed with the photo" },
          tookCookie
        );
        await postJson(
          "/likesOfPhoto/" + photo._id,
          {},
          tookCookie
        );

        // Make sure both activities (and the upload's) exist before deleting.
        await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "ADD_COMMENT" &&
              activity.photo &&
              String(activity.photo._id) === String(photo._id)
            );
          },
          "the comment activity was not recorded"
        );
        await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "LIKE" &&
              activity.photo &&
              String(activity.photo._id) === String(photo._id)
            );
          },
          "the like activity was not recorded"
        );

        const photoId = photo._id;
        await deletePhoto(tookCookie, photoId);
        photo = null;

        await waitForNoActivity(
          tookCookie,
          forPhoto(photoId),
          "the deleted photo's activities were not removed"
        );
      }
    );

    it("records registration, login, and logout and cleans them on account deletion",
      async function () {
        const uniqueName = "activity" + String(new Date().valueOf());
        const params = {
          login_name: uniqueName,
          password: "weak",
          first_name: "Activity",
          last_name: "Tester" + uniqueName,
          location: "Nowhere",
          description: "Activity test user",
          occupation: "Tester",
        };

        const newUser = await postJson("/user", params);
        assert.ok(newUser._id, "registration returned the user's _id");

        const registerActivity = await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "USER_REGISTER" &&
              activity.user &&
              String(activity.user._id) === String(newUser._id)
            );
          },
          "the registration activity was not recorded"
        );
        assertActivityShape(registerActivity, "registration activity");
        assert.strictEqual(registerActivity.photo, null);
        assert.strictEqual(registerActivity.user.first_name, params.first_name);
        assert.strictEqual(registerActivity.user.last_name, params.last_name);

        const newUserSession = await login(uniqueName);
        const loginActivity = await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "USER_LOGIN" &&
              activity.user &&
              String(activity.user._id) === String(newUser._id)
            );
          },
          "the login activity was not recorded"
        );
        assertActivityShape(loginActivity, "login activity");
        assert.strictEqual(loginActivity.photo, null);

        await postJson("/admin/logout", {}, newUserSession.cookie);
        const logoutActivity = await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "USER_LOGOUT" &&
              activity.user &&
              String(activity.user._id) === String(newUser._id)
            );
          },
          "the logout activity was not recorded"
        );
        assertActivityShape(logoutActivity, "logout activity");
        assert.strictEqual(logoutActivity.photo, null);

        // Deleting the account must remove every activity it performed.
        const deleteSession = await login(uniqueName);
        const deleted = await deleteResponse(
          "/admin/currentUser",
          deleteSession.cookie
        );
        assert.strictEqual(deleted.status, 200);

        await waitForNoActivity(
          tookCookie,
          function (activity) {
            return activity.user && String(activity.user._id) === String(newUser._id);
          },
          "the deleted user's activities were not removed"
        );

        const feed = await fetchActivities(tookCookie);
        assert.strictEqual(
          _.some(feed, function (activity) {
            return activity.user === null;
          }),
          false,
          "no activities for the deleted user remain"
        );
      }
    );
  });

  describe("test activity visibility", function () {
    it("hides activities for photos the viewer cannot see", async function () {
      let sharedOnly;
      let ownerOnly;

      try {
        sharedOnly = await uploadPhoto(tookCookie, {
          sharedWith: [malcolm._id],
        });
        ownerOnly = await uploadPhoto(tookCookie, { sharedWith: [] });

        await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "PHOTO_UPLOAD" &&
              activity.photo &&
              String(activity.photo._id) === String(sharedOnly._id)
            );
          },
          "the shared photo's upload activity was not recorded"
        );
        await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "PHOTO_UPLOAD" &&
              activity.photo &&
              String(activity.photo._id) === String(ownerOnly._id)
            );
          },
          "the owner-only photo's upload activity was not recorded"
        );

        // A comment on the shared photo adds another visible activity.
        await postJson(
          "/commentsOfPhoto/" + sharedOnly._id,
          { comment: "Visible on the shared photo" },
          malcolmCookie
        );
        await waitForActivity(
          tookCookie,
          function (activity) {
            return (
              activity.type === "ADD_COMMENT" &&
              activity.photo &&
              String(activity.photo._id) === String(sharedOnly._id)
            );
          },
          "the shared photo's comment activity was not recorded"
        );

        const ownerFeed = await fetchActivities(tookCookie);
        const sharedFeed = await fetchActivities(malcolmCookie);
        const otherFeed = await fetchActivities(ripleyCookie);

        function hasPhoto(feed, photoId) {
          return _.some(feed, forPhoto(photoId));
        }

        assert(hasPhoto(ownerFeed, sharedOnly._id), "owner sees the shared photo");
        assert(hasPhoto(ownerFeed, ownerOnly._id), "owner sees the owner-only photo");
        assert(
          hasPhoto(sharedFeed, sharedOnly._id),
          "shared user sees the shared photo"
        );
        assert(
          _.some(sharedFeed, function (activity) {
            return (
              activity.type === "ADD_COMMENT" &&
              activity.photo &&
              String(activity.photo._id) === String(sharedOnly._id) &&
              activity.user &&
              String(activity.user._id) === String(malcolm._id)
            );
          }),
          "shared user sees the comment activity"
        );
        assert(
          hasPhoto(sharedFeed, ownerOnly._id) === false,
          "shared user does not see the owner-only photo"
        );
        assert(
          hasPhoto(otherFeed, sharedOnly._id) === false,
          "unlisted user does not see the shared photo"
        );
        assert(
          hasPhoto(otherFeed, ownerOnly._id) === false,
          "unlisted user does not see the owner-only photo"
        );

        // Even though the hidden activities are the newest, a limited request
        // still returns `limit` visible activities.
        const otherLimited = await getJson("/activities?limit=5", ripleyCookie);
        assert.strictEqual(otherLimited.length, DEFAULT_LIMIT);
        assert.strictEqual(
          _.some(otherLimited, function (activity) {
            return (
              activity.photo &&
              (String(activity.photo._id) === String(sharedOnly._id) ||
                String(activity.photo._id) === String(ownerOnly._id))
            );
          }),
          false,
          "the limited feed contains no hidden activities"
        );
        otherLimited.forEach(function (activity, index) {
          assertActivityShape(activity, "visible activity " + index);
        });
      } finally {
        for (const restricted of [sharedOnly, ownerOnly]) {
          if (!restricted) {
            continue;
          }
          try {
            await deletePhoto(tookCookie, restricted._id);
          } catch (error) {
            // Best-effort cleanup.
          }
        }
      }
    });
  });
});
