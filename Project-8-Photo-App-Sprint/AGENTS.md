# AGENTS.md

CS142 Project 8 — **Photo App Sprint**. This directory is a self-contained app
(`package.json` here is the manifest); run all commands from this directory.
It is one of eight independent projects under the repo root — do not assume a
shared root manifest or workspace tooling.

## Setup / run

Docker (starts MongoDB + app, builds the client bundle, runs the server under
nodemon):

```sh
docker compose up --build
docker compose exec app node loadDatabase.js   # seed once; NOT run at startup
```

Manual local run (needs a local `mongod`):

```sh
npm install
node loadDatabase.js   # seeds DB cs142project8; wipes User/Photo/SchemaInfo first
npm run build          # webpack: photoShare.jsx -> compiled/photoShare.bundle.js
node webServer.js      # Express on :3000
```

- App: http://localhost:3000/photo-share.html (HTTP only; `file://` fails).
- DB URL from `MONGO_URL` env, else `mongodb://127.0.0.1/cs142project8`.
- `compiled/` is gitignored and **must be built** — `photo-share.html` only
  loads `compiled/photoShare.bundle.js`.
- `images/` is gitignored, but the 13 seed images (12 photos + `favicon.ico`)
  are force-added and tracked; newly uploaded photos stay untracked.
- Use `npm run build:w` for a webpack watcher. `nodemon.json` only watches
  server JS (`components/`, `client/`, etc. are ignored), so client edits rebuild
  via webpack, not a nodemon restart.

## Tests

`test/` is a **separate package** (`test/package.json`, its own `node_modules`,
NOT installed by this directory's `npm install`). Tests run **inside the `app`
container** (Node 22): the API suites need the server at `127.0.0.1:3000`, and
the host Node may be too new for mocha 9's yargs 16. Start the stack, then open a
shell in the container (`--user node` keeps files created on the bind mount
owned by your host user):

```sh
docker compose up -d
docker compose exec --user node app sh

# inside the container:
cd test && npm test                                   # installs deps, reseeds DB, all twelve suites
cd test && node_modules/.bin/mocha serverApiTest.js   # one file (after a first npm test)
cd test && node_modules/.bin/mocha usageApiTest.js    # usage summary endpoint
cd test && node_modules/.bin/mocha mentionsApiTest.js # @mentions endpoints
cd test && node_modules/.bin/mocha visibilityApiTest.js # photo visibility controls
cd test && node_modules/.bin/mocha activityApiTest.js # activity feed
cd test && node_modules/.bin/mocha sidebarActivityApiTest.js # per-user sidebar activity summary
cd test && node_modules/.bin/mocha deletionApiTest.js # deleting comments, photos, users
cd test && node_modules/.bin/mocha likesApiTest.js    # photo like votes
cd test && node_modules/.bin/mocha favoritesApiTest.js # favorites list
cd test && node_modules/.bin/mocha taggingApiTest.js  # photo tagging endpoints
```

Non-interactive equivalent:
`docker compose exec -T --user node app sh -c 'cd test && npm test'`.

Run whole files, not `--grep` subsets: suites such as `serverApiTest.js` depend
on login state set up by earlier tests in the same file.

`passwordApiTest.js` is a pure unit test (only `cs142password.js`) and needs no
server. Seeded logins use `login_name = last_name.toLowerCase()` with password
`weak` (e.g. `took`/`weak`; also malcolm, ripley, kenobi, ludgate, ousterhout).

Shared HTTP/session helpers (`login`, `getJson`, `postJson`, `uploadPhoto`,
`deletePhoto`, `deleteComment`, and common assertions) live in
`test/apiTestHelpers.js`; suite-specific shape checks stay with their suite.

## Lint

`npm run lint` ends with `|| exit 0`, so it **always exits 0** even when ESLint
reports errors. Read the output; don't trust the exit code. (The assignment's
style points require zero ESLint errors.)

## Architecture (not obvious from filenames)

Layered backend — keep the layers separate:
`webServer.js` (wiring only) → `server/routes/index.js` (URL table) →
`server/controllers/*` (HTTP only) → `server/services/*` (business rules) →
`server/models/*Repo.js` (Mongoose queries). `requireLogin` guards all
user/photo routes; `/` and `/test/:p1` are deliberately public. Route order
matters: `/user/list` precedes `/user/:id`.

Frontend mirrors it: `photoShare.jsx` (entry) → `client/views/*View.jsx` →
`client/controllers/use*.js` (hooks) → `client/model/api/*` (axios) +
`client/model/store/session.js` (observable store). `components/*/index.jsx` are
the MUI presentational components.

Auth is an `express-session` cookie; `/admin/currentUser` restores login on
reload. Uploads go through multer into `images/` with unique, sanitized names.
`advancedFeatures` in the session store is intentionally non-persistent (starts
off on every launch).

Photo tagging is exposed only in the single-photo stepper (the optional
advanced view): enable **Advanced features** in the top bar to reach it. Tags
are embedded in `Photo.tags` with coordinates stored as 0-1 fractions of the
image, so the overlay is independent of scroll and display size. A tag may be
removed by the photo's owner or by the user who created it; deleting the
tagged user removes the tag, while deleting the creator only clears
`tagged_by`.

## Before submitting

- Delete `node_modules/` (including `test/node_modules/`) and `compiled/`, then
  verify `node loadDatabase.js` and `node webServer.js` still work from clean.
