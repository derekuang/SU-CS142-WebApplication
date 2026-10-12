import React from "react";
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";

/**
 * Human-readable explanation of the current visibility choice.
 *
 * @param {boolean} restricted Whether the uploader chose to limit visibility.
 * @param {boolean} hasSelection Whether any users are selected.
 * @returns {string}
 */
function visibilityHelp(restricted, hasSelection) {
  if (!restricted) {
    return "Anyone can see this photo.";
  }
  if (!hasSelection) {
    return "Only you can see this photo.";
  }
  return "Only you and the selected users can see this photo.";
}

/**
 * Presentational dialog for the Add Photo flow.
 *
 * Shows the selected file and an optional "limit who can see this photo"
 * control. `options` is the candidate user list ([{ id, label }]). The helper
 * text spells out the three visibility outcomes: off is public, on with nothing
 * selected is owner only, and on with users selected is owner plus those users.
 * All state and interactions are provided by the caller (useUploadPhoto).
 */
function UploadPhotoDialogView({
  open,
  fileName,
  restricted,
  selectedIds,
  options,
  error,
  onToggleRestricted,
  onChangeSelected,
  onConfirm,
  onClose,
}) {
  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Photo</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{fileName}</DialogContentText>
        <FormControlLabel
          control={
            <Checkbox checked={restricted} onChange={onToggleRestricted} />
          }
          label="Limit who can see this photo"
        />
        {restricted ? (
          <Autocomplete
            multiple
            options={options}
            value={selectedOptions}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, values) => onChangeSelected(values.map((value) => value.id))}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Share with"
                placeholder="Select users"
                sx={{ mt: 1 }}
              />
            )}
          />
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {visibilityHelp(restricted, selectedIds.length > 0)}
        </Typography>
        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UploadPhotoDialogView;
