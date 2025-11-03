import React from "react";
import { withRouter, Link } from "react-router-dom";
import { Divider, List, ListItem, ListItemText } from "@mui/material";

import "./styles.css";

/**
 * Define UserList, a React component of CS142 Project 5.
 */
class UserList extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);
    this.state = {
      users: window.cs142models.userListModel(),
    };
  }

  render() {
    const { match } = this.props;

    return (
      <div>
        <List component="nav">
          {this.state.users.map((user) => {
            return (
              <Link to={`${match.url}${user._id}`} key={user._id}>
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

export default withRouter(UserList);
