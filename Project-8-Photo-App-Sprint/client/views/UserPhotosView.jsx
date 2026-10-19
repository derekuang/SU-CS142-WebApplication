import React from "react";
import { MentionsInput, Mention } from "react-mentions";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";

import humanize from "../utils/humanize.js";
import renderCommentHtml from "../utils/mentions.js";
import ConfirmDialogView from "./ConfirmDialogView.jsx";
import TaggedPhotoView from "./TaggedPhotoView.jsx";

/**
 * Presentational view for a user's photos, their comments, and their tags.
 *
 * Renders only what it is given: `photos` (or a loading placeholder), an
 * `onAddComment(photoId, text)` handler that performs the actual request, an
 * `onAddTag(photoId, tag)` handler for the stepper's tagging mode, and the
 * `mentionSuggestions` the comment box offers when @mentioning. It performs
 * no data fetching itself.
 *
 * `advancedFeatures` selects the layout: off is the original grid of every
 * photo, on is a single-photo viewer with prev/next stepper controls. Tagging
 * is deliberately exposed only in the stepper (the optional advanced view);
 * the grid is unchanged.
 */

/**
 * react-mentions needs an explicit style object because it is not an MUI
 * component. This mirrors the outlined TextField the comment box used to be.
 */
const mentionsStyle = {
  control: {
    backgroundColor: "#fff",
    fontSize: "0.95rem",
  },
  "&multiLine": {
    control: {
      fontFamily: "inherit",
      border: "1px solid rgba(0, 0, 0, 0.23)",
      borderRadius: "4px",
    },
    highlighter: {
      padding: "8px 12px",
      border: "1px solid transparent",
      minHeight: "42px",
    },
    input: {
      padding: "8px 12px",
      border: "1px solid transparent",
      minHeight: "42px",
      outline: "none",
    },
  },
  suggestions: {
    list: {
      backgroundColor: "#fff",
      border: "1px solid rgba(0, 0, 0, 0.15)",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
      fontSize: "0.85rem",
      maxHeight: "180px",
      overflowY: "auto",
    },
    item: {
      padding: "6px 12px",
      "&focused": {
        backgroundColor: "rgba(25, 118, 210, 0.12)",
      },
    },
  },
};

/**
 * The like button shown on every photo: a filled thumb in the primary color
 * once the viewer has liked the photo, an outlined thumb otherwise, next to the
 * like count. It owns only its in-flight state, so a double click cannot fire
 * two requests; the optimistic update itself lives in the controller.
 */
