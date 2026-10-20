"use strict";

/**
 * Mocha test of the CS142 Project 8 photo visibility controls. Run using:
 *   node_modules/.bin/mocha visibilityApiTest.js
 *
 * The tests upload photos with the three share-list states (absent = public,
 * a list = owner plus listed users, an empty list = owner only), then check
 * what each viewer can see and do. Cleanup removes the uploaded photos (their
 * comments/likes/favorites go with them) so the seeded data is left untouched.
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

const NONEXISTENT_USER_ID = "000000000000000000000000";

describe("CS142 Photo App: Photo Visibility Tests", function () {
  this.timeout(20000);

  let ownerCookie;
  let owner;
  let malcolmCookie;
  let ripleyCookie;
  let malcolm;
  let ripley;

  let publicPhoto;
  let sharedPhoto;
  let privatePhoto;
  let invalidSharePhoto;
  let mixedSharePhoto;
  let uploadedPhotos = [];

  function findUser(userList, lastName) {
    const user = _.find(userList, { last_name: lastName });
    assert(user, "could not find user " + lastName);
    return user;
  }

  function visiblePhotoIds(cookie) {
    return getJson("/photosOfUser/" + owner._id, cookie).then(function (photos) {
      return _.map(photos, "_id");
    });
  }

  function assertIncludes(ids, photo, message) {
    assert(_.includes(ids, photo._id), message);
  }

  function assertExcludes(ids, photo, message) {
    assert.strictEqual(_.includes(ids, photo._id), false, message);
  }

  function expectStatus(status) {
    return function (error) {
      return Boolean(error.response) && error.response.status === status;
    };
  }

  before(async function () {
    const ownerSession = await login("took");
    ownerCookie = ownerSession.cookie;
    owner = ownerSession.user;

    const userList = await getJson("/user/list", ownerCookie);
    malcolm = findUser(userList, "Malcolm");
    ripley = findUser(userList, "Ripley");

    const malcolmSession = await login("malcolm");
    malcolmCookie = malcolmSession.cookie;
    const ripleySession = await login("ripley");
    ripleyCookie = ripleySession.cookie;

    publicPhoto = await uploadPhoto(ownerCookie);
    uploadedPhotos.push(publicPhoto);

    sharedPhoto = await uploadPhoto(ownerCookie, {
      sharedWith: [malcolm._id],
    });
    uploadedPhotos.push(sharedPhoto);

    privatePhoto = await uploadPhoto(ownerCookie, { sharedWith: [] });
    uploadedPhotos.push(privatePhoto);

    invalidSharePhoto = await uploadPhoto(ownerCookie, {
      sharedWith: [NONEXISTENT_USER_ID],
    });
    uploadedPhotos.push(invalidSharePhoto);

    mixedSharePhoto = await uploadPhoto(ownerCookie, {
      sharedWith: [malcolm._id, NONEXISTENT_USER_ID],
    });
    uploadedPhotos.push(mixedSharePhoto);
  });

  after(async function () {
    for (const photo of uploadedPhotos) {
      try {
        await deletePhoto(ownerCookie, photo._id);
      } catch (error) {
        // Best-effort cleanup.
      }
    }
  });

  describe("test upload share lists", function () {
    it("shows a photo with no share list to every logged in user",
      async function () {
        const ownerIds = await visiblePhotoIds(ownerCookie);
        const malcolmIds = await visiblePhotoIds(malcolmCookie);
        const ripleyIds = await visiblePhotoIds(ripleyCookie);

        assertIncludes(ownerIds, publicPhoto, "owner sees the public photo");
        assertIncludes(malcolmIds, publicPhoto, "Malcolm sees the public photo");
        assertIncludes(ripleyIds, publicPhoto, "Ripley sees the public photo");
      }
    );

    it("shares a photo with the users on its share list", async function () {
      const ownerIds = await visiblePhotoIds(ownerCookie);
      const malcolmIds = await visiblePhotoIds(malcolmCookie);
      const ripleyIds = await visiblePhotoIds(ripleyCookie);

      assertIncludes(ownerIds, sharedPhoto, "owner sees the shared photo");
      assertIncludes(malcolmIds, sharedPhoto, "shared user sees the photo");
      assertExcludes(ripleyIds, sharedPhoto, "unlisted user does not see it");
    });

    it("treats an empty share list as owner only", async function () {
      const ownerIds = await visiblePhotoIds(ownerCookie);
      const malcolmIds = await visiblePhotoIds(malcolmCookie);
      const ripleyIds = await visiblePhotoIds(ripleyCookie);

      assertIncludes(ownerIds, privatePhoto, "owner sees the private photo");
      assertExcludes(malcolmIds, privatePhoto, "other users do not see it");
      assertExcludes(ripleyIds, privatePhoto, "other users do not see it");
    });

    it("drops user ids that do not exist from the share list", async function () {
      const ownerIds = await visiblePhotoIds(ownerCookie);
      const malcolmIds = await visiblePhotoIds(malcolmCookie);
      const ripleyIds = await visiblePhotoIds(ripleyCookie);

      // The list contained only a nonexistent id, so it is effectively empty.
      assertIncludes(ownerIds, invalidSharePhoto, "owner sees the photo");
      assertExcludes(malcolmIds, invalidSharePhoto, "the id was not stored");
      assertExcludes(ripleyIds, invalidSharePhoto, "the id was not stored");
    });

    it("keeps valid ids from a mixed share list", async function () {
      const ownerIds = await visiblePhotoIds(ownerCookie);
      const malcolmIds = await visiblePhotoIds(malcolmCookie);
      const ripleyIds = await visiblePhotoIds(ripleyCookie);

      assertIncludes(ownerIds, mixedSharePhoto, "owner sees the photo");
      assertIncludes(
        malcolmIds,
        mixedSharePhoto,
        "the valid id was kept"
      );
      assertExcludes(
        ripleyIds,
        mixedSharePhoto,
        "the nonexistent id did not make it public"
      );
    });

    it("does not expose the share list in photo responses", async function () {
      const ownerPhotos = await getJson(
        "/photosOfUser/" + owner._id,
        ownerCookie
      );
      const ownerCopy = _.find(ownerPhotos, { _id: sharedPhoto._id });
      assert(ownerCopy, "owner can read the shared photo");
      assert.strictEqual(
        ownerCopy.shared_with,
        undefined,
        "owner response hides shared_with"
      );

      const sharedPhotos = await getJson(
        "/photosOfUser/" + owner._id,
        malcolmCookie
      );
      const sharedCopy = _.find(sharedPhotos, { _id: sharedPhoto._id });
      assert(sharedCopy, "shared user can read the photo");
      assert.strictEqual(
        sharedCopy.shared_with,
        undefined,
        "shared user response hides shared_with"
      );
    });

    it("rejects a malformed share list without creating a photo",
      async function () {
        const before = await getJson(
          "/photosOfUser/" + owner._id,
          ownerCookie
        );

        await assert.rejects(
          uploadPhoto(ownerCookie, { sharedWithRaw: "not-json" }),
          expectStatus(400),
          "invalid JSON is rejected"
        );
        await assert.rejects(
          uploadPhoto(ownerCookie, { sharedWithRaw: "{}" }),
          expectStatus(400),
          "a non-array share list is rejected"
        );

        const after = await getJson(
          "/photosOfUser/" + owner._id,
          ownerCookie
        );
        assert.strictEqual(
          after.length,
          before.length,
          "no photo was created for a rejected upload"
        );
      }
    );
  });

  describe("test actions on restricted photos", function () {
    it("rejects comments, likes, and favorites on unseen photos",
      async function () {
        const hiddenPhotos = [
          sharedPhoto,
          privatePhoto,
          invalidSharePhoto,
          mixedSharePhoto,
        ];

        for (const photo of hiddenPhotos) {
          await assert.rejects(
            postResponse(
              "/commentsOfPhoto/" + photo._id,
              { comment: "not allowed" },
              ripleyCookie
            ),
            expectStatus(404),
            "unlisted user cannot comment on " + photo._id
          );
          await assert.rejects(
            postResponse(
              "/likesOfPhoto/" + photo._id,
              {},
              ripleyCookie
            ),
            expectStatus(404),
            "unlisted user cannot like " + photo._id
          );
          await assert.rejects(
            postResponse(
              "/photos/" + photo._id + "/favorite",
              {},
              ripleyCookie
            ),
            expectStatus(404),
            "unlisted user cannot favorite " + photo._id
          );
        }

        // A nonexistent photo is reported the same way, so the endpoints do not
        // reveal whether a restricted photo exists.
        await assert.rejects(
          postResponse(
            "/commentsOfPhoto/" + NONEXISTENT_USER_ID,
            { comment: "not allowed" },
            ripleyCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          postResponse(
            "/likesOfPhoto/" + NONEXISTENT_USER_ID,
            {},
            ripleyCookie
          ),
          expectStatus(404)
        );
        await assert.rejects(
          postResponse(
            "/photos/" + NONEXISTENT_USER_ID + "/favorite",
            {},
            ripleyCookie
          ),
          expectStatus(404)
        );
      }
    );

    it("reports a malformed photo id as not found", async function () {
      await assert.rejects(
        postResponse(
          "/commentsOfPhoto/1",
          { comment: "not allowed" },
          ripleyCookie
        ),
        expectStatus(404),
        "a malformed photo id cannot be commented on"
      );
    });

    it("allows a shared user to comment, like, and favorite the photo",
      async function () {
        let comment;

        try {
          const like = await postJson(
            "/likesOfPhoto/" + sharedPhoto._id,
            {},
            malcolmCookie
          );
          assert.strictEqual(like.likeCount, 1);
          assert.strictEqual(like.likedByViewer, true);

          const favorite = await postJson(
            "/photos/" + sharedPhoto._id + "/favorite",
            {},
            malcolmCookie
          );
          assert.strictEqual(favorite.favoritedByViewer, true);

          const updatedPhoto = await postJson(
            "/commentsOfPhoto/" + sharedPhoto._id,
            { comment: "A comment on the shared photo" },
            malcolmCookie
          );
          comment = _.last(updatedPhoto.comments);
          assert(comment, "the comment was added");
          assert.strictEqual(
            comment.comment,
            "A comment on the shared photo"
          );

          const malcolmView = _.find(
            await getJson("/photosOfUser/" + owner._id, malcolmCookie),
            { _id: sharedPhoto._id }
          );
          assert(malcolmView, "shared user sees the photo");
          assert.strictEqual(malcolmView.likeCount, 1);
          assert.strictEqual(malcolmView.likedByViewer, true);
          assert.strictEqual(malcolmView.favoritedByViewer, true);
          assert(
            _.some(malcolmView.comments, { _id: comment._id }),
            "the shared user sees their own comment"
          );

          const favorites = await getJson("/favorites", malcolmCookie);
          assert(
            _.some(favorites, { _id: sharedPhoto._id }),
            "the favorites list includes a visible shared photo"
          );

          const ownerView = _.find(
            await getJson("/photosOfUser/" + owner._id, ownerCookie),
            { _id: sharedPhoto._id }
          );
          assert(ownerView, "owner sees the photo");
          assert.strictEqual(ownerView.likeCount, 1);
          assert.strictEqual(ownerView.favoritedByViewer, false);
          assert(
            _.some(ownerView.comments, { _id: comment._id }),
            "the owner sees the comment"
          );
        } finally {
          if (comment) {
            await deleteResponse(
              "/commentsOfPhoto/" + sharedPhoto._id + "/" + comment._id,
              malcolmCookie
            ).catch(function () {});
          }
          await deleteResponse(
            "/likesOfPhoto/" + sharedPhoto._id,
            malcolmCookie
          ).catch(function () {});
          await deleteResponse(
            "/photos/" + sharedPhoto._id + "/favorite",
            malcolmCookie
          ).catch(function () {});
        }
      }
    );
  });

  describe("test lists and counts", function () {
    it("excludes invisible photos from the usage summary", async function () {
      // Give the owner-only photo more comments than any photo the other
      // viewers can see, so it would win "most commented" if visibility were
      // ignored.
      const ownerPhotos = await getJson(
        "/photosOfUser/" + owner._id,
        ownerCookie
      );
      const maxVisibleComments = ownerPhotos.reduce(function (max, photo) {
        if (photo._id === privatePhoto._id) {
          return max;
        }
        return Math.max(max, (photo.comments || []).length);
      }, 0);

      for (let i = 0; i <= maxVisibleComments; i += 1) {
        // Sequential requests: each comment rewrites the whole photo document.
        await postJson(
          "/commentsOfPhoto/" + privatePhoto._id,
          { comment: "Owner-only comment " + i },
          ownerCookie
        );
      }

      const viewers = [
        {
          label: "owner",
          cookie: ownerCookie,
          hidden: [],
        },
        {
          label: "shared user",
          cookie: malcolmCookie,
          hidden: [privatePhoto, invalidSharePhoto],
        },
        {
          label: "unlisted user",
          cookie: ripleyCookie,
          hidden: [
            sharedPhoto,
            privatePhoto,
            invalidSharePhoto,
            mixedSharePhoto,
          ],
        },
      ];

      for (const viewer of viewers) {
        const visibleIds = await visiblePhotoIds(viewer.cookie);
        const usage = await getJson(
          "/usageOfUser/" + owner._id,
          viewer.cookie
        );

        for (const field of ["recentPhoto", "mostCommentedPhoto"]) {
          const entry = usage[field];
          assert(entry, viewer.label + " has a " + field);
          assertIncludes(
            visibleIds,
            entry,
            viewer.label + "'s " + field + " is visible"
          );
          for (const hidden of viewer.hidden) {
            assert.notStrictEqual(
              entry._id,
              hidden._id,
              viewer.label + "'s " + field + " must not be hidden"
            );
          }
        }
      }

      const ownerUsage = await getJson(
        "/usageOfUser/" + owner._id,
        ownerCookie
      );
      assert.strictEqual(
        ownerUsage.mostCommentedPhoto._id,
        privatePhoto._id,
        "the owner's most commented photo is the owner-only one"
      );
      assert.strictEqual(
        ownerUsage.mostCommentedPhoto.commentCount,
        maxVisibleComments + 1
      );
    });
  });
});
