"use strict";

/**
 * Mocha test of the CS142 Project 8 @mention-in-comments API. Run using:
 *   node_modules/.bin/mocha mentionsApiTest.js
 *
 * The tests use a dedicated uploaded photo owned by took, add comments to it
 * through the real endpoint, and remove those comments (and the photo) again.
 * That keeps the seeded data untouched and makes the suite safe to run after
 * the other API suites.
 */

const assert = require("assert");
const _ = require("lodash");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const port = 3000;
const host = "127.0.0.1";

// Exact shapes of the mention data the API exposes.
const mentionUserProperties = ["_id", "first_name", "last_name"];
const mentionPhotoProperties = ["_id", "file_name", "date_time", "owner"];

function makeFullUrl(url) {
  return "http://" + host + ":" + port + url;
}

function authHeaders(cookie) {
  return { Cookie: cookie };
}

function assertEqualDates(d1, d2, message) {
  assert.strictEqual(
    new Date(d1).valueOf(),
    new Date(d2).valueOf(),
    message + ": expected " + d1 + " to equal " + d2
  );
}

function assertAllowedProperties(object, allowedProperties, label) {
  const extraProperties = _.difference(
    Object.keys(object),
    allowedProperties
  );
  assert.strictEqual(
    extraProperties.length,
    0,
    label + " has extra properties: " + extraProperties
  );
}

async function login(loginName) {
  const response = await axios.post(makeFullUrl("/admin/login"), {
    login_name: loginName,
    password: "weak",
  });
  const cookie =
    response.headers["set-cookie"] && response.headers["set-cookie"][0];
  assert.ok(cookie, "Session cookie found for " + loginName);
  return { cookie: cookie, user: response.data };
}

