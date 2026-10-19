"use strict";

/**
 * Mocha test of the CS142 Project 8 photo tagging story. Run using:
 *   node_modules/.bin/mocha taggingApiTest.js
 *
 * The tests upload throwaway photos and clean them up afterwards, so the seeded
 * data is left untouched. Account-deletion tests use registered throwaway users
 * for the same reason.
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
  assertAllowedProperties,
} = require("./apiTestHelpers.js");

const NONEXISTENT_ID = "000000000000000000000000";

const tagProperties = [
  "_id",
  "user",
  "x",
  "y",
  "width",
  "height",
  "date_time",
  "canDelete",
];
const tagUserProperties = ["_id", "first_name", "last_name"];

function expectStatus(status) {
  return function (error) {
    return Boolean(error.response) && error.response.status === status;
  };
}

function tagBody(userId, rect) {
  return {
    user_id: userId,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

describe("CS142 Photo App: Tagging API Tests", function () {
  this.timeout(20000);

  let tookCookie;
  let took;
  let malcolmCookie;
  let malcolm;
  let ripleyCookie;
  let ripley;
  let photosToDelete = [];
  let victims = [];
  let victimCounter = 0;

  function trackPhoto(photo, cookie) {
    photosToDelete.push({ photo: photo, cookie: cookie });
    return photo;
  }

  async function addTag(photoId, userId, rect, cookie) {
    return postJson(
      "/photos/" + photoId + "/tags",
      tagBody(userId, rect),
      cookie
    );
  }

  function deleteTag(photoId, tagId, cookie) {
    return deleteResponse(
      "/photos/" + photoId + "/tags/" + tagId,
      cookie
    );
  }

  async function photoFor(cookie, photoId, owner) {
    const ownerUser = owner || took;
    const photos = await getJson(
      "/photosOfUser/" + ownerUser._id,
      cookie
    );
    const found = _.find(photos, { _id: photoId });
    assert(found, "could not find photo " + photoId);
    return found;
  }

  async function createVictim() {
    victimCounter += 1;
    const uniqueName =
      "tagtest" + String(new Date().valueOf()) + String(victimCounter);
    const params = {
      login_name: uniqueName,
      password: "weak",
      first_name: "Tag",
      last_name: "Victim" + uniqueName,
      location: "Nowhere",
      description: "A throwaway user for tagging tests",
      occupation: "Tester",
    };

    const user = await postJson("/user", params);
    assert.ok(user._id, "registration returned the user's _id");

    const session = await login(uniqueName);
    const victim = {
      user: user,
      cookie: session.cookie,
      loginName: uniqueName,
    };
    victims.push(victim);
    return victim;
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
  });

  afterEach(async function () {
    for (const entry of photosToDelete) {
      try {
        await deletePhoto(entry.cookie, entry.photo._id);
      } catch (error) {
        // The photo may already have been deleted by the test.
      }
    }
    photosToDelete = [];
  });

  after(async function () {
    for (const victim of victims) {
      try {
        const session = await login(victim.loginName);
        await deleteResponse("/admin/currentUser", session.cookie);
      } catch (error) {
        // The test already deleted the account.
      }
    }
  });

  describe("test /photos/:photo_id/tags authentication", function () {
    it("requires login before adding or deleting a tag", async function () {
      await assert.rejects(
        postResponse(
          "/photos/" + NONEXISTENT_ID + "/tags",
          tagBody(malcolm._id, { x: 0.1, y: 0.1, width: 0.2, height: 0.2 })
        ),
        expectStatus(401)
      );
      await assert.rejects(
        deleteResponse(
          "/photos/" + NONEXISTENT_ID + "/tags/" + NONEXISTENT_ID
        ),
        expectStatus(401)
      );
    });
  });

  describe("test adding tags", function () {
    it("adds a tag and returns its public shape", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const result = await addTag(
        photo._id,
        malcolm._id,
        { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        tookCookie
      );

      assert(result.tag, "the response carries the created tag");
      assertAllowedProperties(result.tag, tagProperties, "tag");
      assertAllowedProperties(result.tag.user, tagUserProperties, "tag user");
      assert.strictEqual(
        String(result.tag.user._id),
        String(malcolm._id),
        "the tag names the requested user"
      );
      assert.strictEqual(result.tag.x, 0.1);
      assert.strictEqual(result.tag.y, 0.2);
      assert.strictEqual(result.tag.width, 0.3);
      assert.strictEqual(result.tag.height, 0.4);
      assert.strictEqual(result.tag.canDelete, true);
      assert.ok(result.tag.date_time, "the tag has a timestamp");

      const saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 1, "the photo has one tag");
      const tag = saved.tags[0];
      assertAllowedProperties(tag, tagProperties, "saved tag");
      assertAllowedProperties(tag.user, tagUserProperties, "saved tag user");
      assert.strictEqual(String(tag.user._id), String(malcolm._id));
      assert.strictEqual(tag.x, 0.1);
      assert.strictEqual(tag.y, 0.2);
      assert.strictEqual(tag.width, 0.3);
      assert.strictEqual(tag.height, 0.4);
      assert.strictEqual(tag.canDelete, true);
      assert.strictEqual(tag.user_id, undefined, "the raw user id is dropped");
      assert.strictEqual(
        tag.tagged_by,
        undefined,
        "the tag creator id is not exposed"
      );
    });

    it("lets any viewer who can see the photo add a tag", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      // Malcolm is not the owner, but the photo is public.
      const result = await addTag(
        photo._id,
        ripley._id,
        { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
        malcolmCookie
      );
      assert.strictEqual(result.tag.canDelete, true);

      const ownerView = await photoFor(tookCookie, photo._id);
      assert.strictEqual(ownerView.tags.length, 1);
      assert.strictEqual(
        ownerView.tags[0].canDelete,
        true,
        "the photo owner may remove any tag"
      );

      const creatorView = await photoFor(malcolmCookie, photo._id);
      assert.strictEqual(
        creatorView.tags[0].canDelete,
        true,
        "the creator may remove their tag"
      );

      const taggedView = await photoFor(ripleyCookie, photo._id);
      assert.strictEqual(
        taggedView.tags[0].canDelete,
        false,
        "the tagged user may not remove the tag"
      );
    });

    it("supports multiple and overlapping tags", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await addTag(
        photo._id,
        malcolm._id,
        { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
        tookCookie
      );
      await addTag(
        photo._id,
        ripley._id,
        { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        tookCookie
      );

      const saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 2, "the photo has both tags");
      const userIds = _.map(saved.tags, function (tag) {
        return String(tag.user._id);
      });
      assert(_.includes(userIds, String(malcolm._id)));
      assert(_.includes(userIds, String(ripley._id)));
    });

    it("clips a rectangle that extends past the photo edge", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      const result = await addTag(
        photo._id,
        malcolm._id,
        { x: 0.9, y: 0.9, width: 0.5, height: 0.5 },
        tookCookie
      );

      assert.strictEqual(result.tag.x, 0.9);
      assert.strictEqual(result.tag.y, 0.9);
      assert.strictEqual(result.tag.width, 0.1);
      assert.strictEqual(result.tag.height, 0.1);
    });

    it("rejects a rectangle that is too small", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          tagBody(malcolm._id, {
            x: 0.1,
            y: 0.1,
            width: 0.01,
            height: 0.2,
          }),
          tookCookie
        ),
        expectStatus(400)
      );

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          tagBody(malcolm._id, {
            x: 0.99,
            y: 0.1,
            width: 0.05,
            height: 0.2,
          }),
          tookCookie
        ),
        expectStatus(400)
      );
    });

    it("rejects invalid coordinates and tagged users", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          { user_id: malcolm._id, x: "abc", y: 0.1, width: 0.2, height: 0.2 },
          tookCookie
        ),
        expectStatus(400)
      );

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          tagBody(NONEXISTENT_ID, {
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.2,
          }),
          tookCookie
        ),
        expectStatus(400)
      );

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          tagBody("not-an-object-id", {
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.2,
          }),
          tookCookie
        ),
        expectStatus(400)
      );
    });

    it("does not tag a photo the viewer cannot see", async function () {
      const photo = trackPhoto(
        await uploadPhoto(tookCookie, { sharedWith: [] }),
        tookCookie
      );

      await assert.rejects(
        postResponse(
          "/photos/" + photo._id + "/tags",
          tagBody(malcolm._id, {
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.2,
          }),
          malcolmCookie
        ),
        expectStatus(404)
      );

      const malcolmPhotos = await getJson(
        "/photosOfUser/" + took._id,
        malcolmCookie
      );
      assert.strictEqual(
        _.find(malcolmPhotos, { _id: photo._id }),
        undefined,
        "the private photo is not visible to Malcolm"
      );
    });
  });

  describe("test deleting tags", function () {
    it("lets the tag's creator delete it", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const created = await addTag(
        photo._id,
        ripley._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        malcolmCookie
      );

      const response = await deleteTag(
        photo._id,
        created.tag._id,
        malcolmCookie
      );
      assert.strictEqual(response.status, 200);

      const saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 0, "the tag was removed");
    });

    it("lets the photo owner delete any tag", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const created = await addTag(
        photo._id,
        ripley._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        malcolmCookie
      );

      const response = await deleteTag(photo._id, created.tag._id, tookCookie);
      assert.strictEqual(response.status, 200);

      const saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 0);
    });

    it("does not let an unrelated viewer delete a tag", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const created = await addTag(
        photo._id,
        malcolm._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        tookCookie
      );

      await assert.rejects(
        deleteTag(photo._id, created.tag._id, ripleyCookie),
        expectStatus(403)
      );
    });

    it("does not let the tagged user delete the tag", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const created = await addTag(
        photo._id,
        ripley._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        malcolmCookie
      );

      await assert.rejects(
        deleteTag(photo._id, created.tag._id, ripleyCookie),
        expectStatus(403)
      );
    });

    it("reports missing photos and tags as not found", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await assert.rejects(
        deleteTag(photo._id, NONEXISTENT_ID, tookCookie),
        expectStatus(404)
      );
      await assert.rejects(
        deleteTag(photo._id, "not-an-object-id", tookCookie),
        expectStatus(404)
      );
      await assert.rejects(
        deleteTag(NONEXISTENT_ID, NONEXISTENT_ID, tookCookie),
        expectStatus(404)
      );
    });
  });

  describe("test tagging side effects", function () {
    it("does not add anything to the activity feed", async function () {
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);
      const before = await getJson("/activities?limit=100", tookCookie);

      const created = await addTag(
        photo._id,
        malcolm._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        tookCookie
      );
      const afterAdd = await getJson("/activities?limit=100", tookCookie);
      assert.strictEqual(
        afterAdd.length,
        before.length,
        "adding a tag does not create an activity"
      );

      await deleteTag(photo._id, created.tag._id, tookCookie);
      const afterDelete = await getJson("/activities?limit=100", tookCookie);
      assert.strictEqual(
        afterDelete.length,
        before.length,
        "deleting a tag does not create an activity"
      );
    });
  });

  describe("test account deletion cascade", function () {
    it("removes tags that mark a deleted user", async function () {
      const victim = await createVictim();
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await addTag(
        photo._id,
        victim.user._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        tookCookie
      );

      let saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 1, "the tag was created");

      const response = await deleteResponse(
        "/admin/currentUser",
        victim.cookie
      );
      assert.strictEqual(response.status, 200);

      saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(
        saved.tags.length,
        0,
        "the tag pointing at the deleted user was removed"
      );
    });

    it("keeps a deleted user's tags but clears their creator id", async function () {
      const victim = await createVictim();
      const photo = trackPhoto(await uploadPhoto(tookCookie), tookCookie);

      await addTag(
        photo._id,
        malcolm._id,
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        victim.cookie
      );

      let saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(saved.tags.length, 1, "the tag was created");

      const response = await deleteResponse(
        "/admin/currentUser",
        victim.cookie
      );
      assert.strictEqual(response.status, 200);

      saved = await photoFor(tookCookie, photo._id);
      assert.strictEqual(
        saved.tags.length,
        1,
        "the tag created by the deleted user survives"
      );
      assert.strictEqual(
        saved.tags[0].canDelete,
        true,
        "the photo owner can still remove it"
      );

      const malcolmView = await photoFor(malcolmCookie, photo._id);
      assert.strictEqual(
        malcolmView.tags[0].canDelete,
        false,
        "the creator id was cleared, so the tagged user cannot remove it"
      );

      const ripleyView = await photoFor(ripleyCookie, photo._id);
      assert.strictEqual(
        ripleyView.tags[0].canDelete,
        false,
        "unrelated viewers cannot remove it"
      );
    });
  });
});
