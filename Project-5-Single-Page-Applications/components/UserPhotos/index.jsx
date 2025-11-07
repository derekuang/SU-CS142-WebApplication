import React from "react";
import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Link,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import "./styles.css";

function humanize(dateTime) {
  dayjs.extend(relativeTime);
  return dayjs().to(dayjs(dateTime));
}

/**
 * Define UserPhotos, a React component of CS142 Project 5.
 */
class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = { userId: props.match.params.userId };
  }

  componentDidMount() {
    this.changeContent(this.state.userId);
  }

  componentDidUpdate() {
    const userId = this.props.match.params.userId;
    if (userId !== this.state.userId) {
      this.setState({ userId: userId });
      this.changeContent(userId);
    }
  }

  changeContent = (userId) => {
    const user = window.cs142models.userModel(userId);
    this.props.changeContent(
      "Photos of ",
      `${user.first_name} ${user.last_name}`,
    );
  };

  render() {
    const photos = window.cs142models.photoOfUserModel(this.state.userId);
    return (
      <ImageList variant="masonry" cols={2} gap={8}>
        {photos.map((photo) => {
          return (
            <>
              <ImageListItem key={photo._id}>
                <img
                  src={`images/${photo.file_name}`}
                  alt={photo.file_name}
                  loading="lazy"
                />
                <ImageListItemBar
                  position="bottom"
                  subtitle={humanize(photo.date_time)}
                />
              </ImageListItem>
              <Box padding={"8px 16px"}>
                {photo.comments &&
                  photo.comments.map((comment) => (
                    <Typography key={comment._id} variant="body2" gutterBottom>
                      <Link href={`#/users/${comment.user._id}`}>
                        {`${comment.user.first_name} ${comment.user.last_name}`}
                      </Link>
                      {`(${humanize(comment.date_time)}): ${comment.comment}`}
                    </Typography>
                  ))}
              </Box>
            </>
          );
        })}
      </ImageList>
    );
  }
}

export default UserPhotos;
