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
import fetchModel from "../../lib/fetchModelData";

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
    this.state = {};

    const userId = props.match.params.userId;
    const promise1 = fetchModel(`/user/${userId}`);
    const promise2 = fetchModel(`/photosOfUser/${userId}`);
    Promise.all([promise1, promise2]).then((values) => {
      this.setState({ user: values[0].data, photos: values[1].data });
    });
  }

  componentDidUpdate() {
    const userId = this.props.match.params.userId;
    if (userId === this.state.user?._id) {
      return;
    }
    const user = this.state.user;
    this.props.changeContent(
      "Photos of ",
      `${user.first_name} ${user.last_name}`,
    );
  }

  render() {
    const photos = this.state.photos;

    if (!photos) {
      return <Box></Box>;
    }

    return (
      <ImageList variant="masonry" cols={1} gap={8}>
        {photos.map((photo) => {
          return (
            <Box key={photo._id}>
              <ImageListItem>
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
            </Box>
          );
        })}
      </ImageList>
    );
  }
}

export default UserPhotos;
