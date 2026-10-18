import React from "react";
import {
  Box,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

import humanize from "../utils/humanize.js";
import activityLabel from "../utils/activityLabels.js";

/**
 * Presentational view for the sidebar user list.
 *
 * Renders only what it is given: `entries` (one per user, already sorted by the
 * server), the logged in `currentUser` (so their row can be shown separately),
 * and an `error` message when the latest poll failed. It performs no data
 * fetching.
 *
 * The actor's name and any photo thumbnail are links; the row itself is not a
 * link so anchors are never nested.
 */

const ACTIVITY_ICONS = {
  USER_REGISTER: PersonAddIcon,
  USER_LOGIN: LoginIcon,
  USER_LOGOUT: LogoutIcon,
};

function userName(user) {
  return `${user.first_name} ${user.last_name}`;
}

/**
 * A photo activity's thumbnail, linking to that photo in its owner's view.
 */
function PhotoThumb({ photo }) {
  return (
    <Link
      href={`#/photos/${photo.user_id}/${photo._id}`}
      underline="none"
      sx={{ mr: 2, flexShrink: 0 }}
    >
      <Box
        component="img"
        alt={photo.file_name}
        src={`images/${photo.file_name}`}
        sx={{
          width: 40,
          height: 40,
          objectFit: "cover",
          borderRadius: 1,
          display: "block",
        }}
      />
    </Link>
  );
}

/**
 * The fixed-size slot used by activities that have no photo: registration,
 * login, and logout. An unknown type still gets the empty slot so names align.
 */
function ActivityIcon({ type }) {
  const Icon = ACTIVITY_ICONS[type];

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        mr: 2,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    >
      {Icon ? <Icon fontSize="small" /> : null}
    </Box>
  );
}

/**
 * One user's latest activity, or "No recent activity" when the viewer cannot
 * see anything they did.
 */
function ActivityRow({ entry }) {
  const { user, activity } = entry;

  const primary = (
    <Box>
      <Link
        href={`#/users/${user._id}`}
        color="inherit"
        underline="hover"
        sx={{ fontWeight: "bold" }}
      >
        {userName(user)}
      </Link>
      {activity ? ` ${activityLabel(activity.type)}` : ""}
    </Box>
  );

  return (
    <ListItem>
      {activity && activity.photo ? (
        <PhotoThumb photo={activity.photo} />
      ) : (
        <ActivityIcon type={activity ? activity.type : null} />
      )}
      <ListItemText
        primary={primary}
        secondary={activity ? humanize(activity.date_time) : "No recent activity"}
      />
    </ListItem>
  );
}

/**
 * A titled group of rows ("You" or "Friends").
 */
function ActivitySection({ title, entries }) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ px: 2, pt: 1 }}
      >
        {title}
      </Typography>
      <List component="nav" dense>
        {entries.map((entry) => {
          return (
            <React.Fragment key={entry.user._id}>
              <ActivityRow entry={entry} />
              <Divider />
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
}

function UserListView({ entries, currentUser, error }) {
  if (!entries) {
    return (
      <Box>
        <Box>Loading...</Box>
        {error ? (
          <Typography variant="body2" color="error" sx={{ px: 2, py: 1 }}>
            {error}
          </Typography>
        ) : null}
      </Box>
    );
  }

  if (entries.length === 0) {
    return <Box>No users</Box>;
  }

  const currentEntry = currentUser
    ? entries.find(
        (entry) => String(entry.user._id) === String(currentUser._id),
      )
    : undefined;
  const friends = entries.filter((entry) => {
    return (
      !currentEntry ||
      String(entry.user._id) !== String(currentEntry.user._id)
    );
  });

  return (
    <div>
      {currentEntry ? (
        <ActivitySection title="You" entries={[currentEntry]} />
      ) : null}
      <ActivitySection title="Friends" entries={friends} />
      {friends.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
          No other users
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="body2" color="error" sx={{ px: 2, py: 1 }}>
          {error}
        </Typography>
      ) : null}
    </div>
  );
}

export default UserListView;
