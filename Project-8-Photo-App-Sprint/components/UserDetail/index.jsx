import React from "react";
import { withRouter } from "react-router-dom";

import useUserDetail from "../../client/controllers/useUserDetail.js";
import UserDetailView from "../../client/views/UserDetailView.jsx";

import "./styles.css";

/**
 * Define UserDetail, a React component of CS142 Project 8.
 *
 * Thin controller: fetches the user for the routed id and hands it to the
 * presentational view.
 */
function UserDetail(props) {
  const { user } = useUserDetail(props.match.params.userId);

  return <UserDetailView user={user} />;
}

export default withRouter(UserDetail);
