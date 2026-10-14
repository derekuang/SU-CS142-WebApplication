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
 * Presentational confirmation dialog for destructive actions.
 *
 * Owns only the layout: the caller supplies the copy and the outcome handlers.
 * `busy` disables both buttons while the request is in flight, and `error` is
 * shown inline, so a failed action keeps the dialog open with the server's
 * message instead of silently closing. Every "are you sure?" flow (deleting a
 * photo or comment, deleting the account) goes through this one component so
 * they stay visually and behaviourally identical.
 */
function ConfirmDialogView({
  open,
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialogView;
