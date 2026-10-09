import { useCallback, useEffect, useState } from "react";

import getSchemaInfo from "../model/api/testApi.js";
import { uploadPhoto } from "../model/api/photoApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for the top app bar.
 *
 * Owns the fetched schema version, the transient upload message, and the Add
 * Photo interaction. `pathname` is the current route, used to decide whether
 * the logged in `user` is on their own photo page (the only place the Add Photo
 * button appears). After a successful upload it calls `onPhotoAdded` so the
 * photos view can refresh.
 *
 * Returns everything TopBarView renders: `version`, `message`, `severity`,
 * `showAddPhoto`, `onFileSelected`, and `onCloseMessage`.
 */
function useTopBar(pathname, user, onPhotoAdded) {
  const [version, setVersion] = useState();
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState();

  useEffect(() => {
    getSchemaInfo().then((info) => {
      setVersion(info.__v);
    });
  }, []);

  // The Add Photo button only makes sense on the logged in user's own photo
  // page, i.e. when the route is /photos/:userId (optionally with a specific
  // photo id) and userId is that user.
  const match = pathname.match(/^\/photos\/([^/]+)(?:\/[^/]+)?$/);
  const showAddPhoto = Boolean(user && match && match[1] === user._id);

  const onFileSelected = useCallback(
    (event) => {
      const file = event.target.files[0];
      // Reset the input so picking the same file again still fires onChange.
      event.target.value = "";

      if (!file) {
        return;
      }

      uploadPhoto(file)
        .then(() => {
          setMessage("Photo added.");
          setSeverity("success");
          if (onPhotoAdded) {
            onPhotoAdded();
          }
        })
        .catch((err) => {
          setMessage(
            getErrorMessage(err, "Unable to add photo. Please try again."),
          );
          setSeverity("error");
        });
    },
    [onPhotoAdded],
  );

  const onCloseMessage = useCallback(() => {
    setMessage("");
  }, []);

  return {
    version,
    message,
    severity,
    showAddPhoto,
    onFileSelected,
    onCloseMessage,
  };
}

export default useTopBar;
