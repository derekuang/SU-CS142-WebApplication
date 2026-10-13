import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";

/**
 * Presentational "final warning" dialog for deleting the account.
 *
 * Spells out that the action also removes the user's photos and comments (on
 * their own and on other people's photos) and cannot be undone. All state and
 * interactions are provided by the caller (useDeleteAccount).
 */
function DeleteAccountDialogView({ open, busy, error, onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete your account?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete your account, all of your photos, and all
          of your comments — including comments on other people&apos;s photos.
          This cannot be undone.
        </DialogContentText>
        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
        >
          Delete my account
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteAccountDialogView;
