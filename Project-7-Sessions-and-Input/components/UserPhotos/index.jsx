import React from "react";
import { withRouter } from "react-router-dom";

import useUserPhotos from "../../client/controllers/useUserPhotos.js";
import UserPhotosView from "../../client/views/UserPhotosView.jsx";

import "./styles.css";

/**
 * Define UserPhotos, a React component of CS142 Project 5.
 *
 * Thin controller: fetches the routed user's photos (and provides the comment
 * action) and hands them to the presentational view.
 */
function UserPhotos(props) {
  const { photos, onAddComment } = useUserPhotos(
    props.match.params.userId,
    props.refreshToken,
  );

  return <UserPhotosView photos={photos} onAddComment={onAddComment} />;
}

export default withRouter(UserPhotos);
