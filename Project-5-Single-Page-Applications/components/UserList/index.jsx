import React from "react";
import { Link } from "react-router-dom";
import { Divider, List, ListItem, ListItemText } from "@mui/material";

import "./styles.css";

/**
 * Define UserList, a React component of CS142 Project 5.
 */
class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: window.cs142models.userListModel(),
    };
  }

  render() {
    return (
      <div>
        <List component="nav">
          {this.state.users.map((user) => {
            return (
              <Link to={`/users/${user._id}`} key={user._id}>
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
