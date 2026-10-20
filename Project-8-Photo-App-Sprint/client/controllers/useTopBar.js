import { useCallback, useEffect, useState } from "react";

import getSchemaInfo from "../model/api/testApi.js";

/**
 * Controller for the top app bar.
 *
 * Owns the fetched schema version and the transient snackbar message. `pathname`
 * is the current route, used to decide whether the logged in `user` is on their
 * own photo page (the only place the Add Photo button appears).
 *
 * The upload flow itself lives in useUploadPhoto; this hook exposes `notify` so
 * that flow can report its outcome through the same snackbar. Returns
 * `version`, `message`, `severity`, `showAddPhoto`, `notify`, and
 * `onCloseMessage`.
 */
function useTopBar(pathname, user) {
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

  const notify = useCallback((text, level) => {
    setMessage(text);
    setSeverity(level);
  }, []);

  const onCloseMessage = useCallback(() => {
    setMessage("");
  }, []);

  return {
    version,
    message,
    severity,
    showAddPhoto,
    notify,
    onCloseMessage,
  };
}

export default useTopBar;
