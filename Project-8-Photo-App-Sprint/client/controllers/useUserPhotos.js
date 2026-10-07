import { useCallback, useEffect, useState } from "react";

import { getPhotosOfUser, addComment } from "../model/api/photoApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for a user's photos view.
 *
 * Fetches the photos for `userId`, refetching when the id changes or when
 * `refreshToken` changes (so an upload elsewhere refreshes the view). Also
 * exposes `onAddComment(photoId, text)`, which submits a comment, reloads on
 * success, and rejects with a displayable message on failure.
 */
function useUserPhotos(userId, refreshToken) {
  const [photos, setPhotos] = useState();

  const reload = useCallback(() => {
    getPhotosOfUser(userId).then(setPhotos);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload, refreshToken]);

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

  return { photos, onAddComment };
}

export default useUserPhotos;
