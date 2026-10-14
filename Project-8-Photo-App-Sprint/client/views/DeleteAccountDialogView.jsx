import React from "react";

import ConfirmDialogView from "./ConfirmDialogView.jsx";

/**
 * Presentational "final warning" dialog for deleting the account.
 *
 * Owns the account-specific copy: it spells out that the action also removes
 * the user's photos and comments (on their own and on other people's photos)
 * and cannot be undone. The layout is the shared ConfirmDialogView, and all
 * state and interactions are provided by the caller (useDeleteAccount).
 */
function DeleteAccountDialogView({ open, busy, error, onConfirm, onCancel }) {
  return (
    <ConfirmDialogView
      open={open}
      title="Delete your account?"
      message="This will permanently delete your account, all of your photos, and all of your comments — including comments on other people's photos. This cannot be undone."
      confirmLabel="Delete my account"
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteAccountDialogView;
