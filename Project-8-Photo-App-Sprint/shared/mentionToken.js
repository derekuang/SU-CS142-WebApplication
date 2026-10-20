"use strict";

/**
 * The mention token grammar, defined once.
 *
 * react-mentions encodes a chosen suggestion as `@[display](id)`. The server
 * extracts the ids to validate and store; the client renders the same markup as
 * profile links. Sharing the decomposition means the parser and the renderer
 * cannot drift, and the token's shape is one contract instead of two regexes.
 *
 * `parseMentions` returns a complete partition of the input: concatenating each
 * segment's `text` or `raw` reproduces the source exactly.
 */

const MENTION_PATTERN = /@\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Split a comment into text and mention segments.
 *
 * A malformed token (no closing bracket or parenthesis, an empty id, or a `]`
 * inside the display) is left in a text segment, which is how both the server
 * and the client treated it before the grammar was shared.
 *
 * @param {string} text The comment text.
 * @returns {Array<{type: "text", text: string}|
 *   {type: "mention", raw: string, display: string, id: string}>} The segments,
 *   in order. Empty text segments are omitted.
 */
function parseMentions(text) {
  const source = String(text || "");
  const segments = [];
  let cursor = 0;

  // matchAll needs the global flag and returns a fresh iterator, so concurrent
  // calls never share regex state.
  for (const match of source.matchAll(MENTION_PATTERN)) {
    if (match.index > cursor) {
      segments.push({ type: "text", text: source.slice(cursor, match.index) });
    }
    segments.push({
      type: "mention",
      raw: match[0],
      display: match[1],
      id: match[2],
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) {
    segments.push({ type: "text", text: source.slice(cursor) });
  }

  return segments;
}

module.exports = {
  parseMentions,
};
