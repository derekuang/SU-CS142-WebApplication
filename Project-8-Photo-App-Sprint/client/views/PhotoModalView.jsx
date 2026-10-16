import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Modal from "react-modal";

import humanize from "../utils/humanize.js";

/**
 * Presentational modal that shows one favorited photo at a larger size, with a
 * caption containing the photo's date, and a close button. Built on
 * `react-modal` (the story's suggested library) rather than MUI's Dialog, so
 * the styling is supplied through react-modal's `style` prop.
 *
 * Owns no data: `photo` is the entry to show (null/undefined keeps it closed)
 * and `onClose` is called for the close button, the overlay, and Escape.
 * `Modal.setAppElement` is called once in the app entry (photoShare.jsx).
 */

/**
 * react-modal renders outside the MUI theme, so its container is styled here:
 * a dimmed overlay and a centred, scrollable box. The z-index clears the AppBar
 * (1100) and MUI dialogs (1300).
 */
const modalStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 1400,
  },
  content: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    border: "none",
    borderRadius: 8,
    padding: 16,
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto",
  },
};

function PhotoModalView({ photo, onClose }) {
  return (
    <Modal
      isOpen={Boolean(photo)}
      onRequestClose={onClose}
      style={modalStyles}
      contentLabel="Favorited photo"
    >
      {photo ? (
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ position: "absolute", top: 0, right: 0 }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            alt={photo.file_name}
            src={`images/${photo.file_name}`}
            sx={{
              display: "block",
              mx: "auto",
              maxWidth: "80vw",
              maxHeight: "70vh",
              objectFit: "contain",
            }}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            {humanize(photo.date_time)}
          </Typography>
        </Box>
      ) : null}
    </Modal>
  );
}

export default PhotoModalView;
