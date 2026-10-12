import { useCallback, useEffect, useState } from "react";

import { uploadPhoto } from "../model/api/photoApi.js";
import { listUsers } from "../model/api/userApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for the Add Photo flow.
 *
 * Selecting a file opens a dialog that lets the uploader optionally restrict who
 * can see the photo. The dialog has three outcomes, matching the photo's
 * visibility model:
 *   - restriction off               -> public (no share list)
 *   - restriction on, none chosen   -> owner only (empty share list)
 *   - restriction on, users chosen  -> owner plus the chosen users
 *
 * `onUploaded` is called after a successful upload so the photos view can
 * refresh, and `onMessage(text, severity)` reports the outcome in the top bar
 * snackbar. Returns the dialog's state and handlers so the view stays purely
 * presentational.
 */
function useUploadPhoto({ onUploaded, onMessage }) {
  const [file, setFile] = useState(null);
  const [restricted, setRestricted] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");

  const onFileSelected = useCallback((event) => {
    const chosen = event.target.files[0];
    // Reset the input so picking the same file again still fires onChange.
    event.target.value = "";

    if (!chosen) {
      return;
    }

    setFile(chosen);
    setRestricted(false);
    setSelectedIds([]);
    setError("");
  }, []);

  // Load the candidate users the first time the dialog is opened.
  useEffect(() => {
    if (file && options.length === 0) {
      listUsers().then((users) => {
        setOptions(
          users.map((user) => ({
            id: user._id,
            label: `${user.first_name} ${user.last_name}`,
          })),
        );
      });
    }
  }, [file, options.length]);

  const onToggleRestricted = useCallback(() => {
    setRestricted((current) => !current);
  }, []);

  const onChangeSelected = useCallback((ids) => {
    setSelectedIds(ids);
  }, []);

  const onClose = useCallback(() => {
    setFile(null);
    setError("");
  }, []);

  const onConfirm = useCallback(() => {
    if (!file) {
      return;
    }

    const sharedWith = restricted ? selectedIds : undefined;

    uploadPhoto(file, sharedWith)
      .then(() => {
        setFile(null);
        setError("");
        if (onMessage) {
          onMessage("Photo added.", "success");
        }
        if (onUploaded) {
          onUploaded();
        }
      })
      .catch((err) => {
        setError(
          getErrorMessage(err, "Unable to add photo. Please try again."),
        );
      });
  }, [file, restricted, selectedIds, onMessage, onUploaded]);

  return {
    open: Boolean(file),
    fileName: file ? file.name : "",
    restricted,
    selectedIds,
    options,
    error,
    onFileSelected,
    onToggleRestricted,
    onChangeSelected,
    onConfirm,
    onClose,
  };
}

export default useUploadPhoto;
