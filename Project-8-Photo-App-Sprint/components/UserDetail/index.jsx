import React from "react";
import { withRouter } from "react-router-dom";

import useUserDetail from "../../client/controllers/useUserDetail.js";
import UserDetailView from "../../client/views/UserDetailView.jsx";

import "./styles.css";

/**
 * Define UserDetail, a React component of CS142 Project 8.
 *
 * Thin controller: fetches the user for the routed id and their usage summary,
 * then hands both to the presentational view. `onOpenStepper` is forwarded so a
 * usage thumbnail can switch the shell into the single-photo stepper before
 * navigating to the linked photo.
 */
function UserDetail(props) {
  const { user, usage, mentions } = useUserDetail(props.match.params.userId);

  return (
    <UserDetailView
      user={user}
      usage={usage}
      mentions={mentions}
      onOpenStepper={props.onOpenStepper}
    />
  );
}

export default withRouter(UserDetail);
