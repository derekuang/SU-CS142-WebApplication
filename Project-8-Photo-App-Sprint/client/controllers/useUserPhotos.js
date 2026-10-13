import { useCallback, useEffect, useState } from "react";

import {
  getPhotosOfUser,
  addComment,
  deletePhoto,
  deleteComment,
} from "../model/api/photoApi.js";
import { listUsers } from "../model/api/userApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for a user's photos view.
 *
 * Fetches the photos for `userId`, refetching when the id changes or when
 * `refreshToken` changes (so an upload elsewhere refreshes the view). Also
 * exposes the mutating actions - `onAddComment`, `onDeletePhoto`,
 * `onDeleteComment` - each of which submits, reloads on success, and rejects
 * with a displayable message on failure.
 *
 * Loads the user list once to provide the @mention autocomplete suggestions.
 */
function useUserPhotos(userId, refreshToken) {
  const [photos, setPhotos] = useState();
  const [mentionSuggestions, setMentionSuggestions] = useState([]);

  const reload = useCallback(() => {
    return getPhotosOfUser(userId).then(setPhotos);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload, refreshToken]);

  useEffect(() => {
    listUsers().then((users) => {
      setMentionSuggestions(
        users.map((user) => ({
          id: user._id,
          display: `${user.first_name} ${user.last_name}`,
        })),
      );
    });
  }, []);

  const onAddComment = useCallback(
    (photoId, text) => {
      return addComment(photoId, text)
        .then(() => {
          reload();
        })
        .catch((err) => {
          return Promise.reject(
            getErrorMessage(err, "Unable to add comment. Please try again."),
          );
        });
    },
    [reload],
  );

  const onDeletePhoto = useCallback(
    (photoId) => {
      return deletePhoto(photoId)
        .then(() => reload())
        .catch((err) => {
          return Promise.reject(
            getErrorMessage(err, "Unable to delete photo. Please try again."),
          );
        });
    },
    [reload],
  );

  const onDeleteComment = useCallback(
    (photoId, commentId) => {
      return deleteComment(photoId, commentId)
        .then(() => reload())
        .catch((err) => {
          return Promise.reject(
            getErrorMessage(err, "Unable to delete comment. Please try again."),
          );
        });
    },
    [reload],
  );

  return {
    photos,
    onAddComment,
    onDeletePhoto,
    onDeleteComment,
    mentionSuggestions,
  };
}

export default useUserPhotos;
