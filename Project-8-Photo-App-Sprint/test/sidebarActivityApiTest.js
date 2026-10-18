"use strict";

/**
 * Mocha test of the CS142 Project 8 sidebar activity summary. Run using:
 *   node_modules/.bin/mocha sidebarActivityApiTest.js
 *
 * Activities are recorded fire-and-forget, so the tests poll
 * /activities/byUser until the expected activity becomes a user's latest
 * visible one (or the user disappears). Seeded data is left intact: every
 * photo, comment, and throwaway account created here is removed again.
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

const entryProperties = ["user", "activity"];
const userProperties = ["_id", "first_name", "last_name"];
const activityProperties = ["_id", "type", "date_time", "photo"];
const photoProperties = ["_id", "file_name", "user_id"];

const POLL_INTERVAL_MS = 25;
const POLL_TIMEOUT_MS = 3000;

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function expectStatus(status) {
  return function (error) {
    return Boolean(error.response) && error.response.status === status;
  };
}

function assertEntryShape(entry, label) {
  assertAllowedProperties(entry, entryProperties, label);
  assertAllowedProperties(entry.user, userProperties, label + " user");
  assert.strictEqual(typeof entry.user.first_name, "string");
  assert.strictEqual(typeof entry.user.last_name, "string");

  if (entry.activity === null) {
    return;
  }

  const activity = entry.activity;
  assertAllowedProperties(activity, activityProperties, label + " activity");
  assert(
    _.includes(ACTIVITY_TYPES, activity.type),
    label + " has a known activity type"
  );
  assert(
    !Number.isNaN(new Date(activity.date_time).valueOf()),
    label + " has a valid date_time"
  );

  if (_.includes(PHOTO_ACTIVITY_TYPES, activity.type)) {
    assert(activity.photo, label + " has a photo");
    assertAllowedProperties(
      activity.photo,
      photoProperties,
      label + " activity photo"
    );
    assert.strictEqual(typeof activity.photo.file_name, "string");
    assert(activity.photo.user_id, label + " photo has an owner");
  } else {
    assert.strictEqual(activity.photo, null, label + " has no photo");
  }
}

describe("CS142 Photo App: Sidebar Activity API Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let malcolm;
  let ripleyCookie;
  let kenobi;
  let userList;
  let publicPhoto;
  let privatePhoto;
  let commentsToDelete = [];
  let photosToDelete = [];
  let registeredUser;
  let registeredLoginName;

  function trackPhoto(photo, cookie) {
    photosToDelete.push({ photo, cookie });
    return photo;
  }

  async function fetchEntries(cookie) {
    return getJson("/activities/byUser", cookie);
  }

  function entryFor(entries, userId) {
    return _.find(entries, function (entry) {
      return String(entry.user._id) === String(userId);
    });
  }

  async function waitForLatest(cookie, userId, predicate, message) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const entries = await fetchEntries(cookie);
      const entry = entryFor(entries, userId);
      assert(entry, "the user appears in the summary");
      if (entry.activity && predicate(entry.activity)) {
        return entry;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    assert.fail(message || "activity did not become the latest");
  }

  async function waitForEntryGone(cookie, userId, message) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const entries = await fetchEntries(cookie);
      if (!entryFor(entries, userId)) {
        return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    assert.fail(message || "the user did not disappear from the summary");
  }

  before(async function () {
    const tookSession = await login("took");
    tookCookie = tookSession.cookie;
    took = tookSession.user;

    userList = await getJson("/user/list", tookCookie);
    malcolm = _.find(userList, { last_name: "Malcolm" });
    kenobi = _.find(userList, { last_name: "Kenobi" });
    const ripley = _.find(userList, { last_name: "Ripley" });
    assert(malcolm && kenobi && ripley, "could not find the seeded users");

    const malcolmSession = await login("malcolm");
    malcolmCookie = malcolmSession.cookie;
    const ripleySession = await login("ripley");
    ripleyCookie = ripleySession.cookie;

    // A public photo to comment on and like.
    publicPhoto = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
  });

  after(async function () {
    const comments = commentsToDelete;
    commentsToDelete = [];
    for (const entry of comments) {
      try {
        await deleteComment(entry.cookie, entry.photoId, entry.commentId);
      } catch (error) {
        // Best-effort cleanup; a failed test may have removed it already.
      }
    }

    for (const entry of photosToDelete) {
      try {
        await deletePhoto(entry.cookie, entry.photo._id);
      } catch (error) {
        // Best-effort cleanup; a failed test may have removed it already.
      }
    }

    if (registeredUser) {
      try {
        const session = await login(registeredLoginName);
        await deleteResponse("/admin/currentUser", session.cookie);
      } catch (error) {
        // The deletion test may already have removed the account.
      }
    }
  });

  describe("test /activities/byUser authentication", function () {
    it("errors if not logged in", async function () {
      await assert.rejects(
        getResponse("/activities/byUser"),
        expectStatus(401)
      );
    });
  });

  describe("test the per-user summary", function () {
    it("returns every user exactly once", async function () {
      const entries = await fetchEntries(tookCookie);
      assert(Array.isArray(entries));

      const entryIds = entries.map(function (entry) {
        return String(entry.user._id);
      });
      const listIds = userList.map(function (user) {
        return String(user._id);
      });

      assert.strictEqual(entries.length, userList.length);
      assert.strictEqual(_.uniq(entryIds).length, entries.length);
      assert.deepStrictEqual(entryIds.sort(), listIds.sort());
    });

    it("returns the documented shape", async function () {
      const entries = await fetchEntries(tookCookie);
      entries.forEach(function (entry, index) {
        assertEntryShape(entry, "entry " + index);
      });
    });

    it("updates the actor's entry without touching other users", async function () {
      // Let took's setup upload settle first so the "unchanged" assertion
      // cannot race a still-pending activity write from the before hook.
      await waitForLatest(
        tookCookie,
        took._id,
        function (activity) {
          return (
            activity.type === "PHOTO_UPLOAD" &&
            String(activity.photo._id) === String(publicPhoto._id)
          );
        },
        "took's setup upload did not become his latest activity"
      );

      const tookBefore = entryFor(await fetchEntries(tookCookie), took._id);
      assert(tookBefore, "took appears in the summary");

      const uploaded = trackPhoto(
        await uploadPhoto(malcolmCookie),
        malcolmCookie
      );
      const entry = await waitForLatest(
        tookCookie,
        malcolm._id,
        function (activity) {
          return (
            activity.type === "PHOTO_UPLOAD" &&
            String(activity.photo._id) === String(uploaded._id)
          );
        },
        "malcolm's upload did not become his latest visible activity"
      );
      assert.strictEqual(entry.user.first_name, malcolm.first_name);

      const tookAfter = entryFor(await fetchEntries(tookCookie), took._id);
      assert.strictEqual(
        tookAfter.activity ? String(tookAfter.activity._id) : null,
        tookBefore.activity ? String(tookBefore.activity._id) : null,
        "another user's upload did not change took's latest activity"
      );
    });

    it("tracks comments, likes, and unlikes", async function () {
      const updated = await postJson(
        "/commentsOfPhoto/" + publicPhoto._id,
        { comment: "Sidebar activity test" },
        malcolmCookie
      );
      const comment = _.last(updated.comments);
      assert(comment, "the comment was added");
      commentsToDelete.push({
        photoId: publicPhoto._id,
        commentId: comment._id,
        cookie: malcolmCookie,
      });

      const commented = await waitForLatest(
        tookCookie,
        malcolm._id,
        function (activity) {
          return (
            activity.type === "ADD_COMMENT" &&
            String(activity.photo._id) === String(publicPhoto._id)
          );
        },
        "malcolm's comment did not become his latest visible activity"
      );

      await postJson("/likesOfPhoto/" + publicPhoto._id, {}, malcolmCookie);
      await waitForLatest(
        tookCookie,
        malcolm._id,
        function (activity) {
          return (
            activity.type === "LIKE" &&
            String(activity.photo._id) === String(publicPhoto._id)
          );
        },
        "malcolm's like did not become his latest visible activity"
      );

      const unliked = await deleteResponse(
        "/likesOfPhoto/" + publicPhoto._id,
        malcolmCookie
      );
      assert.strictEqual(unliked.status, 200);

      const reverted = await waitForLatest(
        tookCookie,
        malcolm._id,
        function (activity) {
          return (
            activity.type === "ADD_COMMENT" &&
            String(activity._id) === String(commented.activity._id)
          );
        },
        "unliking did not fall back to the previous comment activity"
      );
      assert.strictEqual(
        String(reverted.activity.photo._id),
        String(publicPhoto._id)
      );
    });

    it("shows a newly registered user and removes a deleted one",
      async function () {
        registeredLoginName = "sidebar" + String(new Date().valueOf());
        const params = {
          login_name: registeredLoginName,
          password: "weak",
          first_name: "Sidebar",
          last_name: "Tester" + registeredLoginName,
          location: "Nowhere",
          description: "Sidebar activity test user",
          occupation: "Tester",
        };

        registeredUser = await postJson("/user", params);
        assert.ok(registeredUser._id, "registration returned the user's _id");

        const entry = await waitForLatest(
          tookCookie,
          registeredUser._id,
          function (activity) {
            return activity.type === "USER_REGISTER";
          },
          "the registration activity did not become the new user's latest"
        );
        assert.strictEqual(entry.activity.photo, null);
        assert.strictEqual(entry.user.first_name, params.first_name);

        const session = await login(registeredLoginName);
        const deleted = await deleteResponse(
          "/admin/currentUser",
          session.cookie
        );
        assert.strictEqual(deleted.status, 200);

        await waitForEntryGone(
          tookCookie,
          registeredUser._id,
          "the deleted user remained in the summary"
        );
        registeredUser = null;
      }
    );

    it("falls back to the latest visible activity for hidden photos",
      async function () {
        const before = entryFor(await fetchEntries(tookCookie), malcolm._id);
        assert(before && before.activity, "malcolm has a visible activity");

        privatePhoto = trackPhoto(
          await uploadPhoto(malcolmCookie, {
            sharedWith: [kenobi._id],
          }),
          malcolmCookie
        );

        await waitForLatest(
          malcolmCookie,
          malcolm._id,
          function (activity) {
            return (
              activity.type === "PHOTO_UPLOAD" &&
              String(activity.photo._id) === String(privatePhoto._id)
            );
          },
          "the private upload did not become malcolm's latest activity"
        );

        const tookView = await fetchEntries(tookCookie);
        const malcolmEntry = entryFor(tookView, malcolm._id);
        assert.strictEqual(
          String(malcolmEntry.activity._id),
          String(before.activity._id),
          "took still sees malcolm's previous visible activity"
        );
        assert.strictEqual(
          _.some(tookView, function (entry) {
            return (
              entry.activity &&
              entry.activity.photo &&
              String(entry.activity.photo._id) === String(privatePhoto._id)
            );
          }),
          false,
          "took never sees an activity for the hidden photo"
        );
      }
    );

    it("records login and logout as the latest activity", async function () {
      const session = await login("took");
      await waitForLatest(
        tookCookie,
        took._id,
        function (activity) {
          return activity.type === "USER_LOGIN";
        },
        "logging in did not become took's latest activity"
      );

      await postJson("/admin/logout", {}, session.cookie);
      await waitForLatest(
        ripleyCookie,
        took._id,
        function (activity) {
          return activity.type === "USER_LOGOUT";
        },
        "logging out did not become took's latest activity"
      );
    });

    it("sorts by latest activity with inactive users last", async function () {
      const entries = await fetchEntries(tookCookie);
      let seenEmpty = false;

      for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (!entry.activity) {
          seenEmpty = true;
          continue;
        }
        assert.strictEqual(
          seenEmpty,
          false,
          "users with activity come before users without"
        );
        if (i > 0 && entries[i - 1].activity) {
          assert(
            new Date(entries[i - 1].activity.date_time).valueOf() >=
              new Date(entry.activity.date_time).valueOf(),
            "entries are sorted newest activity first"
          );
        }
      }
    });
  });
});
