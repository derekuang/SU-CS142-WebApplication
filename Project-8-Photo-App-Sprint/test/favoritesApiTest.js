"use strict";

/**
 * Mocha test of the CS142 Project 8 favorites list. Run using:
 *   node_modules/.bin/mocha favoritesApiTest.js
 *
 * Favorites live on the photo document and are per user, so the tests use
 * photos uploaded by took and clean up all favorites afterwards.
 */

const assert = require("assert");
const _ = require("lodash");

const {
  login,
  getJson,
  getResponse,
  postJson,
  postResponse,
  deleteResponse,
  uploadPhoto,
  deletePhoto,
  assertEqualDates,
  assertAllowedProperties,
} = require("./apiTestHelpers.js");

const NONEXISTENT_ID = "000000000000000000000000";

const favoriteProperties = ["_id", "file_name", "date_time", "owner"];
const favoriteOwnerProperties = ["_id", "first_name", "last_name"];

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

function assertSortedByDateDesc(favorites) {
  for (let i = 1; i < favorites.length; i += 1) {
    assert(
      new Date(favorites[i - 1].date_time) >=
        new Date(favorites[i].date_time),
      "favorites are sorted newest first"
    );
  }
}

describe("CS142 Photo App: Favorites API Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let ripleyCookie;
  let malcolm;
  let ripley;
  let photo;
  let photosToDelete = [];

  function trackPhoto(uploaded) {
    photosToDelete.push(uploaded);
    return uploaded;
  }

  async function favorite(photoId, cookie) {
    return postJson("/photos/" + photoId + "/favorite", {}, cookie);
  }

  async function unfavorite(photoId, cookie) {
    const response = await deleteResponse(
      "/photos/" + photoId + "/favorite",
      cookie
    );
    assert.strictEqual(response.status, 200);
    return response.data;
  }

  async function favoritesFor(cookie) {
    return getJson("/favorites", cookie);
  }

  async function photoFor(cookie, photoId) {
    const photos = await getJson("/photosOfUser/" + took._id, cookie);
    const found = _.find(photos, { _id: photoId });
    assert(found, "could not find photo " + photoId);
    return found;
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

    photo = trackPhoto(await uploadPhoto(tookCookie));
  });

  afterEach(async function () {
    const cookies = [tookCookie, malcolmCookie, ripleyCookie];
    for (const tracked of photosToDelete) {
      for (const cookie of cookies) {
        try {
          await unfavorite(tracked._id, cookie);
        } catch (error) {
          // The viewer may not be able to see the photo, or the photo may
          // already be gone; both are fine for cleanup.
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

  describe("test /favorites authentication", function () {
    it("errors reading or changing favorites when not logged in",
      async function () {
        await assert.rejects(
          getResponse("/favorites"),
          expectStatus(401)
        );
        await assert.rejects(
          postResponse("/photos/" + photo._id + "/favorite", {}),
          expectStatus(401)
        );
        await assert.rejects(
          deleteResponse("/photos/" + photo._id + "/favorite"),
          expectStatus(401)
        );
      }
    );
  });

  describe("test favoriting a photo", function () {
    it("favorites a photo and reports the state only to that viewer",
      async function () {
        const result = await favorite(photo._id, malcolmCookie);
        assert.deepStrictEqual(result, { favoritedByViewer: true });

        const malcolmView = await photoFor(malcolmCookie, photo._id);
        assert.strictEqual(malcolmView.favoritedByViewer, true);
        assert.strictEqual(
          malcolmView.favorites,
          undefined,
          "the raw favorites array is not exposed"
        );

        const ripleyView = await photoFor(ripleyCookie, photo._id);
        assert.strictEqual(ripleyView.favoritedByViewer, false);

        const ownerView = await photoFor(tookCookie, photo._id);
        assert.strictEqual(ownerView.favoritedByViewer, false);
      }
    );

    it("is idempotent and lists the photo only once", async function () {
      await favorite(photo._id, malcolmCookie);
      const again = await favorite(photo._id, malcolmCookie);
      assert.deepStrictEqual(again, { favoritedByViewer: true });

      const favorites = await favoritesFor(malcolmCookie);
      const matching = _.filter(favorites, { _id: photo._id });
      assert.strictEqual(matching.length, 1);
    });

    it("returns the favorited photo with its owner and no internal fields",
      async function () {
        await favorite(photo._id, malcolmCookie);

        const favorites = await favoritesFor(malcolmCookie);
        const entry = _.find(favorites, { _id: photo._id });
        assert(entry, "the favorited photo is listed");

        assert.strictEqual(entry.file_name, photo.file_name);
        assertEqualDates(
          entry.date_time,
          photo.date_time,
          "favorite date_time"
        );
        assert.strictEqual(String(entry.owner._id), String(took._id));
        assert.strictEqual(entry.owner.first_name, took.first_name);
        assert.strictEqual(entry.owner.last_name, took.last_name);

        assertAllowedProperties(entry, favoriteProperties, "favorite entry");
        assertAllowedProperties(
          entry.owner,
          favoriteOwnerProperties,
          "favorite owner"
        );
        assert.strictEqual(entry.comments, undefined);
        assert.strictEqual(entry.likes, undefined);
        assert.strictEqual(entry.favorites, undefined);
      }
    );

    it("is per user and survives a new session", async function () {
      await favorite(photo._id, malcolmCookie);

      const ripleyFavorites = await favoritesFor(ripleyCookie);
      assert.strictEqual(
        _.some(ripleyFavorites, { _id: photo._id }),
        false,
        "another user's favorites are unaffected"
      );

      // A fresh login creates a new session; the favorite is stored server-side.
      const secondMalcolmSession = await login("malcolm");
      const persisted = await favoritesFor(secondMalcolmSession.cookie);
      assert(
        _.some(persisted, { _id: photo._id }),
        "the favorite persists across sessions"
      );
    });

    it("returns an empty list when the user has no favorites",
      async function () {
        const favorites = await favoritesFor(ripleyCookie);
        assert.deepStrictEqual(favorites, []);
      }
    );
  });

  describe("test removing a favorite", function () {
    it("removes a favorite and is idempotent", async function () {
      await favorite(photo._id, malcolmCookie);

      let result = await unfavorite(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, { favoritedByViewer: false });

      let favorites = await favoritesFor(malcolmCookie);
      assert.strictEqual(
        _.some(favorites, { _id: photo._id }),
        false,
        "the photo is gone from the favorites list"
      );

      // Removing it again is a harmless no-op.
      result = await unfavorite(photo._id, malcolmCookie);
      assert.deepStrictEqual(result, { favoritedByViewer: false });
    });

    it("removes a photo from favorites when the photo is deleted",
      async function () {
        const ownPhoto = trackPhoto(await uploadPhoto(tookCookie));
        await favorite(ownPhoto._id, malcolmCookie);

        let favorites = await favoritesFor(malcolmCookie);
        assert(
          _.some(favorites, { _id: ownPhoto._id }),
          "the photo is initially favorited"
        );

        await deletePhoto(tookCookie, ownPhoto._id);

        favorites = await favoritesFor(malcolmCookie);
        assert.strictEqual(
          _.some(favorites, { _id: ownPhoto._id }),
          false,
          "the deleted photo is gone from favorites"
        );
      }
    );
  });

  describe("test invalid photos", function () {
    it("returns 404 for missing, malformed, or invisible photos",
      async function () {
        await assert.rejects(
          postResponse(
            "/photos/" + NONEXISTENT_ID + "/favorite",
            {},
            malcolmCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          postResponse("/photos/1/favorite", {}, malcolmCookie),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse(
            "/photos/" + NONEXISTENT_ID + "/favorite",
            malcolmCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse("/photos/1/favorite", malcolmCookie),
          expectStatus(404)
        );

        const restricted = trackPhoto(
          await uploadPhoto(tookCookie, {
            sharedWith: [malcolm._id],
          })
        );

        // Ripley is not on the share list and must not favorite it.
        await assert.rejects(
          postResponse(
            "/photos/" + restricted._id + "/favorite",
            {},
            ripleyCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          deleteResponse(
            "/photos/" + restricted._id + "/favorite",
            ripleyCookie
          ),
          expectStatus(404)
        );

        const ripleyFavorites = await favoritesFor(ripleyCookie);
        assert.strictEqual(
          _.some(ripleyFavorites, { _id: restricted._id }),
          false
        );

        // Malcolm may see and favorite it.
        const allowed = await favorite(restricted._id, malcolmCookie);
        assert.deepStrictEqual(allowed, { favoritedByViewer: true });

        const malcolmFavorites = await favoritesFor(malcolmCookie);
        assert(
          _.some(malcolmFavorites, { _id: restricted._id }),
          "a visible shared photo is listed in favorites"
        );
      }
    );
  });

  describe("test favorites ordering", function () {
    it("lists favorites newest first by the photo's date", async function () {
      const older = trackPhoto(await uploadPhoto(tookCookie));
      await sleep(25);
      const newer = trackPhoto(await uploadPhoto(tookCookie));
      assert(
        new Date(newer.date_time).valueOf() >
          new Date(older.date_time).valueOf()
      );

      // Favorite the newer photo first, then the older one: the list order must
      // follow the photo dates, not the order the favorites were added.
      await favorite(newer._id, malcolmCookie);
      await favorite(older._id, malcolmCookie);

      const favorites = await favoritesFor(malcolmCookie);
      assertSortedByDateDesc(favorites);

      const newerIndex = _.findIndex(favorites, { _id: newer._id });
      const olderIndex = _.findIndex(favorites, { _id: older._id });
      assert(newerIndex !== -1 && olderIndex !== -1);
      assert(newerIndex < olderIndex, "the newer photo is listed first");
    });
  });
});