function LikeButton({ photo, onToggleLike }) {
  const [busy, setBusy] = React.useState(false);
  const liked = Boolean(photo.likedByViewer);
  const count = photo.likeCount || 0;

  const handleClick = () => {
    setBusy(true);
    onToggleLike(photo._id, !liked)
      // A failed like is already rolled back by the controller (the button and
      // count visibly snap back), so there is no separate error to show here.
      .catch(() => {})
      .then(() => setBusy(false));
  };

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", ml: 1 }}
    >
      <Tooltip title={liked ? "Unlike this photo" : "Like this photo"}>
        {/* The Tooltip needs a child that can hold a ref and still receive
            pointer events while the button is disabled. */}
        <span>
          <IconButton
            size="small"
            color={liked ? "primary" : "default"}
            aria-label={liked ? "Unlike this photo" : "Like this photo"}
            aria-pressed={liked}
            disabled={busy}
            onClick={handleClick}
          >
            {liked ? (
              <ThumbUpIcon fontSize="small" />
            ) : (
              <ThumbUpOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="body2" color="text.secondary">
        {count}
      </Typography>
    </Box>
  );
}

/**
 * The favorite button shown on every photo: an outlined star that adds the
 * photo to the viewer's favorites, and a filled star (disabled) once it is
 * favorited - the story's "button disabled + clear indicator" rule. Removing a
 * favorite happens only on the favorites page, so this button is deliberately
 * one-way. It owns only its in-flight state, so a double click cannot fire two
 * requests; the optimistic update itself lives in the controller.
 */
function FavoriteButton({ photo, onFavorite }) {
  const [busy, setBusy] = React.useState(false);
  const favorited = Boolean(photo.favoritedByViewer);

  const handleClick = () => {
    if (favorited) {
      return;
    }
    setBusy(true);
    onFavorite(photo._id)
      // A failed favorite is already rolled back by the controller (the star
      // visibly snaps back), so there is no separate error to show here.
      .catch(() => {})
      .then(() => setBusy(false));
  };

  const label = favorited ? "Already in your favorites" : "Add to favorites";

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", ml: 1 }}
    >
      <Tooltip title={label}>
        {/* The Tooltip needs a child that can hold a ref and still receive
            pointer events while the button is disabled. */}
        <span>
          <IconButton
            size="small"
            color={favorited ? "secondary" : "default"}
            aria-label={label}
            aria-pressed={favorited}
            disabled={favorited || busy}
            onClick={handleClick}
          >
            {favorited ? (
              <StarIcon fontSize="small" />
            ) : (
              <StarBorderIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

function commentList(comments, photoId, viewerId, onRequestDeleteComment) {
  return (
    <List dense>
      {comments.map((comment) => {
        return (
          <React.Fragment key={comment._id}>
            <ListItem
              secondaryAction={
                comment.user && comment.user._id === viewerId ? (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onRequestDeleteComment(photoId, comment._id)}
                  >
                    Delete
                  </Button>
                ) : null
              }
            >
              <ListItemText
                primary={
                  // eslint-disable-next-line react/jsx-wrap-multilines
                  <Box>
                    <Link
                      href={`#/users/${comment.user._id}`}
                      color="inherit"
                      underline="hover"
                      sx={{ fontWeight: "bold" }}
                    >
                      {`${comment.user.first_name} ${comment.user.last_name}`}
                    </Link>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {humanize(comment.date_time)}
                    </Typography>
                  </Box>
                }
                secondary={
                  // eslint-disable-next-line react/jsx-wrap-multilines
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ mt: 1 }}
                  >
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: renderCommentHtml(
                          comment.comment,
                          comment.mentions,
                        ),
                      }}
                    />
                  </Typography>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        );
      })}
    </List>
  );
}

/**
 * Comment box rendered under each photo. It owns only its local input/error
 * state; the actual submission is delegated to `onSubmit`, which resolves on
 * success and rejects with a displayable message on failure.
 *
 * The input is a react-mentions `MentionsInput` so typing `@` offers the
 * `suggestions` (already `{ id, display }` shaped). Selecting one inserts the
 * `@[display](id)` markup into the value, which is what the server receives and
 * parses for mentions.
 */
