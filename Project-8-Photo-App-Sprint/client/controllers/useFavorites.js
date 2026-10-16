import { useCallback, useEffect, useState } from "react";

import { getFavorites, unfavoritePhoto } from "../model/api/photoApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for the favorites page.
 *
 * Fetches the logged in user's favorites on mount (`favorites` is undefined
 * while the first load is in flight) and exposes `onRemove(photoId)`, which
 * takes a photo off the list. Removal is optimistic: the row disappears
 * immediately and, on failure, the authoritative list is refetched and the
 * request rejects with a displayable message.
 *
 * @returns {{favorites: Array<object>|undefined, error: string,
 *   onRemove: function(string): Promise<void>}}
 */
function useFavorites() {
  const [favorites, setFavorites] = useState();
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    return getFavorites()
      .then((list) => {
        setFavorites(list);
        setError("");
      })
      .catch((err) => {
        setError(
          getErrorMessage(err, "Unable to load favorites. Please try again."),
        );
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onRemove = useCallback(
    (photoId) => {
      setFavorites((current) => {
        return (current || []).filter((photo) => photo._id !== photoId);
      });

      return unfavoritePhoto(photoId).catch((err) => {
        // Put the list back the way the server sees it.
        reload();
        return Promise.reject(
          getErrorMessage(err, "Unable to remove favorite. Please try again."),
        );
      });
    },
    [reload],
  );

  return { favorites, error, onRemove };
}

export default useFavorites;