async function getJson(path, cookie) {
  const response = await axios.get(makeFullUrl(path), {
    headers: authHeaders(cookie),
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");
  return response.data;
}

async function uploadPhoto(cookie, sharedWith) {
  const form = new FormData();
  form.append(
    "uploadedphoto",
    fs.createReadStream(__dirname + "/testPhoto.jpg"),
    {
      filename: "p" + String(new Date().valueOf()) + ".jpg",
      contentType: "image/jpg",
    }
  );
  if (sharedWith !== undefined) {
    form.append("shared_with", JSON.stringify(sharedWith));
  }

  const response = await axios.post(makeFullUrl("/photos/new"), form, {
    headers: {
      "Content-Type": "multipart/form-data; boundary=" + form._boundary,
      Cookie: cookie,
    },
  });
  assert.strictEqual(response.status, 200, "HTTP response status code 200");
  assert.ok(response.data._id, "upload returned the photo's _id");
  return response.data;
}

describe("CS142 Photo App: Mentions API Tests", function () {
  // Several tests upload a photo and add comments, so allow more than Mocha's
  // default 2s.
  this.timeout(15000);

  let sessionCookie;
  let author;
  let userList;
  let ripley;
  let malcolm;
  let photo; // Dedicated photo owned by took, used by most tests.
  let commentsToDelete = [];

  function findUser(lastName) {
    const user = _.find(userList, { last_name: lastName });
    assert(user, "could not find user " + lastName);
    return user;
  }

  async function addComment(photoId, text) {
    const response = await axios.post(
      makeFullUrl("/commentsOfPhoto/" + photoId),
      { comment: text },
      { headers: authHeaders(sessionCookie) }
    );
    assert.strictEqual(response.status, 200, "HTTP response status code 200");

    const comments = response.data.comments || [];
    const comment = comments[comments.length - 1];
    assert(comment, "the updated photo contains the new comment");
    assert.strictEqual(
      comment.comment,
      text.trim(),
      "the comment text is stored unchanged"
    );

    commentsToDelete.push({ photoId: photoId, commentId: comment._id });
    return comment;
  }

  async function getPhoto(photoId) {
    const photos = await getJson(
      "/photosOfUser/" + author._id,
      sessionCookie
    );
    const found = _.find(photos, { _id: photoId });
    assert(found, "could not find photo " + photoId);
    return found;
  }

  async function getComment(photoId, commentId) {
    const foundPhoto = await getPhoto(photoId);
    const comment = _.find(foundPhoto.comments || [], { _id: commentId });
    assert(comment, "could not find comment " + commentId);
    return comment;
  }

  async function deleteComment(entry) {
    try {
      await axios.delete(
        makeFullUrl(
          "/commentsOfPhoto/" + entry.photoId + "/" + entry.commentId
        ),
        { headers: authHeaders(sessionCookie) }
      );
    } catch (error) {
      // Best-effort cleanup: the test may already have deleted the comment.
    }
  }

  function assertMentionUser(mention, expected, label) {
    assert.strictEqual(
      String(mention._id),
      String(expected._id),
      label + " has the wrong _id"
    );
    assert.strictEqual(
      mention.first_name,
      expected.first_name,
      label + " has the wrong first_name"
    );
    assert.strictEqual(
      mention.last_name,
      expected.last_name,
      label + " has the wrong last_name"
    );
    assertAllowedProperties(mention, mentionUserProperties, label);
  }

  function assertMentionPhoto(entry, expectedPhoto, expectedOwner, label) {
    assert.strictEqual(
      String(entry._id),
      String(expectedPhoto._id),
      label + " has the wrong _id"
    );
    assert.strictEqual(
      entry.file_name,
      expectedPhoto.file_name,
      label + " has the wrong file_name"
    );
    assertEqualDates(entry.date_time, expectedPhoto.date_time, label);

    assert(entry.owner, label + " has an owner");
    assertMentionUser(entry.owner, expectedOwner, label + " owner");
    assertAllowedProperties(entry, mentionPhotoProperties, label);
  }

  before(async function () {
    const session = await login("took");
    sessionCookie = session.cookie;
    author = session.user;
    userList = await getJson("/user/list", sessionCookie);
    ripley = findUser("Ripley");
    malcolm = findUser("Malcolm");
    photo = await uploadPhoto(sessionCookie);
  });

  beforeEach(function () {
    commentsToDelete = [];
  });

  afterEach(async function () {
    const entries = commentsToDelete;
    commentsToDelete = [];
    for (const entry of entries) {
      await deleteComment(entry);
    }
  });

  after(async function () {
    if (!photo) {
      return;
    }
    try {
      await axios.delete(makeFullUrl("/photos/" + photo._id), {
        headers: authHeaders(sessionCookie),
      });
    } catch (error) {
      // Best-effort cleanup.
    }
  });

  describe("test /mentionsOfUser/:id authentication", function () {
    it("errors getting mentions if not logged in", async function () {
      await assert.rejects(
        axios.get(makeFullUrl("/mentionsOfUser/" + ripley._id)),
        function (error) {
          return error.response && error.response.status === 401;
        }
      );
    });
  });

  describe("test /mentionsOfUser/:id", function () {
    it("returns an empty list when the user has no mentions", async function () {
      const mentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      assert.deepStrictEqual(mentions, []);
    });

    it("stores a valid mention and lists the photo for the mentioned user",
      async function () {
        const text = "Hello @[Ellen Ripley](" + ripley._id + "), nice photo!";
        const added = await addComment(photo._id, text);

        const stored = await getComment(photo._id, added._id);
        assert.strictEqual(
          stored.comment,
          text,
          "the mention markup is kept in the comment text"
        );
        assert.strictEqual(
          String(stored.user._id),
          String(author._id),
          "the comment keeps its author"
        );
        assert.strictEqual(stored.mentions.length, 1, "one mention is stored");
        assertMentionUser(stored.mentions[0], ripley, "stored mention");

        const mentions = await getJson(
          "/mentionsOfUser/" + ripley._id,
          sessionCookie
        );
        assert.strictEqual(mentions.length, 1, "one photo is listed");
        assertMentionPhoto(mentions[0], photo, author, "mentions list entry");
        assert.strictEqual(
          mentions[0].comments,
          undefined,
          "the mentions list does not expose comments"
        );
      }
    );

    it("collapses repeated mentions of the same user", async function () {
      const text =
        "@[Ellen Ripley](" +
        ripley._id +
        ") and @[Ellen Ripley](" +
        ripley._id +
        ") again";
      const added = await addComment(photo._id, text);

      const stored = await getComment(photo._id, added._id);
      assert.strictEqual(
        stored.mentions.length,
        1,
        "duplicate ids in one comment are collapsed"
      );

      // A second comment mentioning the same user must not list the photo twice.
      await addComment(photo._id, "Another @[Ellen Ripley](" + ripley._id + ")");
      const mentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      const matching = _.filter(mentions, { _id: photo._id });
      assert.strictEqual(
        matching.length,
        1,
        "a photo is listed once even when several comments mention the user"
      );
    });

    it("stores each distinct mentioned user", async function () {
      const text =
        "@[Ellen Ripley](" +
        ripley._id +
        ") and @[Ian Malcolm](" +
        malcolm._id +
        ")";
      const added = await addComment(photo._id, text);

      const stored = await getComment(photo._id, added._id);
      assert.strictEqual(stored.mentions.length, 2, "two users are mentioned");
      const mentionedIds = _.map(stored.mentions, "_id").sort();
      const expectedIds = [String(ripley._id), String(malcolm._id)].sort();
      assert.deepStrictEqual(mentionedIds, expectedIds);

      stored.mentions.forEach(function (mention) {
        const expected =
          String(mention._id) === String(ripley._id) ? ripley : malcolm;
        assertMentionUser(mention, expected, "stored mention");
      });

      const ripleyMentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      assert(
        _.some(ripleyMentions, { _id: photo._id }),
        "Ripley's mentions include the photo"
      );

      const malcolmMentions = await getJson(
        "/mentionsOfUser/" + malcolm._id,
        sessionCookie
      );
      assert(
        _.some(malcolmMentions, { _id: photo._id }),
        "Malcolm's mentions include the photo"
      );
    });

    it("drops malformed and nonexistent mentions without failing",
      async function () {
        const text =
          "Hi @[Ghost](000000000000000000000000), " +
          "@[Broken](not-an-object-id) and @[Ellen Ripley](" +
          ripley._id +
          ")";
        const added = await addComment(photo._id, text);

        const stored = await getComment(photo._id, added._id);
        assert.strictEqual(
          stored.comment,
          text,
          "the comment with invalid mentions is still stored"
        );
        assert.strictEqual(
          stored.mentions.length,
          1,
          "only the existing user is stored"
        );
        assertMentionUser(stored.mentions[0], ripley, "valid mention");

        const onlyInvalid = await addComment(
          photo._id,
          "Only @[Ghost](000000000000000000000000) and " +
            "@[Broken](not-an-object-id)"
        );
        const storedInvalid = await getComment(photo._id, onlyInvalid._id);
        assert.deepStrictEqual(
          storedInvalid.mentions,
          [],
          "invalid mentions are not stored at all"
        );

        const ghostMentions = await getJson(
          "/mentionsOfUser/000000000000000000000000",
          sessionCookie
        );
        assert.deepStrictEqual(ghostMentions, []);

        const malformedMentions = await getJson(
          "/mentionsOfUser/not-an-object-id",
          sessionCookie
        );
        assert.deepStrictEqual(malformedMentions, []);
      }
    );

    it("removes the mention when its comment is deleted", async function () {
      const added = await addComment(
        photo._id,
        "Bye @[Ellen Ripley](" + ripley._id + ")"
      );

      let mentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      assert(
        _.some(mentions, { _id: photo._id }),
        "the photo is listed before the comment is deleted"
      );

      await axios.delete(
        makeFullUrl(
          "/commentsOfPhoto/" + photo._id + "/" + added._id
        ),
        { headers: authHeaders(sessionCookie) }
      );
      commentsToDelete = commentsToDelete.filter(function (entry) {
        return entry.commentId !== added._id;
      });

      mentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      assert.strictEqual(
        _.some(mentions, { _id: photo._id }),
        false,
        "the photo is no longer listed after the comment is deleted"
      );
    });

    it("lists mentioning photos newest first", async function () {
      const tookPhotos = await getJson(
        "/photosOfUser/" + author._id,
        sessionCookie
      );
      const older = _.minBy(tookPhotos, function (candidate) {
        return new Date(candidate.date_time).valueOf();
      });
      assert(older, "could not find an older photo");
      assert.notStrictEqual(older._id, photo._id);

      await addComment(
        older._id,
        "Old @[Ellen Ripley](" + ripley._id + ")"
      );
      await addComment(
        photo._id,
        "New @[Ellen Ripley](" + ripley._id + ")"
      );

      const mentions = await getJson(
        "/mentionsOfUser/" + ripley._id,
        sessionCookie
      );
      const ids = _.map(mentions, "_id");
      assert(ids.indexOf(photo._id) !== -1, "the new photo is listed");
      assert(ids.indexOf(older._id) !== -1, "the old photo is listed");
      assert(
        ids.indexOf(photo._id) < ids.indexOf(older._id),
        "the newest photo is listed first"
      );

      for (let i = 1; i < mentions.length; i += 1) {
        assert(
          new Date(mentions[i - 1].date_time) >=
            new Date(mentions[i].date_time),
          "mentions are sorted newest first"
        );
      }
    });

    it("omits mentions on photos the viewer cannot see", async function () {
      let restricted;
      try {
        restricted = await uploadPhoto(sessionCookie, [malcolm._id]);
        await addComment(
          restricted._id,
          "Restricted @[Ellen Ripley](" + ripley._id + ")"
        );

        const ownerMentions = await getJson(
          "/mentionsOfUser/" + ripley._id,
          sessionCookie
        );
        assert(
          _.some(ownerMentions, { _id: restricted._id }),
          "the owner sees the mention"
        );

        const sharedSession = await login("malcolm");
        const sharedMentions = await getJson(
          "/mentionsOfUser/" + ripley._id,
          sharedSession.cookie
        );
        assert(
          _.some(sharedMentions, { _id: restricted._id }),
          "a user on the share list sees the mention"
        );

        const otherSession = await login("ripley");
        const hiddenMentions = await getJson(
          "/mentionsOfUser/" + ripley._id,
          otherSession.cookie
        );
        assert.strictEqual(
          _.some(hiddenMentions, { _id: restricted._id }),
          false,
          "a user not on the share list does not see the mention"
        );
      } finally {
        if (restricted) {
          commentsToDelete = commentsToDelete.filter(function (entry) {
            return entry.photoId !== restricted._id;
          });
          try {
            await axios.delete(makeFullUrl("/photos/" + restricted._id), {
              headers: authHeaders(sessionCookie),
            });
          } catch (error) {
            // Best-effort cleanup.
          }
        }
      }
    });
  });
});