function CommentForm({ photoId, suggestions, onSubmit }) {
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState("");

  const handleChange = (event, newValue) => {
    setComment(newValue);
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) {
      setError("Comment cannot be empty.");
      return;
    }

    onSubmit(photoId, trimmed)
      .then(() => {
        setComment("");
        setError("");
      })
      .catch((message) => {
        setError(message || "Unable to add comment. Please try again.");
      });
  };

  const canSubmit = Boolean(comment.trim());

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ flexGrow: 1 }}>
          <MentionsInput
            value={comment}
            onChange={handleChange}
            style={mentionsStyle}
            placeholder="Add a comment (use @ to mention someone)"
            a11ySuggestionsListLabel="Suggested users to mention"
            allowSuggestionsAboveCursor
          >
            <Mention
              trigger="@"
              data={suggestions}
              appendSpaceOnAdd
              displayTransform={(id, display) => `@${display}`}
              renderSuggestion={(suggestion, search, highlightedDisplay) => (
                <div>{highlightedDisplay}</div>
              )}
            />
          </MentionsInput>
        </Box>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!canSubmit}
          sx={{ mt: 0.5 }}
        >
          Post
        </Button>
      </Stack>
      {error ? (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}

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
  onAddComment,
  onRequestDeletePhoto,
  onRequestDeleteComment,
  onToggleLike,
  onFavorite,
  mentionSuggestions,
}) {
  return (
    <Grid container spacing={2} sx={{ height: "100%", overflowY: "auto" }}>
      {photos.map((photo) => {
        return (
          <Grid xs={12} sm={6} md={4} key={photo._id}>
            <Card sx={{ height: { xs: 300, md: 400 }, overflowY: "auto" }}>
              <CardMedia
                component="img"
                alt={photo.file_name}
                src={`images/${photo.file_name}`}
                sx={{ height: { xs: 200, md: 280 } }}
              />
              <CardContent variant="body2">
                <Chip
                  label={humanize(photo.date_time)}
                  color="primary"
                  variant="outlined"
                />
                <LikeButton photo={photo} onToggleLike={onToggleLike} />
                <FavoriteButton photo={photo} onFavorite={onFavorite} />
                {photo.user_id === viewerId ? (
                  <Button
                    size="small"
                    color="error"
                    sx={{ ml: 1 }}
                    onClick={() => onRequestDeletePhoto(photo._id)}
                  >
                    Delete photo
                  </Button>
                ) : null}
                <CommentForm
                  photoId={photo._id}
                  suggestions={mentionSuggestions}
                  onSubmit={onAddComment}
                />
                {photo.comments && photo.comments.length > 0 ? (
                  commentList(
                    photo.comments,
                    photo._id,
                    viewerId,
                    onRequestDeleteComment,
                  )
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    No comments yet
                  </Typography>
                )}
              </CardContent>
            </Card>
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
  onAddComment,
  onRequestDeletePhoto,
  onRequestDeleteComment,
  onAddTag,
  onRequestDeleteTag,
  onToggleLike,
  onFavorite,
  mentionSuggestions,
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
    onAddTag(photo._id, {
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

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <Card sx={{ p: 2 }}>
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
        <CardContent variant="body2">
          <Chip
            label={humanize(photo.date_time)}
            color="primary"
            variant="outlined"
          />
          <LikeButton photo={photo} onToggleLike={onToggleLike} />
          <FavoriteButton photo={photo} onFavorite={onFavorite} />
          <Button
            size="small"
            variant={tagMode ? "contained" : "outlined"}
            sx={{ ml: 1 }}
            onClick={toggleTagMode}
            disabled={savingTag}
          >
            {tagMode ? "Done" : "Tag people"}
          </Button>
          {photo.user_id === viewerId ? (
            <Button
              size="small"
              color="error"
              sx={{ ml: 1 }}
              onClick={() => onRequestDeletePhoto(photo._id)}
            >
              Delete photo
            </Button>
          ) : null}
          <CommentForm
            photoId={photo._id}
            suggestions={mentionSuggestions}
            onSubmit={onAddComment}
          />
          {photo.comments && photo.comments.length > 0 ? (
            commentList(
              photo.comments,
              photo._id,
              viewerId,
              onRequestDeleteComment,
            )
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No comments yet
            </Typography>
          )}
        </CardContent>
      </Card>
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
  onAddComment,
  onDeletePhoto,
  onDeleteComment,
  onAddTag,
  onDeleteTag,
  onToggleLike,
  onFavorite,
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
        ? onDeletePhoto(pending.photoId)
        : pending.kind === "comment"
          ? onDeleteComment(pending.photoId, pending.commentId)
          : onDeleteTag(pending.photoId, pending.tagId);

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
          onAddComment={onAddComment}
          onRequestDeletePhoto={requestDeletePhoto}
          onRequestDeleteComment={requestDeleteComment}
          onAddTag={onAddTag}
          onRequestDeleteTag={requestDeleteTag}
          onToggleLike={onToggleLike}
          onFavorite={onFavorite}
          mentionSuggestions={mentionSuggestions}
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
        onAddComment={onAddComment}
        onRequestDeletePhoto={requestDeletePhoto}
        onRequestDeleteComment={requestDeleteComment}
        onToggleLike={onToggleLike}
        onFavorite={onFavorite}
        mentionSuggestions={mentionSuggestions}
      />
      {dialog}
    </React.Fragment>
  );
}

export default UserPhotosView;
