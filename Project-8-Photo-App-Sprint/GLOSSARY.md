# Glossary

The domain vocabulary this project uses in code, comments, and reviews. Each
entry gives the meaning the code relies on, not a general definition.

- **Photo** — An image uploaded by one user, together with its embedded
  comments and tags, its like and favorite lists, and its share list.
- **Owner** — The user who uploaded a photo (`Photo.user_id`). The owner always
  sees their own photos and is the only user who may delete them.
- **Viewer** — The logged-in user a request is evaluated for; their id comes
  from the session, never from the request body.
- **Visibility** — The three-state share rule: a photo with no share list is
  public, one with a list is visible to the owner and the listed users, and an
  empty list means owner only.
- **Share list** — The `Photo.shared_with` array. Its three states (absent,
  populated, empty) encode Visibility; absent and empty are different states,
  so the field is declared `default: undefined`.
- **Visibility module** — `server/models/photoVisibility.js`, the one place the
  rule is defined. It offers a predicate for an already-loaded photo and a
  query clause for list and aggregation queries.
