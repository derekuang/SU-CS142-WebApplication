"use strict";

/**
 * Mocha unit test of the photo visibility rule. Run using:
 *   node_modules/.bin/mocha photoVisibilityTest.js
 *
 * The predicate is pure, so this suite needs no server: it pins the rule's
 * truth table. The query clause is covered end to end by the API suites
 * (visibility, usage, mentions, favorites, and activity).
 */

const assert = require("assert");

const {
  isVisible,
  visibilityClause,
} = require("../server/models/photoVisibility.js");

const OWNER_ID = "0123456789abcdef01234567";
const VIEWER_ID = "0123456789abcdef01234568";
const OTHER_ID = "0123456789abcdef01234569";

/**
 * Build a photo in the shape the predicate consumes. Passing `undefined`
 * omits `shared_with`, which is the public state.
 *
 * @param {string} ownerId
 * @param {Array<string>|null} [sharedWith]
 * @returns {object}
 */
function makePhoto(ownerId, sharedWith) {
  const photo = { _id: "photo", user_id: ownerId };
  if (sharedWith !== undefined) {
    photo.shared_with = sharedWith;
  }
  return photo;
}

describe("CS142 Photo App: Photo Visibility Rule", function () {
  describe("test isVisible", function () {
    it("always lets the owner see their own photo", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID, []), OWNER_ID),
        true,
        "owner sees an owner-only photo",
      );
    });

    it("lets any viewer see a photo with no share list", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID), VIEWER_ID),
        true,
        "absent shared_with is public",
      );
    });

    it("treats a stored null share list as public", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID, null), VIEWER_ID),
        true,
        "null shared_with is public",
      );
    });

    it("lets a listed viewer see a shared photo", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID, [VIEWER_ID]), VIEWER_ID),
        true,
        "listed viewer sees the photo",
      );
    });

    it("hides a shared photo from a viewer who is not listed", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID, [OTHER_ID]), VIEWER_ID),
        false,
        "unlisted viewer does not see the photo",
      );
    });

    it("hides an owner-only photo from every other viewer", function () {
      assert.strictEqual(
        isVisible(makePhoto(OWNER_ID, []), VIEWER_ID),
        false,
        "empty share list means owner only",
      );
    });

    it("treats a missing photo as invisible", function () {
      assert.strictEqual(isVisible(null, VIEWER_ID), false);
    });
  });

  describe("test visibilityClause", function () {
    it("rejects a malformed viewer id instead of building a clause",
      function () {
        assert.throws(function () {
          visibilityClause("not-an-object-id");
        });
      });
  });
});
