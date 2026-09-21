import React from "react";
import { withRouter } from "react-router-dom";
import { Button, Stack, Divider, Link, Typography, Box } from "@mui/material";
import axios from "axios";

import "./styles.css";

/**
 * Define UserDetail, a React component of CS142 Project 5.
 */
class UserDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    const userId = props.match.params.userId;
    axios.get(`/user/${userId}`).then((response) => {
      this.setState({ user: response.data });
    });
  }

  componentDidUpdate() {
    const userId = this.props.match.params.userId;
    if (userId === this.state?.user._id) {
      return;
    }
    axios.get(`/user/${userId}`).then((response) => {
      this.setState({ user: response.data });
    });
  }

  render() {
    const { user } = this.state;

    if (!user) {
      return <Box>Loading...</Box>;
    }

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
        <Typography variant="body1">
          {/* eslint-disable-next-line react/no-danger */}
          Quote: <span dangerouslySetInnerHTML={{ __html: user.description }} />
        </Typography>
        <Button variant="outlined">
          <Link href={`#/photos/${user._id}`}>Photos</Link>
        </Button>
      </Stack>
    );
  }
}

export default withRouter(UserDetail);
