import React from "react";

import useUserList from "../../client/controllers/useUserList.js";
import UserListView from "../../client/views/UserListView.jsx";

import "./styles.css";

/**
 * Define UserList, a React component of CS142 Project 5.
 *
 * Thin controller: fetches the users via the hook and hands them to the
 * presentational view.
 */
function UserList() {
  const { users } = useUserList();

  return <UserListView users={users} />;
}

export default UserList;
