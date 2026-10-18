import React from "react";

import useUserActivity from "../../client/controllers/useUserActivity.js";
import UserListView from "../../client/views/UserListView.jsx";

import "./styles.css";

/**
 * Define UserList, a React component of CS142 Project 8.
 *
 * Thin controller: the hook fetches and polls every user's latest visible
 * activity, and the view renders the current user separately from the rest.
 * `currentUser` comes from the app shell so the view can mark "You".
 */
function UserList({ currentUser }) {
  const { entries, error } = useUserActivity();

  return (
    <UserListView
      entries={entries}
      currentUser={currentUser}
      error={error}
    />
  );
}

export default UserList;
