import React from "react";
import { Button, Stack, Divider, Link, Typography } from "@mui/material";

import "./styles.css";

/**
 * Define UserDetail, a React component of CS142 Project 5.
 */
class UserDetail extends React.Component {
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
    this.props.changeContent("", `${user.first_name} ${user.last_name}`);
  };

  render() {
    const user = window.cs142models.userModel(this.state.userId);

    return (
      <Stack
        divider={<Divider sx={{ width: "90%" }} />}
        alignItems="center"
        spacing={2}
      >
        <Typography variant="h3">
          {`${user.first_name} ${user.last_name}`}
        </Typography>
        <Typography variant="h5">Occupation: {user.occupation}</Typography>
        <Typography variant="h5">Location: {user.location}</Typography>
        {/* <Typography variant="body1">{user.description}</Typography>*/}
        <Typography variant="body1">
          Quote: <span dangerouslySetInnerHTML={{ __html: user.description }} />
        </Typography>
        <Button variant="outlined">
          <Link href={`#/photos/${user._id}`}>Photos</Link>
        </Button>
      </Stack>
    );
  }
}

export default UserDetail;
