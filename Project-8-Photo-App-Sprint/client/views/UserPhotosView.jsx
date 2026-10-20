import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  CardMedia,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";

import ConfirmDialogView from "./ConfirmDialogView.jsx";
import PhotoCardView from "./PhotoCardView.jsx";
import TaggedPhotoView from "./TaggedPhotoView.jsx";

/**
 * Presentational views for a user's photos: the original grid and the
 * single-photo stepper.
 *
 * Both layouts render `PhotoCardView`; a layout supplies the media area and any
 * per-layout action (the stepper's tagging control), so the card chrome is
 * defined once. The delete confirmation dialog is shared by photo, comment, and
 * tag deletes and stays here, above both layouts.
 */

/** Prev/next controls for the single-photo viewer. */
function PhotoStepper({ index, total, onPrev, onNext }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      justifyContent="center"
      sx={{ mt: 2, mb: 1 }}
    >
      <Button
        variant="outlined"
        onClick={onPrev}
        disabled={index <= 0}
      >
        Previous
      </Button>
      <Button
        variant="outlined"
        onClick={onNext}
        disabled={index >= total - 1}
      >
        Next
      </Button>
    </Stack>
  );
}

/** The original view: every photo laid out in a responsive grid. */
function PhotoGridView({
  photos,
  viewerId,
  actions,
  mentionSuggestions,
  onRequestDeletePhoto,
  onRequestDeleteComment,
}) {
  return (
    <Grid container spacing={2} sx={{ height: "100%", overflowY: "auto" }}>
      {photos.map((photo) => {
        const media = (
          <CardMedia
            component="img"
            alt={photo.file_name}
            src={`images/${photo.file_name}`}
            sx={{ height: { xs: 200, md: 280 } }}
          />
        );
        return (
          <Grid xs={12} sm={6} md={4} key={photo._id}>
            <PhotoCardView
              photo={photo}
              viewerId={viewerId}
              actions={actions}
              mentionSuggestions={mentionSuggestions}
              onRequestDeletePhoto={onRequestDeletePhoto}
              onRequestDeleteComment={onRequestDeleteComment}
              media={media}
              sx={{ height: { xs: 300, md: 400 }, overflowY: "auto" }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}

/** Advanced view: one photo at a time with prev/next stepper controls. */
function PhotoStepperView({
  photos,
  currentIndex,
  viewerId,
  actions,
  mentionSuggestions,
  onRequestDeletePhoto,
  onRequestDeleteComment,
  onRequestDeleteTag,
  onPrev,
  onNext,
}) {
  const [tagMode, setTagMode] = React.useState(false);
  const [pendingRect, setPendingRect] = React.useState(null);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [tagError, setTagError] = React.useState("");
  const [savingTag, setSavingTag] = React.useState(false);

  // The hook already loads every registered user for @mentions; the tag
  // autocomplete uses the same { id, display } list rather than fetching it
  // again.
  const userOptions = mentionSuggestions || [];

  const clearTagSelection = () => {
    setPendingRect(null);
    setSelectedUser(null);
    setTagError("");
  };

  const toggleTagMode = () => {
    if (tagMode) {
      setTagMode(false);
      clearTagSelection();
      return;
    }
    setTagMode(true);
    setTagError("");
  };

  const handleSelectRect = (rect) => {
    if (rect) {
      setPendingRect(rect);
      setSelectedUser(null);
      setTagError("");
      return;
    }
    // The drag was deliberate but too small; keep no selection and explain.
    setPendingRect(null);
    setSelectedUser(null);
    setTagError("Drag a larger area.");
  };

  if (photos.length === 0) {
    return <Typography color="text.secondary">No photos yet</Typography>;
  }

  const photo = photos[currentIndex];

  const handleSaveTag = () => {
    if (!pendingRect || !selectedUser) {
      return;
    }
    setSavingTag(true);
    setTagError("");
    actions
      .onAddTag(photo._id, {
        userId: selectedUser.id,
        ...pendingRect,
      })
      .then(() => {
        setSavingTag(false);
        setPendingRect(null);
        setSelectedUser(null);
      })
      .catch((message) => {
        setSavingTag(false);
        setTagError(message || "Unable to add tag. Please try again.");
      });
  };

  // The tagging stage and its controls sit directly under the photo, so they
  // travel in the card's media slot rather than as extra chrome.
  const media = (
    <React.Fragment>
      <TaggedPhotoView
        photo={photo}
        tagMode={tagMode}
        busy={savingTag}
        pendingRect={pendingRect}
        onSelectRect={handleSelectRect}
        onRequestDeleteTag={(tag) => onRequestDeleteTag(photo._id, tag)}
      />
      {tagMode ? (
        <Box sx={{ mt: 2 }}>
          {pendingRect ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Autocomplete
                size="small"
                options={userOptions}
                value={selectedUser}
                getOptionLabel={(option) => option.display || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(event, value) => setSelectedUser(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tag this person"
                    size="small"
                  />
                )}
                sx={{ flexGrow: 1, minWidth: { sm: 240 } }}
              />
              <Button
                variant="contained"
                onClick={handleSaveTag}
                disabled={!selectedUser || savingTag}
              >
                {savingTag ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={clearTagSelection}
                disabled={savingTag}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Drag on the photo to select a face.
            </Typography>
          )}
          {tagError ? (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {tagError}
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </React.Fragment>
  );

  const tagButton = (
    <Button
      size="small"
      variant={tagMode ? "contained" : "outlined"}
      sx={{ ml: 1 }}
      onClick={toggleTagMode}
      disabled={savingTag}
    >
      {tagMode ? "Done" : "Tag people"}
    </Button>
  );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <PhotoCardView
        photo={photo}
        viewerId={viewerId}
        actions={actions}
        mentionSuggestions={mentionSuggestions}
        onRequestDeletePhoto={onRequestDeletePhoto}
        onRequestDeleteComment={onRequestDeleteComment}
        media={media}
        extraActions={tagButton}
        sx={{ p: 2 }}
      />
      <PhotoStepper
        index={currentIndex}
        total={photos.length}
        onPrev={onPrev}
        onNext={onNext}
      />
    </Box>
  );
}

function UserPhotosView({
  advancedFeatures,
  photos,
  currentIndex,
  viewerId,
  actions,
  mentionSuggestions,
  onPrev,
  onNext,
}) {
  // The delete confirmation dialog is shared by the photo, comment, and tag
  // buttons; `pending` records which one is being confirmed.
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const requestDeletePhoto = (photoId) => {
    setError("");
    setBusy(false);
    setPending({ kind: "photo", photoId });
  };

  const requestDeleteComment = (photoId, commentId) => {
    setError("");
    setBusy(false);
    setPending({ kind: "comment", photoId, commentId });
  };

  const requestDeleteTag = (photoId, tag) => {
    setError("");
    setBusy(false);
    setPending({
      kind: "tag",
      photoId,
      tagId: tag._id,
      tagName:
        tag.user && tag.user.first_name
          ? `${tag.user.first_name} ${tag.user.last_name}`
          : "this person",
    });
  };

  const cancelDelete = () => {
    setPending(null);
    setError("");
    setBusy(false);
  };

  const confirmDelete = () => {
    if (!pending) {
      return;
    }
    setBusy(true);
    setError("");

    const action =
      pending.kind === "photo"
        ? actions.onDeletePhoto(pending.photoId)
        : pending.kind === "comment"
          ? actions.onDeleteComment(pending.photoId, pending.commentId)
          : actions.onDeleteTag(pending.photoId, pending.tagId);

    action
      .then(() => {
        setPending(null);
        setBusy(false);
      })
      .catch((message) => {
        setBusy(false);
        setError(message || "Unable to delete. Please try again.");
      });
  };

  if (!photos) {
    return <Box>Loading...</Box>;
  }

  const isPhotoDelete = Boolean(pending) && pending.kind === "photo";
  const isTagDelete = Boolean(pending) && pending.kind === "tag";

  const dialog = (
    <ConfirmDialogView
      open={Boolean(pending)}
      title={
        isTagDelete
          ? "Remove tag?"
          : isPhotoDelete
            ? "Delete photo?"
            : "Delete comment?"
      }
      message={
        isTagDelete
          ? `Remove the tag of ${pending.tagName} from this photo?`
          : isPhotoDelete
            ? "This photo and all of its comments will be permanently deleted."
            : "This comment will be permanently deleted."
      }
      confirmLabel={isTagDelete ? "Remove" : "Delete"}
      busy={busy}
      error={error}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
  );

  if (advancedFeatures) {
    return (
      <React.Fragment>
        <PhotoStepperView
          key={photos[currentIndex] ? photos[currentIndex]._id : "empty"}
          photos={photos}
          currentIndex={currentIndex}
          viewerId={viewerId}
          actions={actions}
          mentionSuggestions={mentionSuggestions}
          onRequestDeletePhoto={requestDeletePhoto}
          onRequestDeleteComment={requestDeleteComment}
          onRequestDeleteTag={requestDeleteTag}
          onPrev={onPrev}
          onNext={onNext}
        />
        {dialog}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <PhotoGridView
        photos={photos}
        viewerId={viewerId}
        actions={actions}
        mentionSuggestions={mentionSuggestions}
        onRequestDeletePhoto={requestDeletePhoto}
        onRequestDeleteComment={requestDeleteComment}
      />
      {dialog}
    </React.Fragment>
  );
}

export default UserPhotosView;
