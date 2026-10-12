import React from "react";
import { MentionsInput, Mention } from "react-mentions";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";

import humanize from "../utils/humanize.js";
import renderCommentHtml from "../utils/mentions.js";

/**
 * Presentational view for a user's photos and their comments.
 *
 * Renders only what it is given: `photos` (or a loading placeholder), an
 * `onAddComment(photoId, text)` handler that performs the actual request, and
 * the `mentionSuggestions` the comment box offers when @mentioning. It performs
 * no data fetching itself.
 *
 * `advancedFeatures` selects the layout: off is the original grid of every
 * photo, on is a single-photo viewer with prev/next stepper controls.
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

function commentList(comments) {
  return (
    <List dense>
      {comments.map((comment) => {
        return (
          <React.Fragment key={comment._id}>
            <ListItem>
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
function PhotoGridView({ photos, onAddComment, mentionSuggestions }) {
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
                <CommentForm
                  photoId={photo._id}
                  suggestions={mentionSuggestions}
                  onSubmit={onAddComment}
                />
                {photo.comments && photo.comments.length > 0 ? (
                  commentList(photo.comments)
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
  onAddComment,
  mentionSuggestions,
  onPrev,
  onNext,
}) {
  if (photos.length === 0) {
    return <Typography color="text.secondary">No photos yet</Typography>;
  }

  const photo = photos[currentIndex];

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
        <CardMedia
          component="img"
          alt={photo.file_name}
          src={`images/${photo.file_name}`}
          sx={{
            width: "100%",
            maxHeight: { xs: 300, md: 500 },
            objectFit: "contain",
          }}
        />
        <CardContent variant="body2">
          <Chip
            label={humanize(photo.date_time)}
            color="primary"
            variant="outlined"
          />
          <CommentForm
            photoId={photo._id}
            suggestions={mentionSuggestions}
            onSubmit={onAddComment}
          />
          {photo.comments && photo.comments.length > 0 ? (
            commentList(photo.comments)
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
  onAddComment,
  mentionSuggestions,
  onPrev,
  onNext,
}) {
  if (!photos) {
    return <Box>Loading...</Box>;
  }

  if (advancedFeatures) {
    return (
      <PhotoStepperView
        photos={photos}
        currentIndex={currentIndex}
        onAddComment={onAddComment}
        mentionSuggestions={mentionSuggestions}
        onPrev={onPrev}
        onNext={onNext}
      />
    );
  }

  return (
    <PhotoGridView
      photos={photos}
      onAddComment={onAddComment}
      mentionSuggestions={mentionSuggestions}
    />
  );
}

export default UserPhotosView;
