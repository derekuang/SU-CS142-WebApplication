import { useCallback, useState } from "react";

import { deleteAccount } from "../model/api/sessionApi.js";
import getErrorMessage from "../model/api/errors.js";

/**
 * Controller for the "delete my account" flow.
 *
 * Deleting an account is destructive and irreversible, so it is gated behind a
 * confirmation dialog. On success `onDeleted` is called (the shell returns to
 * the login screen); a failure keeps the dialog open and shows the server's
 * message. Returns the dialog's state and handlers so the view stays purely
 * presentational.
 */
function useDeleteAccount(onDeleted) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onRequest = useCallback(() => {
    setError("");
    setBusy(false);
    setOpen(true);
  }, []);

  const onCancel = useCallback(() => {
    setOpen(false);
    setError("");
    setBusy(false);
  }, []);

  const onConfirm = useCallback(() => {
    setBusy(true);
    setError("");

    deleteAccount()
      .then(() => {
        setOpen(false);
        setBusy(false);
        if (onDeleted) {
          onDeleted();
        }
      })
      .catch((err) => {
        setBusy(false);
        setError(
          getErrorMessage(
            err,
            "Unable to delete your account. Please try again.",
          ),
        );
      });
  }, [onDeleted]);

  return { open, busy, error, onRequest, onCancel, onConfirm };
}

export default useDeleteAccount;
