/**
 * The photo visibility rule, defined once.
 *
 * A photo's `shared_with` field encodes three states:
 *   - absent: public - any viewer may see it;
 *   - an array of user ids: shared - the owner and the listed users may see it;
 *   - an empty array: owner only.
 *
 * The rule is needed in two projections. Write paths already hold the photo
 * document and ask a predicate; list and activity queries must filter in the
 * database and ask for a query clause. Both projections live here so a privacy
 * fix can never reach only the copies that happen to call one of them.
 */

const mongoose = require("mongoose");

/**
 * Decide whether a viewer may see a photo that has already been loaded.
 *
 * The owner always may. An absent (or explicitly null) `shared_with` is public,
 * so anyone may. A present list - including an empty one - only lets the owner
 * and the listed users.
 *
 * @param {object|null|undefined} photo A Photo document or plain object with
 *   `user_id` and (optionally) `shared_with`.
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {boolean}
 */
function isVisible(photo, viewerId) {
  if (!photo) {
    return false;
  }
  if (String(photo.user_id) === String(viewerId)) {
    return true;
  }
  if (photo.shared_with === undefined || photo.shared_with === null) {
    return true;
  }
  return photo.shared_with.some((id) => String(id) === String(viewerId));
}

/**
 * Build the query clause that limits photos to those a viewer may see.
 *
 * The clause is deliberately identical for every caller, including queries
 * already scoped to one owner: the `user_id: viewer` branch is redundant there
 * but can never change a result, and one shape means every query inherits the
 * rule instead of restating it. `null` is listed alongside `$exists: false` so
 * the clause agrees with `isVisible`, which also treats an explicit null as
 * public (the schema's `default: undefined` means no code path writes one).
 *
 * Aggregation pipelines do not cast ids, so the viewer is normalised to an
 * `ObjectId` here; `find` queries accept the same value unchanged. The viewer
 * id is expected to be valid (it comes from the session); callers that can
 * receive arbitrary input keep their own validity guard.
 *
 * @param {string} viewerId The logged in user's `_id`.
 * @returns {{$or: Array<object>}} A clause to merge into a query or `$match`.
 */
function visibilityClause(viewerId) {
  const viewer = new mongoose.Types.ObjectId(viewerId);
  return {
    $or: [
      { user_id: viewer },
      { shared_with: { $exists: false } },
      { shared_with: null },
      { shared_with: viewer },
    ],
  };
}

module.exports = {
  isVisible,
  visibilityClause,
};
