"use strict";

/**
 * Mocha unit test of the shared mention-token parser. Run using:
 *   node_modules/.bin/mocha mentionTokenTest.js
 *
 * The parser is pure, so this suite needs no server. The server and the client
 * both build on it, so pinning the decomposition pins the wire format they
 * share.
 */

const assert = require("assert");

const { parseMentions } = require("../shared/mentionToken.js");

const ADA = "0123456789abcdef01234567";
const GRACE = "0123456789abcdef01234568";

/**
 * Re-assemble the input from its segments. The parser promises that this is
 * always the original string.
 */
function joinSegments(segments) {
  return segments
    .map((segment) => (segment.type === "text" ? segment.text : segment.raw))
    .join("");
}

describe("CS142 Photo App: Mention Token Tests", function () {
  it("returns no segments for empty input", function () {
    assert.deepStrictEqual(parseMentions(""), []);
    assert.deepStrictEqual(parseMentions(null), []);
    assert.deepStrictEqual(parseMentions(undefined), []);
  });

  it("returns one text segment for text without a mention", function () {
    assert.deepStrictEqual(parseMentions("Just a comment"), [
      { type: "text", text: "Just a comment" },
    ]);
  });

  it("splits a mention out of the surrounding text", function () {
    const text = "Hi @[Ada Lovelace](" + ADA + ")!";
    assert.deepStrictEqual(parseMentions(text), [
      { type: "text", text: "Hi " },
      {
        type: "mention",
        raw: "@[Ada Lovelace](" + ADA + ")",
        display: "Ada Lovelace",
        id: ADA,
      },
      { type: "text", text: "!" },
    ]);
    assert.strictEqual(joinSegments(parseMentions(text)), text);
  });

  it("does not emit empty text segments around adjacent mentions", function () {
    const text = "@[Ada](" + ADA + ")@[Grace](" + GRACE + ")";
    const segments = parseMentions(text);

    assert.strictEqual(segments.length, 2);
    assert.strictEqual(segments[0].type, "mention");
    assert.strictEqual(segments[1].type, "mention");
    assert.strictEqual(joinSegments(segments), text);
  });

  it("returns every occurrence of a duplicated id", function () {
    const text = "@[Ada](" + ADA + ") and @[Ada again](" + ADA + ")";
    const mentions = parseMentions(text).filter(function (segment) {
      return segment.type === "mention";
    });

    assert.strictEqual(mentions.length, 2);
    assert.strictEqual(mentions[0].id, ADA);
    assert.strictEqual(mentions[1].id, ADA);
  });

  it("leaves malformed markup in text segments", function () {
    const malformed = [
      "@Ada",
      "@[Ada](",
      "@[Ada]()",
      "@[A]da](" + ADA + ")",
      "plain @ sign",
    ];

    malformed.forEach(function (text) {
      const segments = parseMentions(text);
      const hasMention = segments.some(function (segment) {
        return segment.type === "mention";
      });

      assert.strictEqual(hasMention, false, "no mention in " + text);
      assert.strictEqual(joinSegments(segments), text);
    });
  });

  it("reproduces the input from its segments", function () {
    const inputs = [
      "",
      "no mentions here",
      "@[Ada](" + ADA + ")",
      "before @[Ada](" + ADA + ") after",
      "@[Ada](" + ADA + ")@[Grace](" + GRACE + ") tail",
      "a @ b ] c ( d )",
    ];

    inputs.forEach(function (text) {
      assert.strictEqual(joinSegments(parseMentions(text)), text);
    });
  });
});
