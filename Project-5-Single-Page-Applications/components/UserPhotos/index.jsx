import React from "react";
import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Link,
  Typography,
} from "@mui/material";

import "./styles.css";

/**
 * Define UserPhotos, a React component of CS142 Project 5.
 */
class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = { userId: this.props.match.params.userId };
  }

  componentDidUpdate() {
    if (this.props.match.params.userId !== this.state.userId) {
      this.setState({ userId: this.props.match.params.userId });
    }
  }

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
                  subtitle={`Date: ${photo.date_time}`}
                />
              </ImageListItem>
              <Box padding={"8px 16px"}>
                {photo.comments &&
                  photo.comments.map((comment) => (
                    <Typography key={comment._id} variant="body2" gutterBottom>
                      <Link href={`#/users/${comment.user._id}`}>
                        {`${comment.user.first_name} ${comment.user.last_name}`}
                      </Link>
                      {`(${comment.date_time}): ${comment.comment}`}
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
