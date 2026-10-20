import mentionToken from "../../shared/mentionToken.js";

/**
 * Helpers for rendering @mentions in a comment's text.
 *
 * The token grammar is owned by `shared/mentionToken.js`; this module is the
 * client adapter. react-mentions encodes a chosen user as `@[display](id)`
 * inside the comment text. The server keeps that markup (so the mention stays
 * in place) and stores the verified mentioned ids on the comment. This module
 * turns the markup back into a link to the mentioned user's profile, and only
 * when the id is in that verified set, so a stale or forged mention is shown as
 * plain text rather than linking to a nonexistent user.
 *
 * Comment text is rendered as HTML (the app has always allowed simple markup in
 * comments), so the rest of the text is passed through untouched.
 */

const { parseMentions } = mentionToken;

/**
 * Normalize a comment's `mentions` into a set of id strings. The field may
 * hold populated users (`{ _id, ... }`) or raw ids, so both are accepted.
 *
 * @param {Array} mentions
 * @returns {Set<string>}
 */
function mentionIdSet(mentions) {
  const ids = new Set();
  (mentions || []).forEach((mention) => {
    const id = mention && mention._id ? mention._id : mention;
    if (id) {
      ids.add(String(id));
    }
  });
  return ids;
}

/**
 * Convert a comment's mention markup into links to each mentioned user.
 *
 * The shared parser owns the token grammar and the text between tokens; this
 * function only chooses the HTML for a mention: a link when the id is in the
 * comment's verified set, plain `@display` otherwise.
 *
 * @param {string} text The stored comment text (may contain `@[name](id)`).
 * @param {Array} mentions The comment's verified mentioned users/ids.
 * @returns {string} HTML with verified mentions turned into `#/users/:id`
 *   anchors and any other markup shown as plain `@name`.
 */
function renderCommentHtml(text, mentions) {
  const validIds = mentionIdSet(mentions);
  return parseMentions(text)
    .map((segment) => {
      if (segment.type === "text") {
        return segment.text;
      }
      if (validIds.has(segment.id)) {
        return `<a href="#/users/${segment.id}" class="cs142-mention">@${segment.display}</a>`;
      }
      return `@${segment.display}`;
    })
    .join("");
}

export default renderCommentHtml;
