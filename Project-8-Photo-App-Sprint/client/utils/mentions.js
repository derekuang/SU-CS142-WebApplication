/**
 * Helpers for rendering @mentions in a comment's text.
 *
 * react-mentions encodes a chosen user as `@[display](id)` inside the comment
 * text. The server keeps that markup (so the mention stays in place) and stores
 * the verified mentioned ids on the comment. This module turns the markup back
 * into a link to the mentioned user's profile, and only when the id is in that
 * verified set, so a stale or forged mention is shown as plain text rather than
 * linking to a nonexistent user.
 *
 * Comment text is rendered as HTML (the app has always allowed simple markup in
 * comments), so the rest of the text is passed through untouched.
 */

const MENTION_PATTERN = /@\[([^\]]*)\]\(([^)]+)\)/g;

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
 * @param {string} text The stored comment text (may contain `@[name](id)`).
 * @param {Array} mentions The comment's verified mentioned users/ids.
 * @returns {string} HTML with verified mentions turned into `#/users/:id`
 *   anchors and any other markup shown as plain `@name`.
 */
function renderCommentHtml(text, mentions) {
  const validIds = mentionIdSet(mentions);
  return String(text || "").replace(MENTION_PATTERN, (full, display, id) => {
    if (validIds.has(id)) {
      return `<a href="#/users/${id}" class="cs142-mention">@${display}</a>`;
    }
    return `@${display}`;
  });
}

export default renderCommentHtml;
