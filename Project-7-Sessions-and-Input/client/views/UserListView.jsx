import React from "react";
import {
  Box,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

/**
 * Presentational view for the user list.
 *
 * Renders only what it is given: `users` (or a loading placeholder while it is
 * still undefined). It performs no data fetching.
 */
function UserListView({ users }) {
  if (!users) {
    return <Box>Loading...</Box>;
  }

  return (
    <div>
      <List component="nav">
        {users.map((user) => {
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

export default UserListView;
