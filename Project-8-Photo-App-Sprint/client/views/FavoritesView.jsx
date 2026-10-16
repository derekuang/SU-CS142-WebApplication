import React from "react";
import { Box, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Grid from "@mui/material/Unstable_Grid2";

import PhotoModalView from "./PhotoModalView.jsx";

/**
 * Presentational view for the logged in user's favorites.
 *
 * Renders only what it is given: `favorites` (the list, or undefined while the
 * first load is in flight), an `error` message when a load/removal failed, and
 * `onRemove(photoId)`. It performs no data fetching.
 *
 * Each entry is a small thumbnail (clicking it opens a modal with a larger
 * image and the photo's date), with an "x" overlaid on the thumbnail's top
 * right for removal and the owner's name linking to their profile below. The
 * open modal is local, ephemeral UI state.
 */

/**
 * One favorited photo: the thumbnail opens the modal, the overlaid "x" removes
 * it, and the owner's name links back to the owner's profile. The owner may be
 * null if that account was removed, in which case plain text is shown.
 */
function FavoriteItem({ photo, owner, onOpen, onRemove }) {
  return (
    <Stack spacing={1} alignItems="center">
      <Box sx={{ position: "relative", lineHeight: 0 }}>
        <Box
          component="button"
          type="button"
          onClick={onOpen}
          sx={{
            p: 0,
            border: "none",
            bgcolor: "transparent",
            cursor: "pointer",
            lineHeight: 0,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <Box
            component="img"
            alt={photo.file_name}
            src={`images/${photo.file_name}`}
            sx={{
              width: 160,
              height: 160,
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
        <Tooltip title="Remove from favorites">
          <IconButton
            size="small"
            aria-label="Remove from favorites"
            onClick={onRemove}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.75)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {owner ? (
        <Link
          href={`#/users/${owner._id}`}
          color="inherit"
          underline="hover"
          sx={{ fontWeight: "bold" }}
        >
          {`${owner.first_name} ${owner.last_name}`}
        </Link>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Unknown user
        </Typography>
      )}
    </Stack>
  );
}

function FavoritesView({ favorites, error, onRemove }) {
  const [selected, setSelected] = React.useState(null);

  const remove = (photoId) => {
    // Close the modal if the photo being removed is the one on display.
    if (selected && selected._id === photoId) {
      setSelected(null);
    }
    onRemove(photoId).catch(() => {});
  };

  if (!favorites) {
    return <Box>Loading...</Box>;
  }

  return (
    <Stack spacing={2} sx={{ height: "100%", overflowY: "auto" }}>
      <Typography variant="h4">Favorites</Typography>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      {favorites.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No favorites yet
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {favorites.map((photo) => (
            <Grid xs={12} sm={6} md={4} key={photo._id}>
              <FavoriteItem
                photo={photo}
                owner={photo.owner}
                onOpen={() => setSelected(photo)}
                onRemove={() => remove(photo._id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <PhotoModalView photo={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}

export default FavoritesView;
