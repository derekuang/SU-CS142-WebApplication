import { useCallback, useEffect, useState } from "react";

import {
  getPhotosOfUser,
  addComment,
  deletePhoto,
  deleteComment,
  likePhoto,
  unlikePhoto,
  favoritePhoto,
} from "../model/api/photoApi.js";
import { listUsers } from "../model/api/userApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * The optimistic change for one photo: flip the viewer's like flag and move the
 * count accordingly. The count is clamped at zero so a stale flag can never
 * render a negative number; applying this twice with opposite `liked` values
 * undoes it.
 *
 * @param {object} photo A photo as held in state.
 * @param {boolean} liked Whether the viewer should now be a liker.
 * @returns {{likedByViewer: boolean, likeCount: number}}
 */
function optimisticLike(photo, liked) {
  return {
    likedByViewer: liked,
    likeCount: Math.max(0, (photo.likeCount || 0) + (liked ? 1 : -1)),
  };
}

/**
 * Replace one photo in the list with an updated copy, leaving the others
 * untouched. Used for the optimistic like update, for reconciling with the
 * server's count, and for rolling back a failed request.
 *
 * @param {Array<object>|undefined} photos The current list.
 * @param {string} photoId The photo to update.
 * @param {function(object): object} update Produces the patch to merge.
 * @returns {Array<object>} The updated list.
 */
function replacePhoto(photos, photoId, update) {
  return (photos || []).map((photo) => {
    if (photo._id !== photoId) {
      return photo;
    }
    return { ...photo, ...update(photo) };
  });
}

/**
 * Controller for a user's photos view.
 *
 * Fetches the photos for `userId`, refetching when the id changes or when
 * `refreshToken` changes (so an upload elsewhere refreshes the view). Also
 * exposes the mutating actions - `onAddComment`, `onDeletePhoto`,
 * `onDeleteComment`, `onToggleLike`, `onFavorite` - each of which submits,
 * reloads on success, and rejects with a displayable message on failure.
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

  const onToggleLike = useCallback((photoId, liked) => {
    // Optimistically flip the button and count so the click feels instant, then
    // reconcile with the server's authoritative numbers. Unlike the other
    // actions this deliberately does NOT reload the list: the story only
    // requires the like-sorted order to be correct on the next load, and
    // reloading here would yank the photo the user just liked to the top.
    const optimistic = (photo) => optimisticLike(photo, liked);

    setPhotos((current) => {
      return replacePhoto(current, photoId, optimistic);
    });

    const request = liked ? likePhoto(photoId) : unlikePhoto(photoId);
    return request
      .then(({ likeCount, likedByViewer }) => {
        setPhotos((current) => {
          return replacePhoto(current, photoId, () => ({ likeCount, likedByViewer }));
        });
      })
      .catch((err) => {
        // Put the photo back the way it was so the button shows reality again.
        setPhotos((current) => {
          return replacePhoto(current, photoId, (photo) => optimisticLike(photo, !liked));
        });
        return Promise.reject(
          getErrorMessage(err, "Unable to update like. Please try again."),
        );
      });
  }, []);

  const onFavorite = useCallback((photoId) => {
    // One-way, like the story's disabled button: flip the star on immediately
    // so the click feels instant, then reconcile with the server. No reload -
    // the photos view does not display favorites order.
    setPhotos((current) => {
      return replacePhoto(current, photoId, () => ({
        favoritedByViewer: true,
      }));
    });

    return favoritePhoto(photoId)
      .then(({ favoritedByViewer }) => {
        setPhotos((current) => {
          return replacePhoto(current, photoId, () => ({ favoritedByViewer }));
        });
      })
      .catch((err) => {
        // Put the star back the way it was so the button shows reality again.
        setPhotos((current) => {
          return replacePhoto(current, photoId, () => ({
            favoritedByViewer: false,
          }));
        });
        return Promise.reject(
          getErrorMessage(err, "Unable to add favorite. Please try again."),
        );
      });
  }, []);

  return {
    photos,
    onAddComment,
    onDeletePhoto,
    onDeleteComment,
    onToggleLike,
    onFavorite,
    mentionSuggestions,
  };
}

export default useUserPhotos;
