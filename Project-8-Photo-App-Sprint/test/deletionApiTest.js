"use strict";

/**
 * Mocha test of the CS142 Project 8 deletion rules: deleting comments, photos,
 * and user accounts. Run using:
 *   node_modules/.bin/mocha deletionApiTest.js
 *
 * Seeded users and photos are left intact. Destroyed data is created for each
 * test (and removed again if a test fails part-way).
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
} = require("./apiTestHelpers.js");

const NONEXISTENT_ID = "000000000000000000000000";

function expectStatus(status) {
  return function (error) {
    return Boolean(error.response) && error.response.status === status;
  };
}

describe("CS142 Photo App: Deletion API Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let malcolm;
  let ripleyCookie;
  let malcolmPhoto;

  let commentsToDelete = [];
  let photosToDelete = [];
  let victim;

  function findPhoto(photos, photoId) {
    return _.find(photos, { _id: photoId });
  }

  function findComment(photo, commentId) {
    return _.find(photo.comments || [], { _id: commentId });
  }

  async function addComment(photoId, text, cookie) {
    const authorCookie = cookie || tookCookie;
    const updatedPhoto = await postJson(
      "/commentsOfPhoto/" + photoId,
      { comment: text },
      authorCookie
    );
    const comment = _.last(updatedPhoto.comments);
    assert(comment, "the comment was added");
    commentsToDelete.push({
      photoId: photoId,
      commentId: comment._id,
      cookie: authorCookie,
    });
    return comment;
  }

  async function removeComment(entry) {
    try {
      await deleteComment(entry.cookie, entry.photoId, entry.commentId);
    } catch (error) {
      // Best-effort cleanup: the test may already have deleted it.
    }
  }

  function trackPhoto(photo, cookie) {
    photosToDelete.push({ photo: photo, cookie: cookie });
    return photo;
  }

  before(async function () {
    const tookSession = await login("took");
    tookCookie = tookSession.cookie;
    took = tookSession.user;

    const userList = await getJson("/user/list", tookCookie);
    malcolm = _.find(userList, { last_name: "Malcolm" });
    const ripley = _.find(userList, { last_name: "Ripley" });
    assert(malcolm && ripley, "could not find the seeded users");

    const malcolmSession = await login("malcolm");
    malcolmCookie = malcolmSession.cookie;
    const ripleySession = await login("ripley");
    ripleyCookie = ripleySession.cookie;

    const malcolmPhotos = await getJson(
      "/photosOfUser/" + malcolm._id,
      tookCookie
    );
    assert(malcolmPhotos.length > 0, "Malcolm has seeded photos");
    malcolmPhoto = malcolmPhotos[0];
  });

  afterEach(async function () {
    const entries = commentsToDelete;
    commentsToDelete = [];
    for (const entry of entries) {
      await removeComment(entry);
    }
  });

  after(async function () {
    for (const entry of photosToDelete) {
      try {
        await deletePhoto(entry.cookie, entry.photo._id);
      } catch (error) {
        // Best-effort cleanup.
      }
    }

    if (victim) {
      try {
        const session = await login(victim.loginName);
        await deleteResponse("/admin/currentUser", session.cookie);
      } catch (error) {
        // The test may have deleted the account already.
      }
    }
  });

  describe("test deleting comments", function () {
    it("allows the author to delete a comment on another user's photo",
      async function () {
        const comment = await addComment(
          malcolmPhoto._id,
          "A comment that will be deleted"
        );

        const deleted = await deleteComment(
          tookCookie,
          malcolmPhoto._id,
          comment._id
        );
        assert.strictEqual(deleted.status, 200);

        const photos = await getJson(
          "/photosOfUser/" + malcolm._id,
          tookCookie
        );
        const photo = findPhoto(photos, malcolmPhoto._id);
        assert(photo, "the photo still exists");
        assert.strictEqual(
          findComment(photo, comment._id),
          undefined,
          "the comment is gone"
        );
      }
    );

    it("allows only the comment's author to delete it", async function () {
      const comment = await addComment(
        malcolmPhoto._id,
        "Only its author may delete this"
      );

      // Malcolm owns the photo, but not the comment.
      await assert.rejects(
        deleteResponse(
          "/commentsOfPhoto/" + malcolmPhoto._id + "/" + comment._id,
          malcolmCookie
        ),
        expectStatus(403),
        "the photo owner cannot delete someone else's comment"
      );

      // An unrelated user cannot delete it either.
      await assert.rejects(
        deleteResponse(
          "/commentsOfPhoto/" + malcolmPhoto._id + "/" + comment._id,
          ripleyCookie
        ),
        expectStatus(403),
        "an unrelated user cannot delete the comment"
      );

      const deleted = await deleteComment(
        tookCookie,
        malcolmPhoto._id,
        comment._id
      );
      assert.strictEqual(deleted.status, 200);
    });

    it("returns 404 for missing comments, photos, and malformed ids",
      async function () {
        await assert.rejects(
          deleteResponse(
            "/commentsOfPhoto/" + malcolmPhoto._id + "/" + NONEXISTENT_ID,
            tookCookie
          ),
          expectStatus(404),
          "missing comment"
        );
        await assert.rejects(
          deleteResponse(
            "/commentsOfPhoto/" + NONEXISTENT_ID + "/" + NONEXISTENT_ID,
            tookCookie
          ),
          expectStatus(404),
          "missing photo"
        );
        await assert.rejects(
          deleteResponse("/commentsOfPhoto/1/1", tookCookie),
          expectStatus(404),
          "malformed ids"
        );
      }
    );

    it("requires login before deleting a comment", async function () {
      await assert.rejects(
        deleteResponse(
          "/commentsOfPhoto/" + malcolmPhoto._id + "/" + NONEXISTENT_ID
        ),
        expectStatus(401)
      );
    });
  });

  describe("test deleting photos", function () {
    it("allows the owner to delete a photo and its associated data",
      async function () {
        const ownedPhoto = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

        await addComment(
          ownedPhoto._id,
          "A comment on the soon-deleted photo",
          malcolmCookie
        );
        await postJson(
          "/likesOfPhoto/" + ownedPhoto._id,
          {},
          malcolmCookie
        );
        await postJson(
          "/photos/" + ownedPhoto._id + "/favorite",
          {},
          malcolmCookie
        );

        // Someone else may see it, but cannot delete it.
        await assert.rejects(
          deleteResponse("/photos/" + ownedPhoto._id, malcolmCookie),
          expectStatus(403),
          "a non-owner cannot delete the photo"
        );

        let tookPhotos = await getJson(
          "/photosOfUser/" + took._id,
          tookCookie
        );
        assert(
          findPhoto(tookPhotos, ownedPhoto._id),
          "the rejected delete did not remove the photo"
        );

        const deleted = await deleteResponse(
          "/photos/" + ownedPhoto._id,
          tookCookie
        );
        assert.strictEqual(deleted.status, 200);

        tookPhotos = await getJson("/photosOfUser/" + took._id, tookCookie);
        assert.strictEqual(
          findPhoto(tookPhotos, ownedPhoto._id),
          undefined,
          "the photo is gone"
        );

        const favorites = await getJson("/favorites", malcolmCookie);
        assert.strictEqual(
          _.some(favorites, { _id: ownedPhoto._id }),
          false,
          "the deleted photo is gone from favorites"
        );

        const activities = await getJson(
          "/activities?limit=1000",
          tookCookie
        );
        assert.strictEqual(
          _.some(activities, function (activity) {
            return (
              activity.photo &&
              String(activity.photo._id) === String(ownedPhoto._id)
            );
          }),
          false,
          "activities for the deleted photo are gone"
        );
      }
    );

    it("returns 404 for missing or malformed photo ids", async function () {
      await assert.rejects(
        deleteResponse("/photos/" + NONEXISTENT_ID, tookCookie),
        expectStatus(404)
      );
      await assert.rejects(
        deleteResponse("/photos/1", tookCookie),
        expectStatus(404)
      );

      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const deleted = await deleteResponse(
        "/photos/" + photo._id,
        tookCookie
      );
      assert.strictEqual(deleted.status, 200);

      await assert.rejects(
        deleteResponse("/photos/" + photo._id, tookCookie),
        expectStatus(404),
        "deleting an already deleted photo returns 404"
      );
    });

    it("requires login before deleting a photo", async function () {
      await assert.rejects(
        deleteResponse("/photos/" + NONEXISTENT_ID),
        expectStatus(401)
      );
    });
  });

  describe("test deleting a user account", function () {
    it("requires login before deleting the current account", async function () {
      await assert.rejects(
        deleteResponse("/admin/currentUser"),
        expectStatus(401)
      );
    });

    it("deletes the account and every trace of its data", async function () {
      const uniqueName = "deleted" + String(new Date().valueOf());
      const params = {
        login_name: uniqueName,
        password: "weak",
        first_name: "Deleted",
        last_name: "Tester" + uniqueName,
        location: "Nowhere",
        description: "A user whose account will be deleted",
        occupation: "Tester",
      };

      const victimUser = await postJson("/user", params);
      assert.ok(victimUser._id, "registration returned the user's _id");

      victim = {
        user: victimUser,
        cookie: undefined,
        loginName: uniqueName,
      };
      const victimSession = await login(uniqueName);
      victim.cookie = victimSession.cookie;

      // Data that should survive: took's photo, with a comment mentioning the
      // victim and a like/comment from the victim.
      const hostPhoto = trackPhoto(
        await uploadPhoto(tookCookie),
        tookCookie
      );

      // Data that should be destroyed with the victim: their own photo, which
      // took has favorited and commented on.
      const victimPhoto = trackPhoto(
        await uploadPhoto(victim.cookie),
        victim.cookie
      );

      await postJson(
        "/photos/" + victimPhoto._id + "/favorite",
        {},
        tookCookie
      );
      await addComment(
        victimPhoto._id,
        "A comment on the victim's photo",
        tookCookie
      );

      const victimComment = await addComment(
        hostPhoto._id,
        "A comment by the victim",
        victim.cookie
      );
      await postJson(
        "/likesOfPhoto/" + hostPhoto._id,
        {},
        victim.cookie
      );
      await postJson(
        "/photos/" + hostPhoto._id + "/favorite",
        {},
        victim.cookie
      );

      const mentionComment = await addComment(
        hostPhoto._id,
        "Hello @[" +
          params.first_name +
          " " +
          params.last_name +
          "](" +
          victimUser._id +
          ")",
        tookCookie
      );

      // Verify the setup so the later assertions mean something.
      let hostView = findPhoto(
        await getJson("/photosOfUser/" + took._id, tookCookie),
        hostPhoto._id
      );
      assert(hostView, "took's host photo exists");
      assert.strictEqual(hostView.likeCount, 1, "the victim liked the photo");
      assert(findComment(hostView, victimComment._id), "the victim commented");
      const storedMention = findComment(hostView, mentionComment._id);
      assert(storedMention, "the mention comment exists");
      assert(
        _.some(storedMention.mentions, { _id: victimUser._id }),
        "the victim is mentioned"
      );

      let favorites = await getJson("/favorites", tookCookie);
      assert(
        _.some(favorites, { _id: victimPhoto._id }),
        "took favorited the victim's photo"
      );

      // Delete the account.
      const deleted = await deleteResponse(
        "/admin/currentUser",
        victim.cookie
      );
      assert.strictEqual(deleted.status, 200);
      victim = null;

      // The session is gone and the user cannot be found.
      await assert.rejects(
        getResponse("/user/list", victimSession.cookie),
        expectStatus(401),
        "the deleted user's session is rejected"
      );

      const users = await getJson("/user/list", tookCookie);
      assert.strictEqual(
        _.some(users, { _id: victimUser._id }),
        false,
        "the user is gone from the user list"
      );
      const detail = await getJson(
        "/user/" + victimUser._id,
        tookCookie
      );
      assert.ok(
        detail === null || detail === "",
        "the user detail is gone"
      );

      // The victim's photo is gone, including from took's favorites.
      const deletedUserPhotos = await getJson(
        "/photosOfUser/" + victimUser._id,
        tookCookie
      );
      assert.deepStrictEqual(deletedUserPhotos, []);
      favorites = await getJson("/favorites", tookCookie);
      assert.strictEqual(
        _.some(favorites, { _id: victimPhoto._id }),
        false,
        "the deleted photo is gone from favorites"
      );

      // The victim's comment and like on the surviving photo are gone.
      hostView = findPhoto(
        await getJson("/photosOfUser/" + took._id, tookCookie),
        hostPhoto._id
      );
      assert(hostView, "took's host photo still exists");
      assert.strictEqual(
        findComment(hostView, victimComment._id),
        undefined,
        "the victim's comment is gone"
      );
      assert.strictEqual(hostView.likeCount, 0, "the victim's like is gone");

      // Their mention is removed, but the mentioning comment survives.
      const mentionAfter = findComment(hostView, mentionComment._id);
      assert(mentionAfter, "the mentioning comment still exists");
      assert.strictEqual(
        _.some(mentionAfter.mentions, { _id: victimUser._id }),
        false,
        "the mention of the deleted user is gone"
      );

      // Activities by the victim, and activities on the victim's photo, are
      // gone. No activity should be left pointing at a deleted user.
      const activities = await getJson(
        "/activities?limit=1000",
        tookCookie
      );
      assert.strictEqual(
        _.some(activities, function (activity) {
          return (
            activity.user &&
            String(activity.user._id) === String(victimUser._id)
          );
        }),
        false,
        "the victim's activities are gone"
      );
      assert.strictEqual(
        _.some(activities, function (activity) {
          return (
            activity.photo &&
            String(activity.photo._id) === String(victimPhoto._id)
          );
        }),
        false,
        "activities on the victim's photo are gone"
      );
      assert.strictEqual(
        _.some(activities, function (activity) {
          return activity.user === null;
        }),
        false,
        "no activity points at the deleted user"
      );
    });
  });
});
