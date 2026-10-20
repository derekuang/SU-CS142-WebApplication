"use strict";

/**
 * Mocha test of the CS142 Project 8 photo like votes. Run using:
 *   node_modules/.bin/mocha likesApiTest.js
 *
 * The tests use photos uploaded by took and clean up both the likes and the
 * photos afterwards, so the seeded data is left untouched.
 */

const assert = require("assert");
const _ = require("lodash");

const {
  login,
  getJson,
  postJson,
  postResponse,
  deleteResponse,
  uploadPhoto,
  deletePhoto,
} = require("./apiTestHelpers.js");

const NONEXISTENT_ID = "000000000000000000000000";

function expectStatus(status) {
  return function (error) {
    return Boolean(error.response) && error.response.status === status;
  };
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function assertSortedByLikes(photos) {
  for (let i = 1; i < photos.length; i += 1) {
    const previous = photos[i - 1];
    const current = photos[i];
    if (previous.likeCount !== current.likeCount) {
      assert(
        previous.likeCount > current.likeCount,
        "photos are sorted by like count, descending"
      );
    } else {
      assert(
        new Date(previous.date_time) >= new Date(current.date_time),
        "photos with equal like counts are sorted newest first"
      );
    }
  }
}

describe("CS142 Photo App: Like Votes Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let ripleyCookie;
  let malcolm;
  let ripley;
  let userList;
  let photo;
  let photosToDelete = [];

  function trackPhoto(uploaded) {
    photosToDelete.push(uploaded);
    return uploaded;
  }

  async function like(photoId, cookie) {
    return postJson("/likesOfPhoto/" + photoId, {}, cookie);
  }

  async function unlike(photoId, cookie) {
    const response = await deleteResponse(
      "/likesOfPhoto/" + photoId,
      cookie
    );
    assert.strictEqual(response.status, 200);
    return response.data;
  }

  async function photoFor(cookie, photoId) {
    const photos = await getJson(
      "/photosOfUser/" + took._id,
      cookie
    );
    const found = _.find(photos, { _id: photoId });
    assert(found, "could not find photo " + photoId);
    return found;
  }

  before(async function () {
    const tookSession = await login("took");
    tookCookie = tookSession.cookie;
    took = tookSession.user;

    userList = await getJson("/user/list", tookCookie);
    malcolm = _.find(userList, { last_name: "Malcolm" });
    ripley = _.find(userList, { last_name: "Ripley" });
    assert(malcolm && ripley, "could not find the seeded users");

    const malcolmSession = await login("malcolm");
    malcolmCookie = malcolmSession.cookie;
    const ripleySession = await login("ripley");
    ripleyCookie = ripleySession.cookie;

    photo = trackPhoto(await uploadPhoto(tookCookie));
  });

  afterEach(async function () {
    const cookies = [tookCookie, malcolmCookie, ripleyCookie];
    for (const tracked of photosToDelete) {
      for (const cookie of cookies) {
        try {
          await unlike(tracked._id, cookie);
        } catch (error) {
          // The viewer may not be allowed to see this photo, or it may already
          // have no like for this user; both are fine for cleanup.
        }
      }
    }
  });

  after(async function () {
    for (const tracked of photosToDelete) {
      try {
        await deletePhoto(tookCookie, tracked._id);
      } catch (error) {
        // Best-effort cleanup.
      }
    }
  });

  describe("test /likesOfPhoto/:photo_id authentication", function () {
    it("errors liking or unliking when not logged in", async function () {
      await assert.rejects(
        postResponse("/likesOfPhoto/" + photo._id, {}),
        expectStatus(401)
      );
      await assert.rejects(
        deleteResponse("/likesOfPhoto/" + photo._id),
        expectStatus(401)
      );
    });
  });

  describe("test liking a photo", function () {
    it("records a like and reports the viewer's state", async function () {
      const result = await like(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, {
        likeCount: 1,
        likedByViewer: true,
      });

      const malcolmView = await photoFor(malcolmCookie, photo._id);
      assert.strictEqual(malcolmView.likeCount, 1);
      assert.strictEqual(malcolmView.likedByViewer, true);
      assert.strictEqual(
        malcolmView.likes,
        undefined,
        "the raw likes array is not exposed"
      );

      const ripleyView = await photoFor(ripleyCookie, photo._id);
      assert.strictEqual(ripleyView.likeCount, 1);
      assert.strictEqual(ripleyView.likedByViewer, false);

      const ownerView = await photoFor(tookCookie, photo._id);
      assert.strictEqual(ownerView.likeCount, 1);
      assert.strictEqual(ownerView.likedByViewer, false);
    });

    it("counts at most one like per user", async function () {
      let result = await like(photo._id, malcolmCookie);
      assert.strictEqual(result.likeCount, 1);

      // Liking again is idempotent.
      result = await like(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, {
        likeCount: 1,
        likedByViewer: true,
      });

      await like(photo._id, ripleyCookie);
      await like(photo._id, tookCookie);
      await like(photo._id, malcolmCookie);

      const ownerView = await photoFor(tookCookie, photo._id);
      assert.strictEqual(ownerView.likeCount, 3);
      assert.strictEqual(ownerView.likedByViewer, true);
      assert(
        ownerView.likeCount <= userList.length,
        "the like count never exceeds the number of users"
      );
    });
  });

  describe("test unliking a photo", function () {
    it("removes a like and is idempotent", async function () {
      await like(photo._id, malcolmCookie);

      let result = await unlike(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, {
        likeCount: 0,
        likedByViewer: false,
      });

      // Unliking again is a harmless no-op.
      result = await unlike(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, {
        likeCount: 0,
        likedByViewer: false,
      });
    });

    it("only removes the unliking user's own vote", async function () {
      await like(photo._id, malcolmCookie);
      await like(photo._id, ripleyCookie);

      const result = await unlike(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, {
        likeCount: 1,
        likedByViewer: false,
      });

      const ripleyView = await photoFor(ripleyCookie, photo._id);
      assert.strictEqual(ripleyView.likeCount, 1);
      assert.strictEqual(ripleyView.likedByViewer, true);

      const finalResult = await unlike(photo._id, ripleyCookie);
      assert.deepStrictEqual(finalResult, {
        likeCount: 0,
        likedByViewer: false,
      });
    });
  });

  describe("test invalid photos", function () {
    it("returns 404 for missing, malformed, or invisible photos",
      async function () {
        await assert.rejects(
          postResponse(
            "/likesOfPhoto/" + NONEXISTENT_ID,
            {},
            malcolmCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          postResponse("/likesOfPhoto/1", {}, malcolmCookie),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse(
            "/likesOfPhoto/" + NONEXISTENT_ID,
            malcolmCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse("/likesOfPhoto/1", malcolmCookie),
          expectStatus(404)
        );

        const restricted = trackPhoto(
          await uploadPhoto(tookCookie, {
            sharedWith: [malcolm._id],
          })
        );

        // Ripley is not on the share list and must not be able to like it.
        await assert.rejects(
          postResponse(
            "/likesOfPhoto/" + restricted._id,
            {},
            ripleyCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse(
            "/likesOfPhoto/" + restricted._id,
            ripleyCookie
          ),
          expectStatus(404)
        );

        // Malcolm is on the share list and can like it.
        const allowed = await like(restricted._id, malcolmCookie);
        assert.strictEqual(allowed.likeCount, 1);
        assert.strictEqual(allowed.likedByViewer, true);

        const ownerView = await photoFor(tookCookie, restricted._id);
        assert.strictEqual(ownerView.likeCount, 1);
      }
    );
  });

  describe("test photo ordering", function () {
    it("orders photos by like count and then by newest", async function () {
      const older = trackPhoto(await uploadPhoto(tookCookie));
      await sleep(25);
      const newer = trackPhoto(await uploadPhoto(tookCookie));
      assert(
        new Date(newer.date_time).valueOf() >
          new Date(older.date_time).valueOf(),
        "the second upload is newer"
      );

      // With equal counts, the newest upload comes first.
      let photos = await getJson("/photosOfUser/" + took._id, tookCookie);
      assertSortedByLikes(photos);
      let olderIndex = _.findIndex(photos, { _id: older._id });
      let newerIndex = _.findIndex(photos, { _id: newer._id });
      assert(olderIndex !== -1 && newerIndex !== -1);
      assert(newerIndex < olderIndex, "newest wins an equal-count tie");

      // Equal likes (one each) keep the newest-first order.
      await like(older._id, malcolmCookie);
      await like(newer._id, malcolmCookie);
      photos = await getJson("/photosOfUser/" + took._id, tookCookie);
      assertSortedByLikes(photos);
      olderIndex = _.findIndex(photos, { _id: older._id });
      newerIndex = _.findIndex(photos, { _id: newer._id });
      assert(newerIndex < olderIndex);

      // More likes move the older photo above the newer one.
      await like(older._id, ripleyCookie);
      photos = await getJson("/photosOfUser/" + took._id, tookCookie);
      assertSortedByLikes(photos);
      olderIndex = _.findIndex(photos, { _id: older._id });
      newerIndex = _.findIndex(photos, { _id: newer._id });
      assert(olderIndex < newerIndex, "more likes sort first");

      // Removing the extra like restores the newest-first tie.
      await unlike(older._id, ripleyCookie);
      photos = await getJson("/photosOfUser/" + took._id, tookCookie);
      assertSortedByLikes(photos);
      olderIndex = _.findIndex(photos, { _id: older._id });
      newerIndex = _.findIndex(photos, { _id: newer._id });
      assert(newerIndex < olderIndex);
    });
  });
});
