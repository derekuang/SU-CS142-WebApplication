import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import "./styles.css";
import fetchModel from "../../lib/fetchModelData";

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
 * Define UserPhotos, a React component of CS142 Project 5.
 */
class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    const userId = props.match.params.userId;
    const promise1 = fetchModel(`/user/${userId}`);
    const promise2 = fetchModel(`/photosOfUser/${userId}`);
    Promise.all([promise1, promise2]).then((values) => {
      const user = values[0].data;
      const photos = values[1].data;
      this.setState({ photos });
      this.props.changeContent(
        "Photos of ",
        `${user.first_name} ${user.last_name}`,
      );
    });
  }

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

export default UserPhotos;
