import React from "react";
import {
  Box,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import axios from "axios";

import "./styles.css";

/**
 * Define UserList, a React component of CS142 Project 5.
 */
class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    axios.get("/user/list").then((response) => {
      this.setState({ users: response.data });
    });
  }

  render() {
    const users = this.state.users;

    if (!users) {
      return <Box>Loading...</Box>;
    }

    return (
      <div>
        <List component="nav">
          {this.state.users.map((user) => {
            return (
              <Link href={`#/users/${user._id}`} key={user._id}>
                <ListItem>
                  <ListItemText
                    primary={`${user.first_name} ${user.last_name}`}
                  />
                </ListItem>
                <Divider />
              </Link>
            );
          })}
        </List>
      </div>
    );
  }
}

export default UserList;
