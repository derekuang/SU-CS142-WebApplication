import React from "react";
import { withRouter } from "react-router-dom";
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
import axios from "axios";

import "./styles.css";

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
 * Define CommentForm, the Material UI comment box rendered under each photo
 * so a logged in user can add a comment.
 */
function CommentForm({ photoId, onCommentAdded }) {
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

    axios
      .post(`/commentsOfPhoto/${photoId}`, { comment: trimmed })
      .then(() => {
        setComment("");
        setError("");
        onCommentAdded();
      })
      .catch((err) => {
        setError(
          (err.response && err.response.data) ||
            "Unable to add comment. Please try again.",
        );
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

/**
 * Define UserPhotos, a React component of CS142 Project 5.
 */
class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.userId = props.match.params.userId;
    this.init(this.userId);
  }

  async init(userId) {
    const photos = (await axios.get(`/photosOfUser/${userId}`)).data;
    this.setState({ photos });
  }

  componentDidUpdate(prevProps) {
    // Reload when the parent signals that a new photo was added elsewhere
    // (e.g. via the Add Photo button in the TopBar).
    if (prevProps.refreshToken !== this.props.refreshToken) {
      this.init(this.userId);
    }
  }

  handleCommentAdded = () => {
    // Reload the photos so the newly added comment is reflected.
    this.init(this.userId);
  };

  render() {
    const photos = this.state.photos;

    if (!photos) {
      return <Box>Loading...</Box>;
    }

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
                    onCommentAdded={this.handleCommentAdded}
                  />
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
}

export default withRouter(UserPhotos);
