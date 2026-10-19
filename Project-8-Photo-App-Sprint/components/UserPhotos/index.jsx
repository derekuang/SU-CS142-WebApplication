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
 * `photoId` route param and exposes prev/next navigation that replaces the
 * neighbouring id in the URL (so stepping does not pile up history entries).
 */
function UserPhotos(props) {
  const { userId, photoId } = props.match.params;
  const advanced = props.advancedFeatures;
  const viewerId = props.currentUser ? props.currentUser._id : null;

  const {
    photos,
    onAddComment,
    onDeletePhoto,
    onDeleteComment,
    onAddTag,
    onDeleteTag,
    onToggleLike,
    onFavorite,
    mentionSuggestions,
  } = useUserPhotos(userId, props.refreshToken);

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
      props.history.replace(`/photos/${userId}/${photos[index]._id}`);
    }
  };

  // After a delete the reload replaces the list, so point the URL at the photo
  // that takes the deleted one's place (clamped to the new last photo) rather
  // than letting the "unknown id" fallback jump back to the first photo.
  const handleDeletePhoto = (deletedPhotoId) => {
    const remaining = (photos || []).filter(
      (photo) => photo._id !== deletedPhotoId,
    );
    const deletedIndex = (photos || []).findIndex(
      (photo) => photo._id === deletedPhotoId,
    );

    return onDeletePhoto(deletedPhotoId).then(() => {
      if (!advanced || remaining.length === 0) {
        return;
      }
      const nextIndex = Math.min(
        deletedIndex < 0 ? 0 : deletedIndex,
        remaining.length - 1,
      );
      props.history.replace(`/photos/${userId}/${remaining[nextIndex]._id}`);
    });
  };

  return (
    <UserPhotosView
      advancedFeatures={advanced}
      photos={photos}
      currentIndex={currentIndex}
      viewerId={viewerId}
      onAddComment={onAddComment}
      onDeletePhoto={handleDeletePhoto}
      onDeleteComment={onDeleteComment}
      onAddTag={onAddTag}
      onDeleteTag={onDeleteTag}
      onToggleLike={onToggleLike}
      onFavorite={onFavorite}
      mentionSuggestions={mentionSuggestions}
      onPrev={() => goToIndex(currentIndex - 1)}
      onNext={() => goToIndex(currentIndex + 1)}
    />
  );
}

export default withRouter(UserPhotos);
