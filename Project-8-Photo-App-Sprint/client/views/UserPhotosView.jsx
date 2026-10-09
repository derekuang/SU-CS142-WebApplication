import React from "react";
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
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

/**
 * Presentational view for a user's photos and their comments.
 *
 * Renders only what it is given: `photos` (or a loading placeholder) and an
 * `onAddComment(photoId, text)` handler that performs the actual request. It
 * performs no data fetching itself.
 *
 * `advancedFeatures` selects the layout: off is the original grid of every
 * photo, on is a single-photo viewer with prev/next stepper controls.
 */

function humanize(dateTime) {
  dayjs.extend(relativeTime);
  return dayjs().to(dayjs(dateTime));
}

function commonList(comments) {
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
                        __html: comment.comment,
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
 */
function CommentForm({ photoId, onSubmit }) {
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState("");

  const handleChange = (event) => {
    setComment(event.target.value);
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
        <TextField
          name="comment"
          label="Add a comment"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          maxRows={4}
          value={comment}
          onChange={handleChange}
        />
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
function PhotoGridView({ photos, onAddComment }) {
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
                <CommentForm photoId={photo._id} onSubmit={onAddComment} />
                {photo.comments && photo.comments.length > 0 ? (
                  commonList(photo.comments)
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
function PhotoStepperView({ photos, currentIndex, onAddComment, onPrev, onNext }) {
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
          <CommentForm photoId={photo._id} onSubmit={onAddComment} />
          {photo.comments && photo.comments.length > 0 ? (
            commonList(photo.comments)
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
        onPrev={onPrev}
        onNext={onNext}
      />
    );
  }

  return <PhotoGridView photos={photos} onAddComment={onAddComment} />;
}

export default UserPhotosView;
