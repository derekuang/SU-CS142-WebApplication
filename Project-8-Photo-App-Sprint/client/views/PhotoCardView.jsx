import React from "react";
import { MentionsInput, Mention } from "react-mentions";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import humanize from "../utils/humanize.js";
import renderCommentHtml from "../utils/mentions.js";

/**
 * One photo's card: the media area, the date chip, the like and favorite
 * controls, the owner's delete action, and the comment form and list.
 *
 * Both photo layouts render this module. The layout supplies `media` (the image
 * or the tagging stage, plus anything that belongs directly under it) and any
 * `extraActions` (the stepper's tagging control), so a difference between the
 * layouts is a prop at the call site rather than a second copy of the chrome.
 *
 * The card performs no data fetching. `actions` carries the controller's
 * mutations; `onRequestDeletePhoto` and `onRequestDeleteComment` ask the parent
 * view to open its confirmation dialog.
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

function PhotoCardView({
  photo,
  viewerId,
  actions,
  mentionSuggestions,
  onRequestDeletePhoto,
  onRequestDeleteComment,
  media,
  extraActions,
  sx,
}) {
  return (
    <Card sx={sx}>
      {media}
      <CardContent variant="body2">
        <Chip
          label={humanize(photo.date_time)}
          color="primary"
          variant="outlined"
        />
        <LikeButton photo={photo} onToggleLike={actions.onToggleLike} />
        <FavoriteButton photo={photo} onFavorite={actions.onFavorite} />
        {extraActions}
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
          onSubmit={actions.onAddComment}
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
  );
}

export default PhotoCardView;
