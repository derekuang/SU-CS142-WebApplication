/**
 * Session/app state store (client-side Model).
 *
 * A tiny dependency-free observable holding the app-wide state that used to
 * live in the top-level PhotoShare component: the logged in user, whether the
 * initial session check is still in flight, a token that tells the photos view
 * to refetch after a new photo is added, and whether the optional advanced
 * features are enabled.
 *
 * `advancedFeatures` is deliberately not persisted: the assignment requires it
 * to start disabled on every app launch.
 *
 * `subscribe` returns an unsubscribe function so React components can clean up
 * on unmount.
 */

const listeners = new Set();

let state = {
  user: null,
  checkingSession: true,
  photosRefreshToken: 0,
  advancedFeatures: false,
};

/**
 * @returns {object} The current state (do not mutate in place).
 */
function getState() {
  return state;
}

/**
 * Merge a partial state update and notify every subscriber.
 *
 * @param {object} partial The fields to change.
 */
function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(state));
}

/**
 * Register a change listener.
 *
 * @param {Function} listener Called with the new state after every update.
 * @returns {Function} Unsubscribe callback.
 */
function subscribe(listener) {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

export { getState, setState, subscribe };
