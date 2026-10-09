import React from "react";
import { withRouter } from "react-router-dom";

import useUserPhotos from "../../client/controllers/useUserPhotos.js";
import UserPhotosView from "../../client/views/UserPhotosView.jsx";

import "./styles.css";

/**
 * Define UserPhotos, a React component of CS142 Project 8.
 *
 * Thin controller: fetches the routed user's photos (and provides the comment
 * action) and hands them to the presentational view. When advanced features are
 * enabled it also derives the currently selected photo from the optional
 * `photoId` route param and exposes prev/next navigation that pushes the
 * neighbouring id into the URL.
 */
function UserPhotos(props) {
  const { userId, photoId } = props.match.params;
  const advanced = props.advancedFeatures;

  const { photos, onAddComment } = useUserPhotos(userId, props.refreshToken);

  // Which photo the stepper is on. Falls back to the first photo when no (or an
  // unknown, e.g. deleted) id is in the URL. -1 means there is nothing to show.
  let currentIndex = -1;
  if (photos && photos.length > 0) {
    currentIndex = photos.findIndex((photo) => photo._id === photoId);
    if (currentIndex < 0) {
      currentIndex = 0;
    }
  }

  const goToIndex = (index) => {
    if (index >= 0 && index < photos.length) {
      props.history.push(`/photos/${userId}/${photos[index]._id}`);
    }
  };

  return (
    <UserPhotosView
      advancedFeatures={advanced}
      photos={photos}
      currentIndex={currentIndex}
      onAddComment={onAddComment}
      onPrev={() => goToIndex(currentIndex - 1)}
      onNext={() => goToIndex(currentIndex + 1)}
    />
  );
}

export default withRouter(UserPhotos);
