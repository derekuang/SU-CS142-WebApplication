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
- `images/` is gitignored too; the seeded photos live there and are not in git.
- Use `npm run build:w` for a webpack watcher. `nodemon.json` only watches
  server JS (`components/`, `client/`, etc. are ignored), so client edits rebuild
  via webpack, not a nodemon restart.

## Tests

`test/` is a **separate package** (`test/package.json`, its own `node_modules`,
NOT installed by this directory's `npm install`). `npm test` installs those
dependencies in its `pretest` hook and then reseeds the database. The API tests
need a **running server** on `127.0.0.1:3000`.

```sh
cd test && npm test                                   # installs deps, reseeds DB, all five suites
cd test && node_modules/.bin/mocha serverApiTest.js   # one file (after a first npm install/test)
cd test && node_modules/.bin/mocha usageApiTest.js    # usage summary endpoint
cd test && node_modules/.bin/mocha mentionsApiTest.js # @mentions endpoints
cd test && node_modules/.bin/mocha serverApiTest.js --grep "user/list"
```

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

## Before submitting

- Delete `node_modules/` (including `test/node_modules/`) and `compiled/`, then
  verify `node loadDatabase.js` and `node webServer.js` still work from clean.
